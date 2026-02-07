export interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  productImage: string;
  variantId?: string;
  size?: string;
  color?: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  vendorId: string;
  vendorName: string;
}

export interface OrderStatusHistoryItem {
  id: string;
  status: OrderStatus;
  comment?: string;
  updatedBy?: string;
  updatedByType?: 'admin' | 'vendor' | 'system';
  timestamp: string;
}

export interface AdminReview {
  id: string;
  reviewComments?: string;
  qualityCheckNotes?: string;
  rating?: number;
  approved: boolean;
  reviewedBy?: string;
  reviewedAt?: string;
  rejectionReason?: string;
  returnToVendor: boolean;
}

export interface Order {
  id: string;
  orderId: string;
  customerId?: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  shippingAddress: {
    name: string;
    address: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
    phone: string;
  };
  items: OrderItem[];
  subtotal: number;
  shippingCost: number;
  tax: number;
  discount: number;
  totalAmount: number;
  paymentStatus: PaymentStatus;
  paymentMethod?: string;
  paymentId?: string;
  status: OrderStatus;
  trackingReference?: string;
  vendorId?: string;
  adminReview?: AdminReview;
  statusHistory: OrderStatusHistoryItem[];
  orderDate: string;
  estimatedDelivery?: string;
  actualDelivery?: string;
}

export enum OrderStatus {
  ORDER_CREATED = 'ORDER_CREATED',
  VENDOR_PROCESSING = 'VENDOR_PROCESSING',
  PACKED_BY_VENDOR = 'PACKED_BY_VENDOR',
  IN_TRANSIT_TO_ADMIN_HUB = 'IN_TRANSIT_TO_ADMIN_HUB',
  RECEIVED_AT_ADMIN_HUB = 'RECEIVED_AT_ADMIN_HUB',
  APPROVED_BY_ADMIN_HUB = 'APPROVED_BY_ADMIN_HUB',
  REJECTED_BY_ADMIN_HUB = 'REJECTED_BY_ADMIN_HUB',
  SHIPPED_TO_CUSTOMER = 'SHIPPED_TO_CUSTOMER',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
  RETURNED = 'RETURNED'
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED'
}

