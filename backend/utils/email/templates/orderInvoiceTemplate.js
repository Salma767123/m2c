/**
 * Customer Order Invoice Template
 * ─────────────────────────────────────────────────────────────────────────────
 * Generates a professional invoice HTML for customer orders.
 * Uses the invoiceNo generated from InvoiceSettings.
 *
 * Usage:
 *   const { getOrderInvoiceHTML } = require('./orderInvoiceTemplate');
 *   const html = getOrderInvoiceHTML(order, adminSettings);
 */

const { Country, State } = require('country-state-city');
const { parsePhoneNumberFromString } = require('libphonenumber-js');

// Escape user-supplied strings before interpolating into the invoice HTML.
// Defense-in-depth: customerName / recipient / address / item fields all flow from
// DB writes which are validated, but an XSS payload that ever slipped past validation
// (or a future API endpoint with weaker checks) would otherwise render as live HTML
// in customers' inboxes. Numbers/booleans pass through unchanged.
const escapeHtml = (value) => {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
};

// Format a stored phone (typically E.164 like "+919876543210") for human display.
const formatPhoneForDisplay = (value, defaultCountry) => {
  if (!value) return '';
  const trimmed = String(value).trim();
  if (!trimmed) return '';
  try {
    const parsed = trimmed.startsWith('+')
      ? parsePhoneNumberFromString(trimmed)
      : parsePhoneNumberFromString(trimmed, (defaultCountry || 'IN').toUpperCase());
    if (parsed && parsed.isValid()) return parsed.formatInternational();
    if (parsed) return parsed.formatNational();
    return trimmed;
  } catch {
    return trimmed;
  }
};

// Resolve a country value (ISO-2 code or legacy display name) to its display name + flag.
const resolveCountry = (value) => {
  if (!value) return { name: '', flag: '' };
  const trimmed = String(value).trim();
  const upper = trimmed.toUpperCase();
  const byIso = Country.getCountryByCode(upper);
  if (byIso) return { name: byIso.name, flag: byIso.flag };
  const byName = Country.getAllCountries().find(
    (c) => c.name.toLowerCase() === trimmed.toLowerCase()
  );
  if (byName) return { name: byName.name, flag: byName.flag };
  return { name: trimmed, flag: '' };
};

// Resolve a state ISO code to its display name when possible.
const resolveStateName = (stateValue, countryValue) => {
  if (!stateValue) return '';
  const trimmed = String(stateValue).trim();
  const countryIso = (() => {
    if (!countryValue) return null;
    const c = String(countryValue).trim();
    const upper = c.toUpperCase();
    if (Country.getCountryByCode(upper)) return upper;
    const byName = Country.getAllCountries().find(
      (x) => x.name.toLowerCase() === c.toLowerCase()
    );
    return byName ? byName.isoCode : null;
  })();
  if (!countryIso) return trimmed;
  const found = State.getStateByCodeAndCountry(trimmed.toUpperCase(), countryIso);
  return found ? found.name : trimmed;
};

/**
 * Build the full invoice HTML for an order.
 *
 * @param {object} order         - Prisma Order object (includes items[])
 * @param {object} adminSettings - Admin profile: { companyName, gstNumber, address, state, country, currency }
 * @param {boolean} isForPDF     - True = strip email-only banners for PDF/print
 */
