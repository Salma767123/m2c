interface CustomerOrderItem {
  id: string;
  productName: string;
  sku: string;
  quantity: number;
  price: number;
  total: number;
  variant?: string;
  image?: string;
}

interface ShippingAddress {
  name: string;
  addressLine1: string;
  addressLine2?: string;
  landmark?: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  phone: string;
}

interface CustomerOrder {
  id: string;
  orderNumber: string;
  customer: {
    id: string;
    name: string;
    email: string;
    phone: string;
    loyaltyTier?: 'Bronze' | 'Silver' | 'Gold' | 'Platinum';
    totalOrders?: number;
  };
  vendor: {
    id: string;
    name: string;
  };
  items: CustomerOrderItem[];
  subtotal: number;
  shipping: number;
  tax: number;
  total: number;
  status: 'pending' | 'confirmed' | 'processing' | 'shipped_to_hub' | 'at_hub' | 'hub_quality_check' | 'hub_approved' | 'shipped_to_customer' | 'delivered' | 'cancelled';
  paymentStatus: 'pending' | 'paid' | 'failed';
  shippingAddress: ShippingAddress;
  billingAddress?: ShippingAddress;
  trackingNumber?: string;
  shippingCarrier?: string;
  estimatedDelivery?: string;
  actualDelivery?: string;
  returnReason?: string;
  customerNotes?: string;
  adminNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export const generateInvoiceHTML = (order: CustomerOrder): string => {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Shipment Invoice - ${order.orderNumber}</title>
        <style>
          body { 
            font-family: Arial, sans-serif; 
            margin: 0; 
            padding: 20px; 
            color: #333;
          }
          .header { 
            text-align: center; 
            margin-bottom: 30px; 
            border-bottom: 2px solid #333;
            padding-bottom: 20px;
          }
          .company-name { 
            font-size: 28px; 
            font-weight: bold; 
            color: #1f2937;
            margin-bottom: 5px;
          }
          .company-details { 
            font-size: 14px; 
            color: #6b7280;
            line-height: 1.4;
          }
          .invoice-title { 
            font-size: 24px; 
            font-weight: bold; 
            text-align: center; 
            margin: 30px 0;
            color: #1f2937;
          }
          .order-info { 
            display: flex; 
            justify-content: space-between; 
            margin-bottom: 30px;
          }
          .order-details, .shipping-details { 
            width: 48%;
          }
          .section-title { 
            font-size: 16px; 
            font-weight: bold; 
            margin-bottom: 10px;
            color: #374151;
            border-bottom: 1px solid #e5e7eb;
            padding-bottom: 5px;
          }
          .detail-row { 
            margin-bottom: 5px; 
            font-size: 14px;
          }
          .detail-label { 
            font-weight: bold; 
            display: inline-block; 
            width: 120px;
          }
          .items-table { 
            width: 100%; 
            border-collapse: collapse; 
            margin: 30px 0;
          }
          .items-table th, .items-table td { 
            border: 1px solid #d1d5db; 
            padding: 12px; 
            text-align: left;
          }
          .items-table th { 
            background-color: #f9fafb; 
            font-weight: bold;
            color: #374151;
          }
          .items-table tr:nth-child(even) { 
            background-color: #f9fafb;
          }
          .total-section { 
            margin-top: 30px; 
            text-align: right;
          }
          .total-row { 
            margin-bottom: 8px; 
            font-size: 14px;
          }
          .total-final { 
            font-size: 18px; 
            font-weight: bold; 
            border-top: 2px solid #333; 
            padding-top: 10px;
            color: #1f2937;
          }
          .footer { 
            margin-top: 50px; 
            text-align: center; 
            font-size: 12px; 
            color: #6b7280;
            border-top: 1px solid #e5e7eb;
            padding-top: 20px;
          }
          @media print {
            body { margin: 0; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="company-name">M2C Textiles</div>
          <div class="company-details">
            123 Business Avenue, Suite 100<br>
            New York, NY 10001<br>
            Phone: (555) 123-4567 | Email: orders@m2ctextiles.com
          </div>
        </div>

        <div class="invoice-title">SHIPMENT INVOICE</div>

        <div class="order-info">
          <div class="order-details">
            <div class="section-title">Order Information</div>
            <div class="detail-row">
              <span class="detail-label">Order Number:</span>
              ${order.orderNumber}
            </div>
            <div class="detail-row">
              <span class="detail-label">Order Date:</span>
              ${new Date(order.createdAt).toLocaleDateString()}
            </div>
            <div class="detail-row">
              <span class="detail-label">Status:</span>
              ${order.status.charAt(0).toUpperCase() + order.status.slice(1)}
            </div>
            <div class="detail-row">
              <span class="detail-label">Payment:</span>
              ${order.paymentStatus.charAt(0).toUpperCase() + order.paymentStatus.slice(1)}
            </div>
          </div>

          <div class="shipping-details">
            <div class="section-title">Shipping Address</div>
            <div class="detail-row">
              <span class="detail-label">Name:</span>
              ${order.shippingAddress.name}
            </div>
            <div class="detail-row">
              <span class="detail-label">Address Line 1:</span>
              ${order.shippingAddress.addressLine1}
            </div>
            ${order.shippingAddress.addressLine2 ? `
            <div class="detail-row">
              <span class="detail-label">Address Line 2:</span>
              ${order.shippingAddress.addressLine2}
            </div>
            ` : ''}
            ${order.shippingAddress.landmark ? `
            <div class="detail-row">
              <span class="detail-label">Landmark:</span>
              ${order.shippingAddress.landmark}
            </div>
            ` : ''}
            <div class="detail-row">
              <span class="detail-label">City:</span>
              ${order.shippingAddress.city}, ${order.shippingAddress.state} ${order.shippingAddress.zipCode}
            </div>
            <div class="detail-row">
              <span class="detail-label">Country:</span>
              ${order.shippingAddress.country}
            </div>
            <div class="detail-row">
              <span class="detail-label">Phone:</span>
              ${order.shippingAddress.phone}
            </div>
          </div>
        </div>

        <table class="items-table">
          <thead>
            <tr>
              <th>Item Description</th>
              <th>SKU</th>
              <th>Quantity</th>
              <th>Unit Price</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            ${order.items.map(item => `
              <tr>
                <td>
                  ${item.productName}
                  ${item.variant ? `<br><small style="color: #6b7280;">${item.variant}</small>` : ''}
                </td>
                <td>${item.sku}</td>
                <td>${item.quantity}</td>
                <td>$${item.price.toFixed(2)}</td>
                <td>$${item.total.toFixed(2)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="total-section">
          <div class="total-row">
            <strong>Subtotal: $${order.subtotal.toFixed(2)}</strong>
          </div>
          <div class="total-row">
            <strong>Shipping: $${order.shipping.toFixed(2)}</strong>
          </div>
          <div class="total-row">
            <strong>Tax: $${order.tax.toFixed(2)}</strong>
          </div>
          <div class="total-final">
            <strong>Total Amount: $${order.total.toFixed(2)}</strong>
          </div>
        </div>

        ${order.customerNotes ? `
          <div style="margin-top: 30px;">
            <div class="section-title">Special Instructions</div>
            <div style="font-size: 14px; padding: 10px; background-color: #f9fafb; border-left: 4px solid #3b82f6;">
              ${order.customerNotes}
            </div>
          </div>
        ` : ''}

        <div class="footer">
          <p>Thank you for your business!</p>
          <p>This is a computer-generated invoice. No signature required.</p>
          <p>Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
        </div>
      </body>
    </html>
  `;
};

export const printInvoice = (order: CustomerOrder): void => {
  // This function is now deprecated in favor of iframe-based printing
  // Kept for backward compatibility
  console.warn('printInvoice function is deprecated. Use iframe-based printing instead.');
};