// Mock Order Data
export const mockOrders: Order[] = [
  {
    id: '1',
    orderId: 'ORD-2024-001',
    customerId: 'cust_001',
    customerName: 'John Smith',
    customerEmail: 'john.smith@email.com',
    customerPhone: '+1-555-0123',
    shippingAddress: {
      name: 'John Smith',
      address: '123 Main Street, Apt 4B',
      city: 'New York',
      state: 'NY',
      zipCode: '10001',
      country: 'USA',
      phone: '+1-555-0123'
    },
    items: [
      {
        id: 'item_1',
        productId: 'prod_001',
        productName: 'Premium Cotton T-Shirt',
        productImage: '/assets/images/features/products/fp1.jpg',
        variantId: 'var_001',
        size: 'L',
        color: 'Blue',
        sku: 'COTTON-TEE-BL-L',
        quantity: 2,
        unitPrice: 25.99,
        totalPrice: 51.98,
        vendorId: 'vendor_001',
        vendorName: 'TextileCorp Manufacturing'
      },
      {
        id: 'item_2',
        productId: 'prod_002',
        productName: 'Organic Cotton Towel Set',
        productImage: '/assets/images/categories/towels/tc1.jpg',
        size: 'Standard',
        color: 'White',
        sku: 'TOWEL-SET-WH-STD',
        quantity: 1,
        unitPrice: 45.00,
        totalPrice: 45.00,
        vendorId: 'vendor_002',
        vendorName: 'EcoTextiles Ltd'
      }
    ],
    subtotal: 96.98,
    shippingCost: 8.99,
    tax: 7.76,
    discount: 5.00,
    totalAmount: 108.73,
    paymentStatus: PaymentStatus.PAID,
    paymentMethod: 'Credit Card',
    paymentId: 'pay_1234567890',
    status: OrderStatus.RECEIVED_AT_ADMIN_HUB,
    trackingReference: 'TRK-ADM-001',
    vendorId: 'vendor_001',
    statusHistory: [
      {
        id: 'hist_1',
        status: OrderStatus.ORDER_CREATED,
        comment: 'Order placed by customer',
        updatedByType: 'system',
        timestamp: '2024-02-01T10:00:00Z'
      },
      {
        id: 'hist_2',
        status: OrderStatus.VENDOR_PROCESSING,
        comment: 'Order received and being processed',
        updatedBy: 'vendor_001',
        updatedByType: 'vendor',
        timestamp: '2024-02-01T11:30:00Z'
      },
      {
        id: 'hist_3',
        status: OrderStatus.PACKED_BY_VENDOR,
        comment: 'Products packed and ready for shipment',
        updatedBy: 'vendor_001',
        updatedByType: 'vendor',
        timestamp: '2024-02-02T09:15:00Z'
      },
      {
        id: 'hist_4',
        status: OrderStatus.IN_TRANSIT_TO_ADMIN_HUB,
        comment: 'Shipped to Admin Hub for quality check',
        updatedBy: 'vendor_001',
        updatedByType: 'vendor',
        timestamp: '2024-02-02T14:00:00Z'
      },
      {
        id: 'hist_5',
        status: OrderStatus.RECEIVED_AT_ADMIN_HUB,
        comment: 'Package received at Admin Hub - awaiting quality review',
        updatedByType: 'system',
        timestamp: '2024-02-04T08:30:00Z'
      }
    ],
    orderDate: '2024-02-01T10:00:00Z',
    estimatedDelivery: '2024-02-10T00:00:00Z'
  },
  {
    id: '2',
    orderId: 'ORD-2024-002',
    customerId: 'cust_002',
    customerName: 'Sarah Johnson',
    customerEmail: 'sarah.johnson@email.com',
    customerPhone: '+1-555-0456',
    shippingAddress: {
      name: 'Sarah Johnson',
      address: '456 Oak Avenue',
      city: 'Los Angeles',
      state: 'CA',
      zipCode: '90210',
      country: 'USA',
      phone: '+1-555-0456'
    },
    items: [
      {
        id: 'item_3',
        productId: 'prod_003',
        productName: 'Luxury Silk Scarf',
        productImage: '/assets/images/features/products/fp3.jpg',
        size: 'One Size',
        color: 'Red',
        sku: 'SILK-SCARF-RD-OS',
        quantity: 1,
        unitPrice: 89.99,
        totalPrice: 89.99,
        vendorId: 'vendor_003',
        vendorName: 'Silk Artisans Co'
      }
    ],
    subtotal: 89.99,
    shippingCost: 12.99,
    tax: 7.20,
    discount: 0,
    totalAmount: 110.18,
    paymentStatus: PaymentStatus.PAID,
    paymentMethod: 'PayPal',
    paymentId: 'pay_0987654321',
    status: OrderStatus.APPROVED_BY_ADMIN_HUB,
    trackingReference: 'TRK-ADM-002',
    vendorId: 'vendor_003',
    adminReview: {
      id: 'review_1',
      reviewComments: 'Excellent quality silk scarf. Packaging is perfect.',
      qualityCheckNotes: 'No defects found. Color matches description perfectly.',
      rating: 5,
      approved: true,
      reviewedBy: 'admin_001',
      reviewedAt: '2024-02-03T15:45:00Z',
      returnToVendor: false
    },
    statusHistory: [
      {
        id: 'hist_6',
        status: OrderStatus.ORDER_CREATED,
        comment: 'Order placed by customer',
        updatedByType: 'system',
        timestamp: '2024-01-30T14:20:00Z'
      },
      {
        id: 'hist_7',
        status: OrderStatus.VENDOR_PROCESSING,
        comment: 'Order confirmed and processing',
        updatedBy: 'vendor_003',
        updatedByType: 'vendor',
        timestamp: '2024-01-30T16:00:00Z'
      },
      {
        id: 'hist_8',
        status: OrderStatus.PACKED_BY_VENDOR,
        comment: 'Carefully packed with premium packaging',
        updatedBy: 'vendor_003',
        updatedByType: 'vendor',
        timestamp: '2024-01-31T10:30:00Z'
      },
      {
        id: 'hist_9',
        status: OrderStatus.IN_TRANSIT_TO_ADMIN_HUB,
        comment: 'Express shipping to Admin Hub',
        updatedBy: 'vendor_003',
        updatedByType: 'vendor',
        timestamp: '2024-01-31T13:00:00Z'
      },
      {
        id: 'hist_10',
        status: OrderStatus.RECEIVED_AT_ADMIN_HUB,
        comment: 'Package received and logged',
        updatedByType: 'system',
        timestamp: '2024-02-02T09:00:00Z'
      },
      {
        id: 'hist_11',
        status: OrderStatus.APPROVED_BY_ADMIN_HUB,
        comment: 'Quality check passed - approved for customer shipment',
        updatedBy: 'admin_001',
        updatedByType: 'admin',
        timestamp: '2024-02-03T15:45:00Z'
      }
    ],
    orderDate: '2024-01-30T14:20:00Z',
    estimatedDelivery: '2024-02-08T00:00:00Z'
  },
  {
    id: '3',
    orderId: 'ORD-2024-003',
    customerId: 'cust_003',
    customerName: 'Michael Brown',
    customerEmail: 'michael.brown@email.com',
    customerPhone: '+1-555-0789',
    shippingAddress: {
      name: 'Michael Brown',
      address: '789 Pine Street',
      city: 'Chicago',
      state: 'IL',
      zipCode: '60601',
      country: 'USA',
      phone: '+1-555-0789'
    },
    items: [
      {
        id: 'item_4',
        productId: 'prod_004',
        productName: 'Cotton Bed Sheet Set',
        productImage: '/assets/images/features/products/tb1.jpg',
        size: 'Queen',
        color: 'Navy Blue',
        sku: 'BEDSHEET-NB-Q',
        quantity: 1,
        unitPrice: 75.00,
        totalPrice: 75.00,
        vendorId: 'vendor_001',
        vendorName: 'TextileCorp Manufacturing'
      }
    ],
    subtotal: 75.00,
    shippingCost: 9.99,
    tax: 6.00,
    discount: 7.50,
    totalAmount: 83.49,
    paymentStatus: PaymentStatus.PAID,
    paymentMethod: 'Debit Card',
    paymentId: 'pay_1122334455',
    status: OrderStatus.SHIPPED_TO_CUSTOMER,
    trackingReference: 'TRK-CUST-003',
    vendorId: 'vendor_001',
    adminReview: {
      id: 'review_2',
      reviewComments: 'Good quality cotton sheets. Minor packaging issue noted.',
      qualityCheckNotes: 'Fabric quality is good. One corner slightly wrinkled but acceptable.',
      rating: 4,
      approved: true,
      reviewedBy: 'admin_002',
      reviewedAt: '2024-01-28T11:20:00Z',
      returnToVendor: false
    },
    statusHistory: [
      {
        id: 'hist_12',
        status: OrderStatus.ORDER_CREATED,
        comment: 'Order placed by customer',
        updatedByType: 'system',
        timestamp: '2024-01-25T09:15:00Z'
      },
      {
        id: 'hist_13',
        status: OrderStatus.VENDOR_PROCESSING,
        comment: 'Processing order',
        updatedBy: 'vendor_001',
        updatedByType: 'vendor',
        timestamp: '2024-01-25T10:30:00Z'
      },
      {
        id: 'hist_14',
        status: OrderStatus.PACKED_BY_VENDOR,
        comment: 'Packed and ready for shipment',
        updatedBy: 'vendor_001',
        updatedByType: 'vendor',
        timestamp: '2024-01-26T14:00:00Z'
      },
      {
        id: 'hist_15',
        status: OrderStatus.IN_TRANSIT_TO_ADMIN_HUB,
        comment: 'Shipped to Admin Hub',
        updatedBy: 'vendor_001',
        updatedByType: 'vendor',
        timestamp: '2024-01-26T16:30:00Z'
      },
      {
        id: 'hist_16',
        status: OrderStatus.RECEIVED_AT_ADMIN_HUB,
        comment: 'Received at Admin Hub',
        updatedByType: 'system',
        timestamp: '2024-01-28T08:00:00Z'
      },
      {
        id: 'hist_17',
        status: OrderStatus.APPROVED_BY_ADMIN_HUB,
        comment: 'Quality check completed and approved',
        updatedBy: 'admin_002',
        updatedByType: 'admin',
        timestamp: '2024-01-28T11:20:00Z'
      },
      {
        id: 'hist_18',
        status: OrderStatus.SHIPPED_TO_CUSTOMER,
        comment: 'Shipped to customer via express delivery',
        updatedBy: 'admin_002',
        updatedByType: 'admin',
        timestamp: '2024-01-28T15:00:00Z'
      }
    ],
    orderDate: '2024-01-25T09:15:00Z',
    estimatedDelivery: '2024-02-02T00:00:00Z'
  },
  {
    id: '4',
    orderId: 'ORD-2024-004',
    customerId: 'cust_004',
    customerName: 'Emily Davis',
    customerEmail: 'emily.davis@email.com',
    customerPhone: '+1-555-0321',
    shippingAddress: {
      name: 'Emily Davis',
      address: '321 Maple Drive',
      city: 'Boston',
      state: 'MA',
      zipCode: '02101',
      country: 'USA',
      phone: '+1-555-0321'
    },
    items: [
      {
        id: 'item_5',
        productId: 'prod_005',
        productName: 'Premium Bath Towel Set',
        productImage: '/assets/images/categories/towels/tc2.jpg',
        size: 'Large',
        color: 'Gray',
        sku: 'BATH-TOWEL-GR-L',
        quantity: 3,
        unitPrice: 35.00,
        totalPrice: 105.00,
        vendorId: 'vendor_001',
        vendorName: 'TextileCorp Manufacturing'
      },
      {
        id: 'item_6',
        productId: 'prod_006',
        productName: 'Cotton Hand Towels',
        productImage: '/assets/images/categories/towels/tc3.jpg',
        size: 'Medium',
        color: 'White',
        sku: 'HAND-TOWEL-WH-M',
        quantity: 5,
        unitPrice: 15.00,
        totalPrice: 75.00,
        vendorId: 'vendor_001',
        vendorName: 'TextileCorp Manufacturing'
      }
    ],
    subtotal: 180.00,
    shippingCost: 10.99,
    tax: 14.40,
    discount: 0,
    totalAmount: 205.39,
    paymentStatus: PaymentStatus.PAID,
    paymentMethod: 'Credit Card',
    paymentId: 'pay_5566778899',
    status: OrderStatus.PACKED_BY_VENDOR,
    vendorId: 'vendor_001',
    statusHistory: [
      {
        id: 'hist_19',
        status: OrderStatus.ORDER_CREATED,
        comment: 'Order placed by customer',
        updatedByType: 'system',
        timestamp: '2024-02-05T08:00:00Z'
      },
      {
        id: 'hist_20',
        status: OrderStatus.VENDOR_PROCESSING,
        comment: 'Order confirmed and processing',
        updatedBy: 'vendor_001',
        updatedByType: 'vendor',
        timestamp: '2024-02-05T09:30:00Z'
      },
      {
        id: 'hist_21',
        status: OrderStatus.PACKED_BY_VENDOR,
        comment: 'All items packed and ready for shipment to Admin Hub',
        updatedBy: 'vendor_001',
        updatedByType: 'vendor',
        timestamp: '2024-02-06T10:15:00Z'
      }
    ],
    orderDate: '2024-02-05T08:00:00Z',
    estimatedDelivery: '2024-02-15T00:00:00Z'
  },
  {
    id: '5',
    orderId: 'ORD-2024-005',
    customerId: 'cust_005',
    customerName: 'Robert Wilson',
    customerEmail: 'robert.wilson@email.com',
    customerPhone: '+1-555-0654',
    shippingAddress: {
      name: 'Robert Wilson',
      address: '555 Oak Street, Suite 200',
      city: 'Seattle',
      state: 'WA',
      zipCode: '98101',
      country: 'USA',
      phone: '+1-555-0654'
    },
    items: [
      {
        id: 'item_7',
        productId: 'prod_007',
        productName: 'Luxury Cotton Bedding Set',
        productImage: '/assets/images/features/products/tb2.jpg',
        size: 'King',
        color: 'Ivory',
        sku: 'BED-SET-IV-K',
        quantity: 1,
        unitPrice: 120.00,
        totalPrice: 120.00,
        vendorId: 'vendor_001',
        vendorName: 'TextileCorp Manufacturing'
      }
    ],
    subtotal: 120.00,
    shippingCost: 12.99,
    tax: 9.60,
    discount: 10.00,
    totalAmount: 132.59,
    paymentStatus: PaymentStatus.PAID,
    paymentMethod: 'PayPal',
    paymentId: 'pay_9988776655',
    status: OrderStatus.PACKED_BY_VENDOR,
    vendorId: 'vendor_001',
    statusHistory: [
      {
        id: 'hist_22',
        status: OrderStatus.ORDER_CREATED,
        comment: 'Order placed by customer',
        updatedByType: 'system',
        timestamp: '2024-02-06T09:00:00Z'
      },
      {
        id: 'hist_23',
        status: OrderStatus.VENDOR_PROCESSING,
        comment: 'Order confirmed and processing',
        updatedBy: 'vendor_001',
        updatedByType: 'vendor',
        timestamp: '2024-02-06T10:00:00Z'
      },
      {
        id: 'hist_24',
        status: OrderStatus.PACKED_BY_VENDOR,
        comment: 'Luxury bedding set carefully packed',
        updatedBy: 'vendor_001',
        updatedByType: 'vendor',
        timestamp: '2024-02-06T14:30:00Z'
      }
    ],
    orderDate: '2024-02-06T09:00:00Z',
    estimatedDelivery: '2024-02-16T00:00:00Z'
  },
  {
    id: '6',
    orderId: 'ORD-2024-006',
    customerId: 'cust_006',
    customerName: 'Jennifer Martinez',
    customerEmail: 'jennifer.martinez@email.com',
    customerPhone: '+1-555-0987',
    shippingAddress: {
      name: 'Jennifer Martinez',
      address: '789 Elm Avenue, Apt 12',
      city: 'Miami',
      state: 'FL',
      zipCode: '33101',
      country: 'USA',
      phone: '+1-555-0987'
    },
    items: [
      {
        id: 'item_8',
        productId: 'prod_008',
        productName: 'Premium Cotton T-Shirt Pack',
        productImage: '/assets/images/features/products/fp2.jpg',
        size: 'M',
        color: 'Assorted',
        sku: 'TSHIRT-PACK-AS-M',
        quantity: 3,
        unitPrice: 29.99,
        totalPrice: 89.97,
        vendorId: 'vendor_001',
        vendorName: 'TextileCorp Manufacturing'
      },
      {
        id: 'item_9',
        productId: 'prod_009',
        productName: 'Cotton Polo Shirt',
        productImage: '/assets/images/features/products/fp4.jpg',
        size: 'L',
        color: 'Navy',
        sku: 'POLO-NV-L',
        quantity: 2,
        unitPrice: 39.99,
        totalPrice: 79.98,
        vendorId: 'vendor_001',
        vendorName: 'TextileCorp Manufacturing'
      }
    ],
    subtotal: 169.95,
    shippingCost: 11.99,
    tax: 13.60,
    discount: 0,
    totalAmount: 195.54,
    paymentStatus: PaymentStatus.PAID,
    paymentMethod: 'Credit Card',
    paymentId: 'pay_4455667788',
    status: OrderStatus.PACKED_BY_VENDOR,
    vendorId: 'vendor_001',
    statusHistory: [
      {
        id: 'hist_25',
        status: OrderStatus.ORDER_CREATED,
        comment: 'Order placed by customer',
        updatedByType: 'system',
        timestamp: '2024-02-06T11:00:00Z'
      },
      {
        id: 'hist_26',
        status: OrderStatus.VENDOR_PROCESSING,
        comment: 'Processing multiple items',
        updatedBy: 'vendor_001',
        updatedByType: 'vendor',
        timestamp: '2024-02-06T12:00:00Z'
      },
      {
        id: 'hist_27',
        status: OrderStatus.PACKED_BY_VENDOR,
        comment: 'All items packed and ready',
        updatedBy: 'vendor_001',
        updatedByType: 'vendor',
        timestamp: '2024-02-06T15:45:00Z'
      }
    ],
    orderDate: '2024-02-06T11:00:00Z',
    estimatedDelivery: '2024-02-16T00:00:00Z'
  },
  {
    id: '7',
    orderId: 'ORD-2024-007',
    customerId: 'cust_007',
    customerName: 'David Thompson',
    customerEmail: 'david.thompson@email.com',
    customerPhone: '+1-555-0246',
    shippingAddress: {
      name: 'David Thompson',
      address: '321 Pine Road',
      city: 'Denver',
      state: 'CO',
      zipCode: '80201',
      country: 'USA',
      phone: '+1-555-0246'
    },
    items: [
      {
        id: 'item_10',
        productId: 'prod_010',
        productName: 'Organic Bath Towel Collection',
        productImage: '/assets/images/categories/towels/tc4.webp',
        size: 'Large',
        color: 'Beige',
        sku: 'BATH-COLL-BG-L',
        quantity: 4,
        unitPrice: 42.00,
        totalPrice: 168.00,
        vendorId: 'vendor_001',
        vendorName: 'TextileCorp Manufacturing'
      }
    ],
    subtotal: 168.00,
    shippingCost: 13.99,
    tax: 13.44,
    discount: 15.00,
    totalAmount: 180.43,
    paymentStatus: PaymentStatus.PAID,
    paymentMethod: 'Debit Card',
    paymentId: 'pay_7788990011',
    status: OrderStatus.PACKED_BY_VENDOR,
    vendorId: 'vendor_001',
    statusHistory: [
      {
        id: 'hist_28',
        status: OrderStatus.ORDER_CREATED,
        comment: 'Bulk order placed',
        updatedByType: 'system',
        timestamp: '2024-02-06T13:00:00Z'
      },
      {
        id: 'hist_29',
        status: OrderStatus.VENDOR_PROCESSING,
        comment: 'Processing bulk order',
        updatedBy: 'vendor_001',
        updatedByType: 'vendor',
        timestamp: '2024-02-06T13:30:00Z'
      },
      {
        id: 'hist_30',
        status: OrderStatus.PACKED_BY_VENDOR,
        comment: 'Bulk items securely packed',
        updatedBy: 'vendor_001',
        updatedByType: 'vendor',
        timestamp: '2024-02-06T16:00:00Z'
      }
    ],
    orderDate: '2024-02-06T13:00:00Z',
    estimatedDelivery: '2024-02-16T00:00:00Z'
  },
  {
    id: '8',
    orderId: 'ORD-2024-008',
    customerId: 'cust_008',
    customerName: 'Lisa Anderson',
    customerEmail: 'lisa.anderson@email.com',
    customerPhone: '+1-555-0135',
    shippingAddress: {
      name: 'Lisa Anderson',
      address: '654 Birch Lane',
      city: 'Portland',
      state: 'OR',
      zipCode: '97201',
      country: 'USA',
      phone: '+1-555-0135'
    },
    items: [
      {
        id: 'item_11',
        productId: 'prod_011',
        productName: 'Cotton Kitchen Towel Set',
        productImage: '/assets/images/categories/towels/tc5.jpg',
        size: 'Standard',
        color: 'Multi-Color',
        sku: 'KITCHEN-SET-MC-STD',
        quantity: 2,
        unitPrice: 24.99,
        totalPrice: 49.98,
        vendorId: 'vendor_001',
        vendorName: 'TextileCorp Manufacturing'
      },
      {
        id: 'item_12',
        productId: 'prod_012',
        productName: 'Premium Face Towel Pack',
        productImage: '/assets/images/categories/towels/tc6.webp',
        size: 'Small',
        color: 'White',
        sku: 'FACE-PACK-WH-S',
        quantity: 3,
        unitPrice: 18.99,
        totalPrice: 56.97,
        vendorId: 'vendor_001',
        vendorName: 'TextileCorp Manufacturing'
      }
    ],
    subtotal: 106.95,
    shippingCost: 9.99,
    tax: 8.56,
    discount: 5.00,
    totalAmount: 120.50,
    paymentStatus: PaymentStatus.PAID,
    paymentMethod: 'Credit Card',
    paymentId: 'pay_2233445566',
    status: OrderStatus.PACKED_BY_VENDOR,
    vendorId: 'vendor_001',
    statusHistory: [
      {
        id: 'hist_31',
        status: OrderStatus.ORDER_CREATED,
        comment: 'Order placed by customer',
        updatedByType: 'system',
        timestamp: '2024-02-06T14:00:00Z'
      },
      {
        id: 'hist_32',
        status: OrderStatus.VENDOR_PROCESSING,
        comment: 'Processing towel sets',
        updatedBy: 'vendor_001',
        updatedByType: 'vendor',
        timestamp: '2024-02-06T14:45:00Z'
      },
      {
        id: 'hist_33',
        status: OrderStatus.PACKED_BY_VENDOR,
        comment: 'Towel sets packed and ready',
        updatedBy: 'vendor_001',
        updatedByType: 'vendor',
        timestamp: '2024-02-06T16:30:00Z'
      }
    ],
    orderDate: '2024-02-06T14:00:00Z',
    estimatedDelivery: '2024-02-16T00:00:00Z'
  }
];

