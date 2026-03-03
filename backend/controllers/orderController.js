const { prisma } = require('../config/database');
const { generateInvoiceNo } = require('../utils/invoiceGenerator');

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
            discount = 0
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

            const variant = item.variantId && product.variants?.length > 0 ? product.variants[0] : null;

            // Check stock
            const checkStock = variant ? variant.stock : product.totalStock;
            if (product.trackInventory && checkStock < item.quantity) {
                return res.status(400).json({
                    success: false,
                    error: `Insufficient stock for product: ${product.name}`
                });
            }

            const unitPrice = variant ? variant.price : (product.adminFixedPrice || product.basePrice);
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

        // 5. Create Order
        // Generate unique Order ID
        const timestamp = Date.now().toString().slice(-6);
        const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        const orderDisplayId = `ORD-${new Date().getFullYear()}-${timestamp}${random}`;

        // Generate invoice number from InvoiceSettings
        const invoiceNo = await generateInvoiceNo(prisma);

        const totalAmount = subtotal + shippingCost + tax - discount;

        // Group vendor totals for Settlements (Now calculated in the main cart loop)

        const datePeriod = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });
        // Set due date to 7 days from now
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 7);

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

            // Update Stock
            for (const update of stockUpdates) {
                const productUpdateData = {
                    totalStock: { decrement: update.quantity }
                };

                // Check if the stock drops to 0 or below, set inStock to false
                if (update.currentTotalStock - update.quantity <= 0) {
                    productUpdateData.inStock = false;
                }

                await tx.product.update({
                    where: { id: update.id },
                    data: productUpdateData
                });

                // Also decrement the specific variant's stock if applicable
                if (update.variantId) {
                    await tx.productVariant.update({
                        where: { id: update.variantId },
                        data: {
                            stock: { decrement: update.quantity }
                        }
                    });
                }

                // Also reduce from Inventory model if linked
                if (update.inventoryItemId) {
                    await tx.inventory.update({
                        where: { id: update.inventoryItemId },
                        data: {
                            currentStock: { decrement: update.quantity }
                        }
                    });

                    // Log stock change history
                    await tx.stockChangeHistory.create({
                        data: {
                            inventoryId: update.inventoryItemId,
                            previousStock: update.currentTotalStock,
                            newStock: Math.max(0, update.currentTotalStock - update.quantity),
                            changeAmount: -Math.abs(update.quantity),
                            reason: `Order placed: ${orderDisplayId}`,
                            changedBy: userId,
                            changedByType: 'system',
                            changedByName: user.name
                        }
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
                    dueDate: dueDate,
                    status: 'Pending'
                });
            }

            if (settlementRecords.length > 0) {
                await tx.settlement.createMany({
                    data: settlementRecords
                });
            }

            // Clear Cart
            await tx.cartItem.deleteMany({
                where: { cartId: cart.id }
            });

            return newOrder;
        });

        res.status(201).json({
            success: true,
            message: 'Order placed successfully',
            data: result
        });

    } catch (error) {
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
                items: true
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
                    items: true,
                    statusHistory: true
                }
            });
        }

        // If not found by id, try finding by orderId (human-readable)
        if (!order) {
            order = await prisma.order.findUnique({
                where: { orderId: id },
                include: {
                    items: true,
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
