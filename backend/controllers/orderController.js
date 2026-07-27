const crypto = require('crypto');
const { prisma } = require('../config/database');
const { generateInvoiceNo } = require('../utils/invoiceGenerator');
const { ACTIVE_ITEMS_FILTER } = require('../utils/activeItemsFilter');
const { notifications } = require('../utils/notificationService');
const { checkAndAlertLowStock } = require('../utils/lowStockAlert');
const { withRetry } = require('../utils/dbRetry');
const { resolveUsdRate, toINR, resolveUnitPrice } = require('../utils/orderCurrency');
const { evaluateCoupon } = require('../utils/couponPricing');
const { calculateLogistics, convertShippingToOrderCurrency, qualifiesForFreeShipping } = require('../utils/logistics');
const { isVisibleInRegion } = require('../utils/regionVisibility');

/** Round a money value to 2 decimals, avoiding float artefacts (e.g. 115.19999). */
const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

// Create new order
const createOrder = async (req, res) => {
    try {
        const userId = req.userId; // user ID from auth middleware
        const {
            shippingAddress,
            paymentMethod,
            paymentId, // from payment gateway (e.g., Stripe, Razorpay)
            // Razorpay signature payload. When present, signature verification
            // happens inline here so the client can replace its prior two-step
            // (verify → createOrder) flow with a single round trip.
            razorpayOrderId = null,
            razorpaySignature = null,
            shippingCost = 0,
            tax = 0,
            discount = 0,
            couponCode = null,
            currency = 'INR',
        } = req.body;

        // 1. Validate Input
        if (!shippingAddress || !paymentMethod) {
            return res.status(400).json({
                success: false,
                error: 'Shipping address and payment method are required'
            });
        }

        // 2. Parallel pre-flight: cart, user, bag type, and payment settings
        // (when Razorpay verification is required). These reads are independent
        // of each other, so running them concurrently removes ~3 sequential
        // round trips from the critical path on Vercel.
        //
        // generateInvoiceNo is intentionally NOT included here — it mutates the
        // invoice-sequence counter, so we only call it after all validation
        // passes (otherwise a rejected request would burn an invoice number).
        // Any non-COD order MUST carry a verifiable payment. This used to be
        // opt-in (`razorpayOrderId && razorpaySignature && paymentId`), which meant
        // POSTing an order with no payment fields skipped verification entirely and
        // still got written `paymentStatus: 'PAID'` below.
        const isPrepaid = paymentMethod !== 'COD';
        const needsRazorpayVerification = isPrepaid;
        if (isPrepaid && !(razorpayOrderId && razorpaySignature && paymentId)) {
            return res.status(400).json({
                success: false,
                error: 'Payment verification failed - missing payment details'
            });
        }

        const [cart, user, paymentSettings, existingOrderForPayment] = await Promise.all([
            prisma.cart.findFirst({ where: { userId }, include: { items: true } }),
            prisma.user.findUnique({ where: { id: userId } }),
            needsRazorpayVerification
                // keyId is needed as well: the amount reconciliation below fetches the
                // Razorpay order to confirm the customer actually paid this cart's total.
                ? prisma.paymentSettings.findFirst({ select: { razorpayKeyId: true, razorpayKeySecret: true } })
                : Promise.resolve(null),
            // Idempotency guard: a gateway payment id can only ever produce one
            // order. If the client retries after a network failure (response
            // lost but the first attempt committed), return the existing order
            // instead of charging stock/settlements twice.
            paymentId
                ? prisma.order.findFirst({
                    where: { paymentId, customerId: userId },
                    include: { items: ACTIVE_ITEMS_FILTER },
                })
                : Promise.resolve(null),
        ]);

        if (existingOrderForPayment) {
            return res.status(200).json({
                success: true,
                message: 'Order already placed for this payment',
                data: existingOrderForPayment,
                duplicate: true,
            });
        }

        // Verify Razorpay signature inline (server-side check is mandatory —
        // we never trust a payment id that has not been HMAC-verified).
        if (needsRazorpayVerification) {
            if (!paymentSettings || !paymentSettings.razorpayKeySecret) {
                return res.status(500).json({
                    success: false,
                    error: 'Payment verification failed - configuration error'
                });
            }
            const expectedSignature = crypto
                .createHmac('sha256', paymentSettings.razorpayKeySecret)
                .update(`${razorpayOrderId}|${paymentId}`)
                .digest('hex');
            if (expectedSignature !== razorpaySignature) {
                return res.status(400).json({
                    success: false,
                    error: 'Payment verification failed - invalid signature'
                });
            }
        }

        if (!cart || cart.items.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Cart is empty'
            });
        }

        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        // 3. Validate Stock and Calculate Totals
        // Resolve the FX rate up front: every money field written below needs an INR
        // twin, and those must all share one rate for the order to be internally
        // consistent. Snapshotting also stops admin rate edits rewriting this order.
        const orderExchangeRate = currency === 'USD' ? await resolveUsdRate(prisma) : null;
        let subtotal = 0;
        // Customer GST accumulated per line below. The client also sends a `tax`,
        // but it is advisory only — this server-side figure is what gets stored.
        let computedTax = 0;
        // Shipping accumulated per line from each product's logisticsConfig, in INR
        // (the per-kg rates are entered in rupees). Converted to the order currency
        // once the goods subtotal is known.
        let computedShippingInr = 0;
        const orderItemsData = [];
        const stockUpdates = [];
        const vendorTotals = {}; // Tracks vendor amounts using their base prices


        // Fetch all products in parallel — sequential awaits add latency that
        // pushes the downstream transaction past its 5s default on cold starts.
        // Invoice-no generation runs alongside the product fetches because it
        // is independent of cart contents (saves one more round trip).
        const [productsForItems, invoiceNo] = await Promise.all([
            Promise.all(
                cart.items.map((item) =>
                    prisma.product.findUnique({
                        where: { id: item.productId },
                        include: {
                            vendor: true,
                            variants: item.variantId ? { where: { id: item.variantId } } : false,
                            images: { where: { isPrimary: true }, take: 1 }
                        }
                    })
                )
            ),
            generateInvoiceNo(prisma),
        ]);

        for (let i = 0; i < cart.items.length; i++) {
            const item = cart.items[i];
            const product = productsForItems[i];

            if (!product) {
                return res.status(404).json({
                    success: false,
                    error: `Product not found for item ID: ${item.id}`
                });
            }

            if (!product.inStock) {
                return res.status(400).json({
                    success: false,
                    error: `Product is out of stock: ${product.name}`
                });
            }

            const variant = item.variantId && product.variants?.length > 0 ? product.variants[0] : null;

            // Check stock
            const checkStock = variant ? variant.stock : product.totalStock;
            if (product.trackInventory && checkStock < item.quantity) {
                return res.status(400).json({
                    success: false,
                    error: `Insufficient stock for product: ${product.name}`
                });
            }

            // Region gate — the last line of defence. A cart built on .in can't be
            // checked out on .com (and vice-versa): the item may have been added
            // before a visibility change, or the region switched mid-session. Uses
            // the order currency (INR=.in, USD=.com).
            const skuVisibility = variant ? variant.priceVisibility : product.priceVisibility;
            if (!isVisibleInRegion(skuVisibility, currency)) {
                return res.status(400).json({
                    success: false,
                    error: `"${product.name}" is not available in your region. Please remove it to continue.`
                });
            }

            // Price the line in the order's currency. Shared with the storefront's
            // getRegionalPrice() chain — see resolveUnitPrice() for why a USD order
            // must convert from INR rather than fall through to an INR field.
            const unitPrice = resolveUnitPrice(variant || product, currency, orderExchangeRate);
            // Round per line as well: the invoice prints each item's totalPrice,
            // so the printed item lines must sum to the printed subtotal.
            const itemTotal = round2(unitPrice * item.quantity);
            subtotal += itemTotal;

            // Customer GST, recomputed from the product's own rate against the SAME
            // base the customer is charged (itemTotal). Never trust the client's
            // figure: this lands on a document titled "TAX INVOICE" and feeds every
            // revenue report, so a posted `tax: 0` would understate a legal filing.
            // Rounded per line so the printed lines reconcile with the printed total.
            // A product saved without a GST rate is charged 0% — and the same null
            // also zeroes the VENDOR's tax below, which is a payout shortfall, not
            // just a reporting gap. Log it so the catalogue gap is visible and can be
            // backfilled; hard-failing here would reject legitimate existing rows at
            // the checkout step, which is the worst possible place to surface it.
            if (product.gstPercentage == null) {
                console.warn(
                    `[createOrder] Product ${product.id} (${product.name}) has no gstPercentage — ` +
                    `charging 0% GST to the customer and paying 0 tax to the vendor.`
                );
            }
            const customerGstRate = product.gstPercentage || 0;
            const itemTax = round2(itemTotal * customerGstRate / 100);
            computedTax += itemTax;

            // Shipping for this line, from the product's own logistics config.
            // Same calculator the storefront uses (utils/logistics.js is a port of
            // lib/logistics.ts) so the quoted figure and the charged figure agree.
            //
            // AIR and SHIP have different per-kg rates and delivery windows, so when a
            // product offers both the customer must have picked one in the cart — we
            // will not silently choose on their behalf and bill them for it.
            const allowedTransports = Array.isArray(product.logisticsConfig?.transportTypes)
                ? product.logisticsConfig.transportTypes
                : [];
            if (allowedTransports.length > 1 && !item.transportType) {
                return res.status(400).json({
                    success: false,
                    error: `Please choose a shipping method for "${product.name}" before placing the order.`,
                });
            }
            if (item.transportType && !allowedTransports.includes(item.transportType)) {
                return res.status(400).json({
                    success: false,
                    error: `The selected shipping method is not available for "${product.name}".`,
                });
            }
            // Resolved mode: the explicit choice, else the only option, else none.
            const lineTransport = item.transportType || allowedTransports[0] || null;

            computedShippingInr += calculateLogistics(
                product.logisticsConfig, item.quantity, lineTransport || undefined
            ).totalShippingCost;

            // Calculate Vendor Settlement using vendor's base price.
            //
            // M2C buys from the vendor and resells, so the vendor makes a taxable
            // supply TO M2C and must be paid GST on their own goods value. The GST
            // rate is fixed by the product's HSN code, so it is the same rate the
            // customer pays — only the base differs (vendor's basePrice, not the
            // admin selling price). Unregistered vendors (no GSTIN) charge no tax.
            const vendorPrice = product.basePrice || 0;
            const vendorItemTotal = vendorPrice * item.quantity;
            const vendorGstRate = product.vendor?.gstNumber ? (product.gstPercentage || 0) : 0;
            const vendorItemTax = vendorItemTotal * vendorGstRate / 100;

            if (product.vendorId) {
                if (!vendorTotals[product.vendorId]) {
                    vendorTotals[product.vendorId] = {
                        baseAmount: 0,
                        taxAmount: 0,
                        // Collects every rate seen for this vendor — a settlement spanning
                        // products on different HSN rates cannot report a single rate.
                        rates: new Set(),
                        vendorName: product.vendor.companyName || product.vendor.ownerName || 'Unknown Vendor'
                    };
                }
                vendorTotals[product.vendorId].baseAmount += vendorItemTotal;
                vendorTotals[product.vendorId].taxAmount += vendorItemTax;
                vendorTotals[product.vendorId].rates.add(vendorGstRate);
            }

            // Prepare Order Item Data
            orderItemsData.push({
                productId: product.id,
                productName: product.name,
                productImage: variant?.images?.[0] || product.images[0]?.url || '',
                quantity: item.quantity,
                unitPrice: unitPrice,
                totalPrice: itemTotal,
                totalPriceINR: toINR(itemTotal, currency, orderExchangeRate),
                transportType: lineTransport,
                // Freeze the vendor payout for this line so the settlement statement can
                // itemise it later. Vendor money is always INR — vendorPrice is basePrice,
                // never converted. Mirrors the vendorTotals accumulation above.
                vendorUnitPrice: round2(vendorPrice),
                vendorLineBase: round2(vendorItemTotal),
                vendorLineTax: round2(vendorItemTax),
                vendorGstRate: vendorGstRate,
                vendorId: product.vendorId,
                vendorName: product.vendor.companyName || product.vendor.ownerName,
                sku: variant ? variant.sku : product.baseSku,
                variantId: variant ? variant.id : undefined,
                size: variant ? variant.size : product.singleUnitSize || undefined,
                color: variant ? variant.color : product.singleUnitColor || undefined
            });

            // Prepare stock update list
            if (product.trackInventory) {
                // Check if stock became insufficient in the meantime?
                // For high concurrency, we should check inside transaction or use optimistic locking.
                // For now, we collect the ID to decrement later in transaction.
                stockUpdates.push({
                    id: product.id,
                    variantId: variant ? variant.id : null,
                    quantity: item.quantity,
                    inventoryItemId: product.inventoryItemId,
                    currentTotalStock: product.totalStock
                });
            }
        }

        // 5. Create Order
        // Generate unique Order ID (invoiceNo was already generated in parallel
        // pre-flight, so no extra round trip here).
        const timestamp = Date.now().toString().slice(-6);
        const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        const orderDisplayId = `ORD-${new Date().getFullYear()}-${timestamp}${random}`;

        /*
          Money must be rounded to 2dp BEFORE it is summed, not after.

          These values are stored and then printed line-by-line on the invoice,
          which formats each to 2dp. Summing the raw floats and rounding only
          for display made the invoice fail to add up: a 4 × $4.19 order with
          12% GST and a 10% coupon stored tax=2.0112, discount=1.676 and
          total=17.0952 — printed as "16.76 + 2.01 − 1.68" but a Grand Total of
          "17.10" (the lines sum to 17.09). On a tax document the components
          must reconcile exactly against the total.

          Rounding each component first makes the stored total identical to the
          sum of the printed lines. It also collapses float artefacts such as
          discount = 1.6760000000000002.
        */
        const roundedSubtotal = round2(subtotal);
        // Server-computed GST wins over the client's figure. The client value is
        // only compared, so a genuine mismatch (stale cart price, tampering) is
        // visible in the logs instead of silently becoming the invoiced tax.
        const roundedTax = round2(computedTax);
        const clientTax = round2(Number(tax) || 0);
        if (Math.abs(clientTax - roundedTax) > 0.01) {
            console.warn(
                `[createOrder] Client tax ${clientTax} != server tax ${roundedTax} ` +
                `(user ${userId}, ${currency}). Storing the server figure.`
            );
        }
        // ── Discount: re-derived server-side from the coupon row ─────────────
        // The client reads `discount` out of localStorage, so it is attacker-
        // controlled. Re-run the same validator the /coupons/apply endpoint uses,
        // against the server's own subtotal. No coupon code => no discount, whatever
        // the client claimed. An invalid/expired coupon fails the order rather than
        // silently charging full price after the customer already paid the
        // discounted amount — the payment reconciliation above would reject it anyway.
        let roundedDiscount = 0;
        let validatedCouponCode = null;
        let couponGrantsFreeShipping = false;
        if (couponCode) {
            const evaluated = await evaluateCoupon({
                code: couponCode,
                cartTotal: roundedSubtotal,
                userId,
                currency,
            });
            if (!evaluated.ok) {
                return res.status(400).json({
                    success: false,
                    error: `Coupon could not be applied: ${evaluated.message}`,
                });
            }
            roundedDiscount = round2(evaluated.discountAmount);
            validatedCouponCode = evaluated.code;
            couponGrantsFreeShipping = Boolean(evaluated.freeShipping);
        }
        const clientDiscount = round2(Number(discount) || 0);
        if (Math.abs(clientDiscount - roundedDiscount) > 0.01) {
            console.warn(
                `[createOrder] Client discount ${clientDiscount} != server discount ${roundedDiscount} ` +
                `(user ${userId}, coupon ${couponCode || 'none'}). Storing the server figure.`
            );
        }
        // ── Shipping: re-derived server-side ────────────────────────────────
        // Computed from each product's own logisticsConfig (see utils/logistics.js,
        // a port of the storefront's lib/logistics.ts) rather than trusting the
        // client's number. The per-kg rates are in rupees, so convert into the
        // order's currency using this order's rate snapshot — otherwise a ₹50
        // shipping charge would be billed as $50 on a .com order.
        const freeShipping = await qualifiesForFreeShipping({
            prisma,
            userId,
            cartTotalInr: currency === 'USD'
                ? toINR(roundedSubtotal, currency, orderExchangeRate)
                : roundedSubtotal,
            couponGrantsFreeShipping,
        });
        const roundedShipping = freeShipping
            ? 0
            : Math.max(0, convertShippingToOrderCurrency(
                computedShippingInr, currency, orderExchangeRate
            ));
        const clientShipping = round2(Number(shippingCost) || 0);
        if (Math.abs(clientShipping - roundedShipping) > 0.01) {
            console.warn(
                `[createOrder] Client shipping ${clientShipping} != server shipping ${roundedShipping} ` +
                `(user ${userId}, ${currency}, freeShipping=${freeShipping}). Storing the server figure.`
            );
        }

        // Clamp at zero. A discount larger than the goods value must never produce a
        // negative order that would read as money owed to the customer.
        const totalAmount = Math.max(0, round2(
            roundedSubtotal + roundedShipping + roundedTax - roundedDiscount
        ));

        // ── Payment amount reconciliation ────────────────────────────────────
        // The HMAC signature proves the payment exists and is ours — it does NOT
        // prove it was for THIS cart. Without this check, a valid signature from an
        // earlier ₹10 order verifies fine against a ₹10,000 basket. This is the only
        // point in the request where the server knows both the captured amount and
        // its own computed total, so the comparison belongs here.
        if (needsRazorpayVerification) {
            try {
                const Razorpay = require('razorpay');
                const rzp = new Razorpay({
                    key_id: paymentSettings.razorpayKeyId,
                    key_secret: paymentSettings.razorpayKeySecret,
                });
                const rzpOrder = await rzp.orders.fetch(razorpayOrderId);

                // Step 1 — did the customer actually pay the full amount the Razorpay
                // order was raised for? Both figures come from Razorpay in paise, so
                // this is exact and currency-independent.
                const orderPaise = Number(rzpOrder?.amount || 0);
                const paidPaise = Number(rzpOrder?.amount_paid || 0);
                if (!paidPaise) {
                    return res.status(400).json({
                        success: false,
                        error: 'Payment verification failed - payment not captured'
                    });
                }
                if (paidPaise < orderPaise) {
                    console.error(
                        `[createOrder] Underpayment: paid ${paidPaise} of ${orderPaise} paise ` +
                        `(user ${userId}, rzpOrder ${razorpayOrderId}).`
                    );
                    return res.status(400).json({
                        success: false,
                        error: 'Payment verification failed - payment incomplete'
                    });
                }

                // Step 2 — was that payment raised for THIS cart? paymentController
                // stamps the quote onto the Razorpay order's notes at creation time,
                // so compare in the ORDER'S OWN CURRENCY against that snapshot.
                //
                // Deliberately NOT re-converting with the live FX rate: the customer
                // may sit on the payment page for minutes, and an admin editing the
                // exchange rate in that window would otherwise make a perfectly good
                // payment fail reconciliation (money taken, no order created). The
                // quote is immutable once the Razorpay order exists, so comparing
                // like-for-like removes FX from this check entirely.
                const quotedAmount = Number(rzpOrder?.notes?.quotedAmount);
                const quotedCurrency = String(rzpOrder?.notes?.quotedCurrency || '').toUpperCase();

                let expected = null;
                let paid = null;
                let unit = currency;
                if (Number.isFinite(quotedAmount) && quotedCurrency === currency) {
                    expected = totalAmount;
                    paid = quotedAmount;
                } else {
                    // Fallback for orders raised before the quote was stamped: compare
                    // in INR using this order's own rate snapshot.
                    unit = 'INR';
                    expected = currency === 'USD'
                        ? toINR(totalAmount, currency, orderExchangeRate)
                        : totalAmount;
                    paid = round2(paidPaise / 100);
                }

                // Tolerance covers cent-level rounding only — same units on both
                // sides, so anything larger is a genuine mismatch.
                const tolerance = Math.max(0.02, round2(Number(expected) * 0.005));
                if (expected != null && paid < expected - tolerance) {
                    console.error(
                        `[createOrder] Payment amount mismatch: paid ${paid} vs expected ${expected} ${unit} ` +
                        `(user ${userId}, rzpOrder ${razorpayOrderId}).`
                    );
                    return res.status(400).json({
                        success: false,
                        error: 'Payment verification failed - amount does not match your order'
                    });
                }
                if (expected != null && paid > expected + tolerance) {
                    // Overpayment is not a security risk, but it means the quote and
                    // the recomputed total drifted — worth seeing in the logs.
                    console.warn(
                        `[createOrder] Customer overpaid: ${paid} vs ${expected} ${unit} ` +
                        `(user ${userId}, rzpOrder ${razorpayOrderId}).`
                    );
                }
            } catch (rzpErr) {
                // A verification that cannot complete must not silently pass: this is
                // the guard standing between a signature and a real captured payment.
                console.error('[createOrder] Razorpay reconciliation failed:', rzpErr.message);
                return res.status(400).json({
                    success: false,
                    error: 'Payment verification failed - could not confirm payment'
                });
            }
        }

        // Group vendor totals for Settlements (Now calculated in the main cart loop)

        const datePeriod = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });

        // Track low stock alerts (populated inside transaction, sent after)
        const lowStockAlerts = [];

        // Collected during the transaction but written AFTER it commits.
        // These are pure audit log entries; persisting them outside the
        // transaction keeps the critical-path write count smaller without
        // affecting order correctness.
        const stockHistoryRecords = [];

        // Use transaction to ensure data integrity
        const result = await prisma.$transaction(async (tx) => {
            // Create Order
            const newOrder = await tx.order.create({
                data: {
                    orderId: orderDisplayId,
                    invoiceNo,                    // ← from InvoiceSettings
                    customerId: userId,
                    customerName: user.name,
                    customerEmail: user.email,
                    customerPhone: shippingAddress.phone || user.phoneNumber || "",
                    shippingAddress,
                    // Persist the rounded components so what's stored is exactly
                    // what the invoice prints, and subtotal + tax − discount
                    // reconciles against totalAmount.
                    subtotal: roundedSubtotal,
                    shippingCost: roundedShipping,
                    tax: roundedTax,
                    discount: roundedDiscount,
                    totalAmount,
                    couponCode: validatedCouponCode,
                    currency,
                    exchangeRate: orderExchangeRate,
                    // INR twins — every cross-order aggregate sums these, not the originals.
                    totalAmountINR: round2(toINR(totalAmount, currency, orderExchangeRate)),
                    taxINR: round2(toINR(roundedTax, currency, orderExchangeRate)),
                    shippingCostINR: round2(toINR(roundedShipping, currency, orderExchangeRate)),
                    discountINR: round2(toINR(roundedDiscount, currency, orderExchangeRate)),
                    paymentStatus: paymentMethod === 'COD' ? 'PENDING' : 'PAID',
                    paymentMethod,
                    paymentId,
                    status: 'ORDER_CREATED',
                    items: {
                        create: orderItemsData
                    }
                },
                include: {
                    items: true
                }
            });

            // Re-validate stock inside transaction to prevent concurrent overselling.
            // The outer check (pre-transaction) is a fast-path guard; this is the
            // authoritative check under transactional isolation. Reads run in
            // parallel — each round trip would otherwise stack serially.
            const freshStockChecks = await Promise.all(
                stockUpdates.map((update) =>
                    update.variantId
                        ? tx.productVariant.findUnique({ where: { id: update.variantId }, select: { stock: true } })
                        : tx.product.findUnique({ where: { id: update.id }, select: { totalStock: true } })
                )
            );
            for (let i = 0; i < stockUpdates.length; i++) {
                const update = stockUpdates[i];
                const fresh = freshStockChecks[i];
                const available = update.variantId ? fresh?.stock : fresh?.totalStock;
                if (!fresh || available < update.quantity) {
                    throw Object.assign(
                        new Error(`Insufficient stock for one of the products. Please refresh and try again.`),
                        { statusCode: 409 }
                    );
                }
            }

            // Increment coupon usedCount if a coupon was applied
            if (validatedCouponCode) {
                await tx.coupon.updateMany({
                    where: { code: validatedCouponCode },
                    data: { usedCount: { increment: 1 } },
                });
            }

            // Update Stock
            // Aggregate total quantity per product for totalStock/inventory updates
            const productTotalDeductions = {};
            for (const update of stockUpdates) {
                if (!productTotalDeductions[update.id]) {
                    productTotalDeductions[update.id] = {
                        totalQuantity: 0,
                        inventoryItemId: update.inventoryItemId,
                        currentTotalStock: update.currentTotalStock
                    };
                }
                productTotalDeductions[update.id].totalQuantity += update.quantity;
            }

            // Decrement stock sequentially. MongoDB transactions only allow one
            // operation per session at a time and Prisma serializes parallel
            // writes onto the same tx client anyway, so Promise.all would add
            // risk without any actual parallelism.
            for (const update of stockUpdates) {
                if (update.variantId) {
                    await tx.productVariant.update({
                        where: { id: update.variantId },
                        data: { stock: { decrement: update.quantity } }
                    });
                } else if (update.inventoryItemId) {
                    await tx.inventory.update({
                        where: { id: update.inventoryItemId },
                        data: { baseStock: { decrement: update.quantity } }
                    });
                }
            }

            // Recalculate product totalStock and inventory currentStock from
            // source-of-truth values. Reads inside each iteration run in
            // parallel (safe — read-only, distinct documents). The outer loop
            // and writes stay sequential because MongoDB transactions only
            // allow one operation per session at a time.
            for (const [productId, agg] of Object.entries(productTotalDeductions)) {
                const [freshProduct, freshInventory] = await Promise.all([
                    tx.product.findUnique({
                        where: { id: productId },
                        include: { variants: true },
                    }),
                    agg.inventoryItemId
                        ? tx.inventory.findUnique({ where: { id: agg.inventoryItemId } })
                        : Promise.resolve(null),
                ]);

                const variantSum = freshProduct?.variants
                    ? freshProduct.variants.reduce((sum, v) => sum + v.stock, 0)
                    : 0;

                let newTotalStock;

                if (agg.inventoryItemId && freshInventory) {
                    newTotalStock = freshInventory.baseStock + variantSum;
                    await tx.inventory.update({
                        where: { id: agg.inventoryItemId },
                        data: { currentStock: newTotalStock },
                    });
                    // Audit log entry — persisted in a single createMany after the
                    // transaction commits to keep the critical path shorter.
                    stockHistoryRecords.push({
                        inventoryId: agg.inventoryItemId,
                        previousStock: newTotalStock + agg.totalQuantity,
                        newStock: newTotalStock,
                        changeAmount: -agg.totalQuantity,
                        reason: `Order placed: ${orderDisplayId}`,
                        changedBy: userId,
                        changedByType: 'system',
                        changedByName: user.name,
                    });
                } else {
                    newTotalStock = Math.max(0, agg.currentTotalStock - agg.totalQuantity);
                }

                await tx.product.update({
                    where: { id: productId },
                    data: { totalStock: newTotalStock, inStock: newTotalStock > 0 },
                });

                // Low-stock notification metadata. Use the already-fetched product
                // name instead of issuing a second findUnique.
                if (newTotalStock <= 10 || newTotalStock === 0) {
                    lowStockAlerts.push({
                        productId,
                        productName: freshProduct?.name || 'Unknown Product',
                        newStock: newTotalStock,
                        threshold: freshProduct?.lowStockThreshold || 10,
                    });
                }
            }

            // Create Vendor Settlements
            const settlementRecords = [];
            const vendorKeys = Object.keys(vendorTotals);
            for (let i = 0; i < vendorKeys.length; i++) {
                const vid = vendorKeys[i];
                const vData = vendorTotals[vid];
                const seqStr = String(i + 1).padStart(3, '0');
                const setNum = `SET-${new Date().getFullYear()}-${timestamp}-${seqStr}`;

                // Round money to paise once, at the record boundary — accumulating
                // rounded per-item tax would drift on multi-line settlements.
                const baseAmount = round2(vData.baseAmount);
                const taxAmount = round2(vData.taxAmount);
                // Only report a rate when the whole settlement shares one.
                const uniformRate = vData.rates.size === 1 ? [...vData.rates][0] : null;

                settlementRecords.push({
                    settlementNumber: setNum,
                    vendorId: vid,
                    vendorName: vData.vendorName,
                    orderId: newOrder.id,
                    billingNumber: invoiceNo || orderDisplayId,
                    period: datePeriod,
                    baseAmount,
                    taxAmount,
                    gstPercentage: uniformRate,
                    // Gross payable — what actually leaves M2C's bank.
                    amount: round2(baseAmount + taxAmount),
                    status: 'Pending',
                    dueDate: null,
                });
            }

            if (settlementRecords.length > 0) {
                await tx.settlement.createMany({
                    data: settlementRecords
                });
            }

            // Create VendorShipments — one per vendor in this order.
            // Each shipment tracks its own status, shipping, hub, and review.
            const vendorItemGroups = {};
            for (const item of newOrder.items) {
                if (!vendorItemGroups[item.vendorId]) {
                    vendorItemGroups[item.vendorId] = {
                        vendorName: item.vendorName,
                        itemIds: [],
                    };
                }
                vendorItemGroups[item.vendorId].itemIds.push(item.id);
            }

            // Create per-vendor shipments sequentially — MongoDB transactions
            // serialize writes on the same session, so parallelism here would
            // add risk without speed-up.
            let shipmentIdx = 0;
            for (const [vid, group] of Object.entries(vendorItemGroups)) {
                shipmentIdx++;
                const shipmentDisplayId = `${orderDisplayId}-V${shipmentIdx}`;
                const shipment = await tx.vendorShipment.create({
                    data: {
                        shipmentId: shipmentDisplayId,
                        orderId: newOrder.id,
                        vendorId: vid,
                        vendorName: group.vendorName,
                        status: 'ORDER_CREATED',
                    },
                });
                await tx.orderItem.updateMany({
                    where: { id: { in: group.itemIds } },
                    data: { shipmentId: shipment.id },
                });
            }

            // Clear Cart
            await tx.cartItem.deleteMany({
                where: { cartId: cart.id }
            });

            return newOrder;
        }, {
            // Order creation runs many sequential writes (order, stock revalidation,
            // variant + inventory updates, stockChangeHistory, settlements, vendor
            // shipments, cart cleanup). The 5s Prisma default is not enough on
            // Vercel serverless cold starts and was silently failing post-payment.
            maxWait: 10000,
            timeout: 30000,
        });

        // Persist audit log entries collected during the transaction. Fire-and-
        // forget — the order is already committed, so a log-write failure must
        // not block (or fail) the response to the customer.
        if (stockHistoryRecords.length > 0) {
            withRetry(() => prisma.stockChangeHistory.createMany({ data: stockHistoryRecords }))
                .catch((err) => console.error('stockChangeHistory backfill failed after retries:', err));
        }

        // Send low stock / out of stock alerts (outside transaction)
        const { createNotification, createNotificationForRole: notifyStockAlert } = require('./notificationController');
        for (const alert of lowStockAlerts) {
            if (alert.newStock === 0) {
                notifyStockAlert({
                    role: 'ADMIN', type: 'OUT_OF_STOCK',
                    title: 'Out of Stock',
                    message: `"${alert.productName}" is now out of stock!`,
                    data: { productId: alert.productId }
                }).catch(() => {});
            } else if (alert.newStock <= alert.threshold) {
                notifyStockAlert({
                    role: 'ADMIN', type: 'LOW_STOCK_ALERT',
                    title: 'Low Stock Alert',
                    message: `"${alert.productName}" has only ${alert.newStock} units left.`,
                    data: { productId: alert.productId }
                }).catch(() => {});
            }
        }

        // Notify vendors about new order (fire-and-forget)
        const vendorIds = [...new Set(result.items.map((i) => i.vendorId).filter(Boolean))];
        for (const vid of vendorIds) {
            const vendorItems = result.items.filter((i) => i.vendorId === vid);
            const vendorTotal = vendorItems.reduce((s, i) => s + i.totalPrice, 0);
            notifications.orderReceived(vid, result.orderId, vendorItems.length, vendorTotal).catch(() => {});
            createNotification({
                userId: vid, role: 'VENDOR', type: 'ORDER_RECEIVED',
                title: 'New Order Received',
                message: `Order #${result.orderId} — ${vendorItems.length} item(s), ₹${vendorTotal.toLocaleString('en-IN')}`,
                data: { orderId: result.id }
            }).catch(() => {});
        }

        // Notify admins — new order placed
        notifyStockAlert({
            role: 'ADMIN', type: 'NEW_ORDER',
            title: 'New Order Placed',
            message: `Order #${result.orderId} — ₹${result.totalAmount?.toLocaleString('en-IN')} from ${result.customerName || 'Customer'}`,
            data: { orderId: result.id }
        }).catch(() => {});

        // Notify customer — order confirmed
        if (result.customerId) {
            notifications.orderConfirmed(result.customerId, result.orderId).catch(() => {});
            createNotification({
                userId: result.customerId, role: 'USER', type: 'ORDER_CONFIRMED',
                title: 'Order Confirmed',
                message: `Your order #${result.orderId} has been placed successfully.`,
                data: { orderId: result.id }
            }).catch(() => {});
        }

        // Fire-and-forget: email vendors whose stock dropped to its low-stock
        // alert level because of this order (deduped per low-stock episode).
        const affectedInventoryIds = [...new Set(stockUpdates.map(u => u.inventoryItemId).filter(Boolean))];
        for (const invId of affectedInventoryIds) {
            checkAndAlertLowStock(invId).catch(() => {});
        }

        res.status(201).json({
            success: true,
            message: 'Order placed successfully',
            data: result
        });

    } catch (error) {
        if (error.statusCode === 409) {
            return res.status(409).json({ success: false, error: error.message });
        }
        console.error('Create order error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create order',
            // Surface the underlying message so payment-completed-but-order-failed
            // incidents can be diagnosed without server log access.
            detail: error?.message || undefined,
            code: error?.code || undefined,
        });
    }
};