// Helper functions
export const getStatusColor = (status: OrderStatus): string => {
  switch (status) {
    case OrderStatus.ORDER_CREATED:
      return 'bg-blue-100 text-blue-800';
    case OrderStatus.VENDOR_PROCESSING:
      return 'bg-yellow-100 text-yellow-800';
    case OrderStatus.PACKED_BY_VENDOR:
      return 'bg-purple-100 text-purple-800';
    case OrderStatus.IN_TRANSIT_TO_ADMIN_HUB:
      return 'bg-orange-100 text-orange-800';
    case OrderStatus.RECEIVED_AT_ADMIN_HUB:
      return 'bg-indigo-100 text-indigo-800';
    case OrderStatus.APPROVED_BY_ADMIN_HUB:
      return 'bg-green-100 text-green-800';
    case OrderStatus.REJECTED_BY_ADMIN_HUB:
      return 'bg-red-100 text-red-800';
    case OrderStatus.SHIPPED_TO_CUSTOMER:
      return 'bg-teal-100 text-teal-800';
    case OrderStatus.DELIVERED:
      return 'bg-emerald-100 text-emerald-800';
    case OrderStatus.CANCELLED:
      return 'bg-gray-100 text-gray-800';
    case OrderStatus.RETURNED:
      return 'bg-pink-100 text-pink-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

export const getStatusLabel = (status: OrderStatus): string => {
  switch (status) {
    case OrderStatus.ORDER_CREATED:
      return 'Order Created';
    case OrderStatus.VENDOR_PROCESSING:
      return 'Vendor Processing';
    case OrderStatus.PACKED_BY_VENDOR:
      return 'Packed by Vendor';
    case OrderStatus.IN_TRANSIT_TO_ADMIN_HUB:
      return 'In Transit to Admin Hub';
    case OrderStatus.RECEIVED_AT_ADMIN_HUB:
      return 'Received at Admin Hub';
    case OrderStatus.APPROVED_BY_ADMIN_HUB:
      return 'Approved by Admin Hub';
    case OrderStatus.REJECTED_BY_ADMIN_HUB:
      return 'Rejected by Admin Hub';
    case OrderStatus.SHIPPED_TO_CUSTOMER:
      return 'Shipped to Customer';
    case OrderStatus.DELIVERED:
      return 'Delivered';
    case OrderStatus.CANCELLED:
      return 'Cancelled';
    case OrderStatus.RETURNED:
      return 'Returned';
    default:
      return status;
  }
};

export const getPaymentStatusColor = (status: PaymentStatus): string => {
  switch (status) {
    case PaymentStatus.PAID:
      return 'bg-green-100 text-green-800';
    case PaymentStatus.PENDING:
      return 'bg-yellow-100 text-yellow-800';
    case PaymentStatus.FAILED:
      return 'bg-red-100 text-red-800';
    case PaymentStatus.REFUNDED:
      return 'bg-blue-100 text-blue-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};