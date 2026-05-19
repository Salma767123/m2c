const crypto = require('crypto');
const { prisma } = require('../config/database');
const { generateInvoiceNo } = require('../utils/invoiceGenerator');
const { ACTIVE_ITEMS_FILTER } = require('../utils/activeItemsFilter');
const { notifications } = require('../utils/notificationService');

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
            bagTypeId = null,
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
        const needsRazorpayVerification = Boolean(razorpayOrderId && razorpaySignature && paymentId);

        const [cart, user, bagType, paymentSettings] = await Promise.all([
            prisma.cart.findFirst({ where: { userId }, include: { items: true } }),
            prisma.user.findUnique({ where: { id: userId } }),
            bagTypeId ? prisma.bagType.findUnique({ where: { id: bagTypeId } }) : Promise.resolve(null),
            needsRazorpayVerification
                ? prisma.paymentSettings.findFirst({ select: { razorpayKeySecret: true } })
                : Promise.resolve(null),
        ]);

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

        if (bagTypeId && (!bagType || !bagType.isActive)) {
            return res.status(400).json({
                success: false,
                error: 'Selected bag type is not available'
            });
        }

        // 3. Validate Stock and Calculate Totals
        let subtotal = 0;
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

            // Pick regional price based on currency: priceINR/priceUSD → adminFixedPrice → basePrice
            let unitPrice;
            if (currency === 'USD') {
                unitPrice = variant
                    ? (variant.priceUSD || variant.adminFixedPrice || variant.price)
                    : (product.priceUSD || product.adminFixedPrice || product.basePrice);
            } else {
                unitPrice = variant
                    ? (variant.priceINR || variant.adminFixedPrice || variant.price)
                    : (product.priceINR || product.adminFixedPrice || product.basePrice);
            }
            const itemTotal = unitPrice * item.quantity;
            subtotal += itemTotal;

            // Calculate Vendor Settlement using vendor's base price
            const vendorPrice = product.basePrice || 0;
            const vendorItemTotal = vendorPrice * item.quantity;

            if (product.vendorId) {
                if (!vendorTotals[product.vendorId]) {
                    vendorTotals[product.vendorId] = {
                        amount: 0,
                        vendorName: product.vendor.companyName || product.vendor.ownerName || 'Unknown Vendor'
                    };
                }
                vendorTotals[product.vendorId].amount += vendorItemTotal;
            }

            // Prepare Order Item Data
            orderItemsData.push({
                productId: product.id,
                productName: product.name,
                productImage: variant?.images?.[0] || product.images[0]?.url || '',
                quantity: item.quantity,
                unitPrice: unitPrice,
                totalPrice: itemTotal,
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

        // 4. Resolve bag type pricing (bag was already fetched + validated in
        // the parallel pre-flight above).
        const bagTypeName = bagType ? bagType.name : null;
        const bagTypePrice = bagType
            ? (currency === 'USD'
                ? (bagType.priceUSD || bagType.price)
                : (bagType.priceINR || bagType.price))
            : 0;

        // 5. Create Order
        // Generate unique Order ID (invoiceNo was already generated in parallel
        // pre-flight, so no extra round trip here).
        const timestamp = Date.now().toString().slice(-6);
        const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        const orderDisplayId = `ORD-${new Date().getFullYear()}-${timestamp}${random}`;

        const totalAmount = subtotal + shippingCost + tax - discount + bagTypePrice;

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
                    subtotal,
                    shippingCost,
                    tax,
                    discount,
                    totalAmount,
                    bagTypeId: bagTypeId || undefined,
                    bagTypeName,
                    bagTypePrice,
                    couponCode: couponCode || null,
                    currency,
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
            if (couponCode) {
                await tx.coupon.updateMany({
                    where: { code: couponCode },
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
                settlementRecords.push({
                    settlementNumber: setNum,
                    vendorId: vid,
                    vendorName: vData.vendorName,
                    orderId: newOrder.id,
                    billingNumber: invoiceNo || orderDisplayId,
                    period: datePeriod,
                    amount: vData.amount,
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
            prisma.stockChangeHistory.createMany({ data: stockHistoryRecords })
                .catch((err) => console.error('stockChangeHistory backfill failed:', err));
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