// Get user orders
const getUserOrders = async (req, res) => {
    try {
        const userId = req.userId;

        const orders = await prisma.order.findMany({
            where: { customerId: userId },
            include: {
                items: ACTIVE_ITEMS_FILTER,
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        res.json({
            success: true,
            data: orders
        });
    } catch (error) {
        console.error('Get user orders error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch orders'
        });
    }
};

// Get single order by ID (supports both MongoDB id and human-readable orderId)
const getOrderById = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.userId;

        // Try to find by MongoDB id first, then by human-readable orderId
        let order = null;

        // Check if id looks like a MongoDB ObjectId (24 hex characters)
        const isObjectId = /^[0-9a-fA-F]{24}$/.test(id);

        if (isObjectId) {
            order = await prisma.order.findUnique({
                where: { id },
                include: {
                    items: ACTIVE_ITEMS_FILTER,
                    statusHistory: true
                }
            });
        }

        // If not found by id, try finding by orderId (human-readable)
        if (!order) {
            order = await prisma.order.findUnique({
                where: { orderId: id },
                include: {
                    items: ACTIVE_ITEMS_FILTER,
                    statusHistory: true
                }
            });
        }

        if (!order) {
            return res.status(404).json({
                success: false,
                error: 'Order not found'
            });
        }

        // Ensure user owns the order
        if (order.customerId !== userId) {
            return res.status(403).json({
                success: false,
                error: 'Unauthorized access to order'
            });
        }

        res.json({
            success: true,
            data: order
        });
    } catch (error) {
        console.error('Get order error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch order'
        });
    }
};

module.exports = {
    createOrder,
    getUserOrders,
    getOrderById
};