const getOrderInvoiceHTML = (order, adminSettings = {}, isForPDF = false) => {
  const {
    invoiceNo,
    orderId,
    orderDate,
    customerName,
    customerEmail,
    customerPhone,
    shippingAddress = {},
    items = [],
    subtotal = 0,
    shippingCost = 0,
    tax = 0,
    discount = 0,
    totalAmount = 0,
    bagTypeName,
    bagTypePrice = 0,
    paymentMethod,
    paymentStatus,
  } = order;

  let {
    companyName = 'M2C Store',
    companyLogo = '',
    gstNumber = '',
    address = '',
    state = '',
    country = 'United States',
    currency = '$',
  } = adminSettings;

  // Fallback to website logo if no custom company logo is set
  if (!companyLogo) {
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    companyLogo = `${baseUrl}/assets/logo/logo2.png`;
  }


  const sym = currency === 'INR' ? '₹' : currency;

  const fmt = (n) =>
    Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const fmtDate = (d) =>
    new Date(d).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });

  const addr = typeof shippingAddress === 'string'
    ? JSON.parse(shippingAddress)
    : shippingAddress;

  const resolvedCountry = resolveCountry(addr.country);
  const resolvedStateName = resolveStateName(addr.state, addr.country);

  // Recipient (= the person physically receiving the package).
  // Distinct from customerName (the account holder / payer).
  const recipientName = addr.firstName && addr.lastName
    ? `${addr.firstName} ${addr.lastName}`
    : addr.firstName || addr.name || '';

  const cityStateLine = [addr.city, resolvedStateName].filter(Boolean).join(', ');
  const countryLine = resolvedCountry.name ? `${resolvedCountry.name} ${resolvedCountry.flag}`.trim() : '';

  // Address-only block (recipient is rendered separately as the heading line).
  const shippingAddrStr = [
    addr.street || addr.addressLine1,
    addr.addressLine2,
    cityStateLine,
    addr.zipCode || addr.pincode,
    countryLine,
  ].filter(Boolean).join('\n');

  const payStatusColor = paymentStatus === 'PAID' ? '#16a34a' : '#dc2626';
  const payStatusLabel = paymentStatus === 'PAID' ? 'PAID' : paymentStatus;

  const itemRows = items.map((item, i) => `
        <tr>
            <td style="padding:10px 8px; border-bottom:1px solid #e5e7eb; text-align:center; color:#6b7280;">${i + 1}</td>
            <td style="padding:10px 8px; border-bottom:1px solid #e5e7eb;">
                <div style="font-weight:600; color:#111827;">${escapeHtml(item.productName)}</div>
                ${item.sku ? `<div style="font-size:11px; color:#9ca3af;">SKU: ${escapeHtml(item.sku)}</div>` : ''}
                ${item.size ? `<div style="font-size:11px; color:#9ca3af;">Size: ${escapeHtml(item.size)}</div>` : ''}
                ${item.color ? `<div style="font-size:11px; color:#9ca3af;">Color: ${escapeHtml(item.color)}</div>` : ''}
            </td>
            <td style="padding:10px 8px; border-bottom:1px solid #e5e7eb; text-align:center;">${item.quantity}</td>
            <td style="padding:10px 8px; border-bottom:1px solid #e5e7eb; text-align:right;">${sym}${fmt(item.unitPrice)}</td>
            <td style="padding:10px 8px; border-bottom:1px solid #e5e7eb; text-align:right; font-weight:600;">${sym}${fmt(item.totalPrice)}</td>
        </tr>
    `).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invoice ${escapeHtml(invoiceNo || orderId)}</title>
