const { sendTemplatedEmail } = require('../emailTemplateRenderer');
const { buildInvoicePdfBuffer } = require('./invoicePdf');

const publicSite = () => process.env.PUBLIC_SITE_URL || process.env.FRONTEND_URL || 'https://m2cmarkdowns.com';
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/**
 * Email the customer their order confirmation, with the tax-invoice PDF attached.
 * Fire-and-forget from the caller — never blocks or fails the order response.
 *
 * @param {object} order    the created order (with items + address + totals)
 * @param {object} company  { companyName, gstNumber, address, companyLogo }
 */
async function sendOrderConfirmationEmail(order, company = {}) {
  const to = order?.customerEmail;
  if (!to) return { success: false, skipped: 'no customer email' };

  const currency = order.currency === 'USD' ? 'USD' : 'INR';
  const sym = currency === 'INR' ? '₹' : '$';
  const money = (n) => `${sym}${Number(n || 0).toLocaleString(currency === 'INR' ? 'en-IN' : 'en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const items = Array.isArray(order.items) ? order.items : [];
  const itemsSection = [
    `<tr style="background:#f9fafb;"><th align="left" style="padding:10px 16px;color:#6b7280;font-size:12px;">Item</th><th align="center" style="padding:10px 16px;color:#6b7280;font-size:12px;">Qty</th><th align="right" style="padding:10px 16px;color:#6b7280;font-size:12px;">Amount</th></tr>`,
    ...items.map((i) => `<tr style="border-top:1px solid #f0f0ee;"><td style="padding:10px 16px;color:#111827;font-size:13px;">${esc(i.productName || 'Item')}</td><td align="center" style="padding:10px 16px;color:#374151;font-size:13px;">${i.quantity}</td><td align="right" style="padding:10px 16px;color:#111827;font-size:13px;font-weight:600;">${money(i.totalPrice)}</td></tr>`),
  ].join('');

  const discountRow = (order.discount > 0)
    ? `<tr><td style="padding:4px 16px;color:#16a34a;font-size:14px;">Discount</td><td style="padding:4px 16px;color:#16a34a;font-size:14px;text-align:right;">- ${money(order.discount)}</td></tr>`
    : '';

  const addr = order.shippingAddress || {};
  const shippingAddress = [
    addr.name || order.customerName,
    addr.address, addr.addressLine2, addr.addressLine3,
    [addr.city, addr.state, addr.zipCode].filter(Boolean).join(', '),
    addr.country,
  ].filter(Boolean).map(esc).join('<br/>');

  // Best-effort PDF — if generation fails, still send the email without the attachment.
  let attachments = [];
  try {
    const pdf = await buildInvoicePdfBuffer(order, company);
    attachments = [{
      filename: `invoice-${order.invoiceNo || order.orderId || 'order'}.pdf`,
      content: pdf,
      contentType: 'application/pdf',
    }];
  } catch (e) {
    console.warn('[order] invoice PDF generation failed, sending email without attachment:', e.message);
  }

  return sendTemplatedEmail({
    key: 'order_confirmation',
    to,
    attachments,
    data: {
      greetingName: order.customerName || 'Customer',
      orderId: order.orderId || '',
      orderDate: order.createdAt ? new Date(order.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '',
      paymentMethod: order.paymentMethod || '-',
      paymentStatus: order.paymentStatus || '-',
      itemsSection,
      subtotalDisplay: money(order.subtotal),
      discountRow,
      taxDisplay: money(order.tax),
      shippingDisplay: order.shippingCost > 0 ? money(order.shippingCost) : 'Free',
      totalDisplay: money(order.totalAmount),
      shippingAddress,
      trackUrl: `${publicSite()}/order/${order.orderId || ''}`,
    },
  });
}

module.exports = { sendOrderConfirmationEmail };
