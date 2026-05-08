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

        // 2. Get User's Cart
        const cart = await prisma.cart.findFirst({
            where: { userId },
            include: {
                items: true
            }
        });

        if (!cart || cart.items.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Cart is empty'
            });
        }

        // 3. Fetch User Details
        const user = await prisma.user.findUnique({
            where: { id: userId }
        });

        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        // 4. Validate Stock and Calculate Totals
        let subtotal = 0;
        const orderItemsData = [];
        const stockUpdates = [];
        const vendorTotals = {}; // Tracks vendor amounts using their base prices


        // Helper to get vendor details
        // We need to fetch product details for each item to get price, vendor, etc.
        for (const item of cart.items) {
            const product = await prisma.product.findUnique({
                where: { id: item.productId },
                include: {
                    vendor: true, // Need vendor info for OrderItem
                    variants: item.variantId ? {
                        where: { id: item.variantId }
                    } : false,
                    images: {
                        where: { isPrimary: true },
                        take: 1
                    }
                }
            });

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

        // 5. Resolve bag type selection (if any)
        let bagTypeName = null;
        let bagTypePrice = 0;

        if (bagTypeId) {
            const bagType = await prisma.bagType.findUnique({ where: { id: bagTypeId } });
            if (!bagType || !bagType.isActive) {
                return res.status(400).json({
                    success: false,
                    error: 'Selected bag type is not available'
                });
            }
            bagTypeName = bagType.name;
            bagTypePrice = currency === 'USD'
                ? (bagType.priceUSD || bagType.price)
                : (bagType.priceINR || bagType.price);
        }

        // 6. Create Order
        // Generate unique Order ID
        const timestamp = Date.now().toString().slice(-6);
        const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        const orderDisplayId = `ORD-${new Date().getFullYear()}-${timestamp}${random}`;

        // Generate invoice number from InvoiceSettings
        const invoiceNo = await generateInvoiceNo(prisma);

        const totalAmount = subtotal + shippingCost + tax - discount + bagTypePrice;

        // Group vendor totals for Settlements (Now calculated in the main cart loop)

        const datePeriod = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });

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
            // authoritative check under transactional isolation.
            for (const update of stockUpdates) {
                if (update.variantId) {
                    const freshVariant = await tx.productVariant.findUnique({
                        where: { id: update.variantId },
                        select: { stock: true },
                    });
                    if (!freshVariant || freshVariant.stock < update.quantity) {
                        throw Object.assign(
                            new Error(`Insufficient stock for one of the products. Please refresh and try again.`),
                            { statusCode: 409 }
                        );
                    }
                } else {
                    const freshProduct = await tx.product.findUnique({
                        where: { id: update.id },
                        select: { totalStock: true },
                    });
                    if (!freshProduct || freshProduct.totalStock < update.quantity) {
                        throw Object.assign(
                            new Error(`Insufficient stock for one of the products. Please refresh and try again.`),
                            { statusCode: 409 }
                        );
                    }
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

            for (const update of stockUpdates) {
                // Decrement the specific variant's stock if applicable
                if (update.variantId) {
                    await tx.productVariant.update({
                        where: { id: update.variantId },
                        data: {
                            stock: { decrement: update.quantity }
                        }
                    });
                }

                // Decrement inventory baseStock for base product items (no variant)
                if (!update.variantId && update.inventoryItemId) {
                    await tx.inventory.update({
                        where: { id: update.inventoryItemId },
                        data: {
                            baseStock: { decrement: update.quantity }
                        }
                    });
                }
            }

            // Recalculate product totalStock and inventory currentStock from source-of-truth values
            for (const [productId, agg] of Object.entries(productTotalDeductions)) {
                // Re-read fresh variant stocks after Step 2 decrements
                const freshProduct = await tx.product.findUnique({
                    where: { id: productId },
                    include: { variants: true }
                });

                const variantSum = freshProduct.variants
                    ? freshProduct.variants.reduce((sum, v) => sum + v.stock, 0)
                    : 0;

                let newTotalStock;

                if (agg.inventoryItemId) {
                    // Re-read fresh baseStock after Step 2 decrement
                    const freshInventory = await tx.inventory.findUnique({
                        where: { id: agg.inventoryItemId }
                    });
                    newTotalStock = freshInventory.baseStock + variantSum;

                    await tx.inventory.update({
                        where: { id: agg.inventoryItemId },
                        data: {
                            currentStock: newTotalStock
                        }
                    });

                    // Log stock change history accurately reflecting the order deductions
                    await tx.stockChangeHistory.create({
                        data: {
                            inventoryId: agg.inventoryItemId,
                            previousStock: newTotalStock + agg.totalQuantity,
                            newStock: newTotalStock,
                            changeAmount: -agg.totalQuantity,
                            reason: `Order placed: ${orderDisplayId}`,
                            changedBy: userId,
                            changedByType: 'system',
                            changedByName: user.name
                        }
                    });
                } else {
                    // No inventory link — just decrement totalStock
                    newTotalStock = Math.max(0, agg.currentTotalStock - agg.totalQuantity);
                }

                await tx.product.update({
                    where: { id: productId },
                    data: {
                        totalStock: newTotalStock,
                        inStock: newTotalStock > 0
                    }
                });
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
                    status: 'Pending'
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
                // Link items to their shipment
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
        });

        // Notify vendors about new order (fire-and-forget)
        const vendorIds = [...new Set(result.items.map((i) => i.vendorId).filter(Boolean))];
        for (const vid of vendorIds) {
            const vendorItems = result.items.filter((i) => i.vendorId === vid);
            const vendorTotal = vendorItems.reduce((s, i) => s + i.totalPrice, 0);
            notifications.orderReceived(vid, result.orderId, vendorItems.length, vendorTotal).catch(() => {});
        }

        // Notify customer — order confirmed
        if (result.customerId) {
            notifications.orderConfirmed(result.customerId, result.orderId).catch(() => {});
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
            error: 'Failed to create order'
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