</head>
<body style="margin:0; padding:0; font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif; background:#f3f4f6; color:#374151;">
  <div style="max-width:800px; margin:24px auto; background:#fff; border-radius:12px; overflow:hidden; box-shadow:0 4px 24px rgba(0,0,0,0.08);">

    <!-- ── Header ── -->
    <div style="background:#111827; padding:32px 36px; display:flex; justify-content:space-between; align-items:flex-start;">
      <div style="display:flex; align-items:center; gap:16px;">
        ${companyLogo ? `
        <img
          src="${companyLogo}"
          alt="${escapeHtml(companyName)} logo"
          style="height:64px; width:auto; object-fit:contain; border-radius:8px;"
        />` : ''}
        <div>
          ${(companyName !== 'M2C Store' && companyName !== 'M2C Marketplace Pvt Ltd') ? `<div style="font-size:26px; font-weight:800; color:#fff; letter-spacing:-0.5px; margin-bottom:4px;">${escapeHtml(companyName)}</div>` : ''}
          ${gstNumber ? `<div style="font-size:12px; color:#9ca3af; margin-top:2px;">GSTIN: ${escapeHtml(gstNumber)}</div>` : ''}
          ${address ? `<div style="font-size:12px; color:#9ca3af; margin-top:2px;">${escapeHtml(address)}</div>` : ''}
        </div>
      </div>
      <div style="text-align:right;">
        <div style="font-size:22px; font-weight:700; color:#fff;">INVOICE</div>
        <div style="font-size:18px; font-weight:600; color:#6366f1; margin-top:4px; letter-spacing:1px;">${escapeHtml(invoiceNo || orderId)}</div>
        <div style="font-size:12px; color:#9ca3af; margin-top:6px;">Date: ${fmtDate(orderDate)}</div>
        <div style="display:inline-block; margin-top:8px; padding:4px 12px; background:${payStatusColor}; color:#fff; border-radius:20px; font-size:11px; font-weight:700; letter-spacing:0.5px;">${escapeHtml(payStatusLabel)}</div>
      </div>
    </div>

    <!-- ── Bill To / Ship To / Order Info — standard 3-section invoice header ── -->
    <div style="display:flex; gap:0; border-bottom:1px solid #e5e7eb;">
      <div style="flex:1; padding:24px 36px; border-right:1px solid #e5e7eb;">
        <div style="font-size:11px; font-weight:700; color:#6b7280; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:10px;">Bill To</div>
        <div style="font-weight:700; font-size:15px; color:#111827;">${escapeHtml(customerName)}</div>
        <div style="font-size:13px; color:#6b7280; margin-top:4px;">${escapeHtml(customerEmail)}</div>
        <div style="font-size:13px; color:#6b7280;">${escapeHtml(formatPhoneForDisplay(customerPhone, addr.country))}</div>
      </div>
      <div style="flex:1; padding:24px 36px; border-right:1px solid #e5e7eb;">
        <div style="font-size:11px; font-weight:700; color:#6b7280; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:10px;">Ship To</div>
        ${recipientName
          ? `<div style="font-weight:700; font-size:15px; color:#111827;">${escapeHtml(recipientName)}</div>`
          : '<div style="font-size:13px; color:#9ca3af; font-style:italic;">Same as billing</div>'}
        ${shippingAddrStr
          ? `<div style="font-size:13px; color:#6b7280; margin-top:4px; white-space:pre-line;">${escapeHtml(shippingAddrStr)}</div>`
          : ''}
      </div>
      <div style="flex:1; padding:24px 36px;">
        <div style="font-size:11px; font-weight:700; color:#6b7280; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:10px;">Order Details</div>
        <table style="width:100%; font-size:13px; border-collapse:collapse;">
          <tr>
            <td style="padding:3px 0; color:#6b7280;">Order ID</td>
            <td style="padding:3px 0; text-align:right; font-weight:600; color:#111827;">${escapeHtml(orderId)}</td>
          </tr>
          <tr>
            <td style="padding:3px 0; color:#6b7280;">Invoice No</td>
            <td style="padding:3px 0; text-align:right; font-weight:700; color:#6366f1;">${escapeHtml(invoiceNo || '—')}</td>
          </tr>
          <tr>
            <td style="padding:3px 0; color:#6b7280;">Order Date</td>
            <td style="padding:3px 0; text-align:right; font-weight:600; color:#111827;">${fmtDate(orderDate)}</td>
          </tr>
          <tr>
            <td style="padding:3px 0; color:#6b7280;">Payment</td>
            <td style="padding:3px 0; text-align:right; font-weight:600; color:#111827;">${escapeHtml(paymentMethod || '—')}</td>
          </tr>
        </table>
      </div>
    </div>

    <!-- ── Items Table ── -->
    <div style="padding:24px 36px;">
      <table style="width:100%; border-collapse:collapse; font-size:13px;">
        <thead>
          <tr style="background:#f9fafb;">
            <th style="padding:10px 8px; text-align:center; font-size:11px; font-weight:700; color:#6b7280; text-transform:uppercase; border-bottom:2px solid #e5e7eb;">#</th>
            <th style="padding:10px 8px; text-align:left; font-size:11px; font-weight:700; color:#6b7280; text-transform:uppercase; border-bottom:2px solid #e5e7eb;">Item</th>
            <th style="padding:10px 8px; text-align:center; font-size:11px; font-weight:700; color:#6b7280; text-transform:uppercase; border-bottom:2px solid #e5e7eb;">Qty</th>
            <th style="padding:10px 8px; text-align:right; font-size:11px; font-weight:700; color:#6b7280; text-transform:uppercase; border-bottom:2px solid #e5e7eb;">Unit Price</th>
            <th style="padding:10px 8px; text-align:right; font-size:11px; font-weight:700; color:#6b7280; text-transform:uppercase; border-bottom:2px solid #e5e7eb;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${itemRows}
        </tbody>
      </table>
    </div>

    <!-- ── Summary ── -->
    <div style="padding:0 36px 32px; display:flex; justify-content:flex-end;">
      <table style="width:280px; font-size:13px; border-collapse:collapse;">
        <tr>
          <td style="padding:6px 0; color:#6b7280;">Subtotal</td>
          <td style="padding:6px 0; text-align:right; font-weight:600;">${sym}${fmt(subtotal)}</td>
        </tr>
        ${shippingCost > 0 ? `
        <tr>
          <td style="padding:6px 0; color:#6b7280;">Shipping</td>
          <td style="padding:6px 0; text-align:right; font-weight:600;">${sym}${fmt(shippingCost)}</td>
        </tr>` : ''}
        ${tax > 0 ? `
        <tr>
          <td style="padding:6px 0; color:#6b7280;">Tax (GST)</td>
          <td style="padding:6px 0; text-align:right; font-weight:600;">${sym}${fmt(tax)}</td>
        </tr>` : ''}
        ${discount > 0 ? `
        <tr>
          <td style="padding:6px 0; color:#16a34a;">Discount</td>
          <td style="padding:6px 0; text-align:right; font-weight:600; color:#16a34a;">− ${sym}${fmt(discount)}</td>
        </tr>` : ''}
        ${bagTypePrice > 0 ? `
        <tr>
          <td style="padding:6px 0; color:#6b7280;">Bag (${escapeHtml(bagTypeName || 'Add-on')})</td>
          <td style="padding:6px 0; text-align:right; font-weight:600;">${sym}${fmt(bagTypePrice)}</td>
        </tr>` : ''}
        <tr style="border-top:2px solid #111827;">
          <td style="padding:10px 0; font-size:16px; font-weight:800; color:#111827;">Grand Total</td>
          <td style="padding:10px 0; text-align:right; font-size:16px; font-weight:800; color:#6366f1;">${sym}${fmt(totalAmount)}</td>
        </tr>
      </table>
    </div>

    <!-- ── Footer ── -->
    <div style="background:#f9fafb; border-top:1px solid #e5e7eb; padding:20px 36px; text-align:center;">
      <div style="font-size:13px; font-weight:600; color:#111827; margin-bottom:4px;">Thank you for shopping with ${escapeHtml(companyName)}!</div>
      <div style="font-size:11px; color:#9ca3af;">This is a computer generated invoice and does not require a signature.</div>
      ${gstNumber ? `<div style="font-size:11px; color:#9ca3af; margin-top:2px;">GSTIN: ${escapeHtml(gstNumber)} | ${escapeHtml(state)}, ${escapeHtml(country)}</div>` : ''}
    </div>
  </div>
</body>
</html>`;
};

/**
 * Email wrapper for the order invoice.
 * Returns { subject, html } for use with sendEmail().
 */
const getOrderInvoiceEmailTemplate = (order, adminSettings = {}) => {
  const { companyName = 'M2C Store' } = adminSettings;
  return {
    subject: `Your Invoice ${order.invoiceNo || order.orderId} from ${companyName}`,
    html: getOrderInvoiceHTML(order, adminSettings, false),
  };
};

module.exports = { getOrderInvoiceHTML, getOrderInvoiceEmailTemplate };
