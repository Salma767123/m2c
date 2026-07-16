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


  /*
    Currency must come from the ORDER, not the caller's settings. The invoice
    route doesn't pass `currency` at all, so the old `currency = '$'` default
    stamped every invoice as USD — including ₹ orders. Order.currency is the
    authoritative field ("INR" | "USD", defaulted at the DB level).
  */
  const invoiceCurrency = order.currency || (currency === 'INR' ? 'INR' : 'USD');
  const sym = invoiceCurrency === 'INR' ? '₹' : '$';

  // A GST-registered seller must head the document "TAX INVOICE" (standard
  // practice); without a GSTIN it's a plain commercial invoice.
  const invoiceTitle = gstNumber ? 'TAX INVOICE' : 'INVOICE';

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
            <td style="padding:12px 8px; border-bottom:1px solid #f0f0ee; text-align:center; color:#9ca3af; font-size:12px;">${i + 1}</td>
            <td style="padding:12px 8px; border-bottom:1px solid #f0f0ee;">
                <div style="font-weight:600; color:#1a1a1a;">${escapeHtml(item.productName)}</div>
                ${item.sku ? `<div style="font-size:11px; color:#9ca3af; margin-top:2px;">SKU: ${escapeHtml(item.sku)}</div>` : ''}
                ${item.size ? `<div style="font-size:11px; color:#9ca3af;">Size: ${escapeHtml(item.size)}</div>` : ''}
                ${item.color ? `<div style="font-size:11px; color:#9ca3af;">Color: ${escapeHtml(item.color)}</div>` : ''}
            </td>
            <td style="padding:12px 8px; border-bottom:1px solid #f0f0ee; text-align:center;">${item.quantity}</td>
            <td style="padding:12px 8px; border-bottom:1px solid #f0f0ee; text-align:right;">${sym}${fmt(item.unitPrice)}</td>
            <td style="padding:12px 8px; border-bottom:1px solid #f0f0ee; text-align:right; font-weight:700; color:#1a1a1a;">${sym}${fmt(item.totalPrice)}</td>
        </tr>
    `).join('');

  // Summary rows in the order a standard invoice reads:
  // subtotal → add-ons → discount → shipping → tax → grand total.
  // (The previous layout listed Discount *after* Tax, which reads as though the
  //  discount were applied post-tax.)
  const summaryRow = (label, value, opts = {}) => `
        <tr>
          <td style="padding:7px 0; color:${opts.color || '#6b7280'}; font-size:13px;">${label}</td>
          <td style="padding:7px 0; text-align:right; font-weight:600; font-size:13px; color:${opts.color || '#1a1a1a'};">${value}</td>
        </tr>`;

  const summaryRows = [
    summaryRow('Subtotal', `${sym}${fmt(subtotal)}`),
    bagTypePrice > 0 ? summaryRow(`Bag (${escapeHtml(bagTypeName || 'Add-on')})`, `${sym}${fmt(bagTypePrice)}`) : '',
    discount > 0 ? summaryRow('Discount', `− ${sym}${fmt(discount)}`, { color: '#16a34a' }) : '',
    summaryRow('Shipping', shippingCost > 0 ? `${sym}${fmt(shippingCost)}` : 'Free'),
    tax > 0 ? summaryRow(gstNumber ? 'Tax (GST)' : 'Tax', `${sym}${fmt(tax)}`) : '',
  ].join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invoice ${escapeHtml(invoiceNo || orderId)}</title>
</head>
<body style="margin:0; padding:0; font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif; background:#f3f4f6; color:#374151;">
  <div style="max-width:800px; margin:24px auto; background:#fff; border-radius:14px; overflow:hidden; box-shadow:0 4px 24px rgba(0,0,0,0.08);">

    <!-- ── Brand accent bar ── -->
    <div style="height:5px; background:#e01a1b; font-size:0; line-height:0;">&nbsp;</div>

    <!-- ── Header: seller (left) vs invoice meta (right) ──
         Table-based, not flexbox: Outlook and several webmail clients drop
         display:flex entirely and would stack these on top of each other. -->
    <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%; border-collapse:collapse; border-bottom:1px solid #ececea;">
      <tr>
        <td style="padding:28px 36px; vertical-align:top;">
          <table role="presentation" cellpadding="0" cellspacing="0"><tr>
            ${companyLogo ? `
            <td style="vertical-align:middle; padding-right:14px;">
              <img src="${companyLogo}" alt="${escapeHtml(companyName)} logo" style="height:56px; width:auto; object-fit:contain; border-radius:8px; display:block;" />
            </td>` : ''}
            <td style="vertical-align:middle;">
              <div style="font-size:19px; font-weight:800; color:#1a1a1a; letter-spacing:-0.3px;">${escapeHtml(companyName)}</div>
              ${address ? `<div style="font-size:11px; color:#6b7280; margin-top:3px; max-width:260px;">${escapeHtml(address)}</div>` : ''}
              ${(state || country) ? `<div style="font-size:11px; color:#6b7280;">${escapeHtml([state, country].filter(Boolean).join(', '))}</div>` : ''}
              ${gstNumber ? `<div style="font-size:11px; color:#6b7280; margin-top:3px;">GSTIN: <strong style="color:#1a1a1a;">${escapeHtml(gstNumber)}</strong></div>` : ''}
            </td>
          </tr></table>
        </td>
        <td style="padding:28px 36px; vertical-align:top; text-align:right;">
          <div style="font-size:24px; font-weight:800; color:#1a1a1a; letter-spacing:1px;">${invoiceTitle}</div>
          <div style="font-size:16px; font-weight:700; color:#e01a1b; margin-top:4px; letter-spacing:0.5px;">${escapeHtml(invoiceNo || orderId)}</div>
          <div style="font-size:12px; color:#6b7280; margin-top:6px;">Date: ${fmtDate(orderDate)}</div>
          <div style="margin-top:8px;">
            <span style="display:inline-block; padding:4px 12px; background:${payStatusColor}; color:#fff; border-radius:20px; font-size:11px; font-weight:700; letter-spacing:0.5px;">${escapeHtml(payStatusLabel)}</span>
          </div>
        </td>
      </tr>
    </table>

    <!-- ── Bill To / Ship To / Order Details ── -->
    <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%; border-collapse:collapse; border-bottom:1px solid #ececea;">
      <tr>
        <td style="width:33.33%; padding:22px 28px; vertical-align:top; border-right:1px solid #ececea;">
          <div style="font-size:10px; font-weight:700; color:#e01a1b; text-transform:uppercase; letter-spacing:1px; margin-bottom:9px;">Bill To</div>
          <div style="font-weight:700; font-size:14px; color:#1a1a1a;">${escapeHtml(customerName)}</div>
          <div style="font-size:12px; color:#6b7280; margin-top:4px;">${escapeHtml(customerEmail)}</div>
          <div style="font-size:12px; color:#6b7280;">${escapeHtml(formatPhoneForDisplay(customerPhone, addr.country))}</div>
        </td>
        <td style="width:33.33%; padding:22px 28px; vertical-align:top; border-right:1px solid #ececea;">
          <div style="font-size:10px; font-weight:700; color:#e01a1b; text-transform:uppercase; letter-spacing:1px; margin-bottom:9px;">Ship To</div>
          ${recipientName
            ? `<div style="font-weight:700; font-size:14px; color:#1a1a1a;">${escapeHtml(recipientName)}</div>`
            : '<div style="font-size:12px; color:#9ca3af; font-style:italic;">Same as billing</div>'}
          ${shippingAddrStr
            ? `<div style="font-size:12px; color:#6b7280; margin-top:4px; white-space:pre-line; line-height:1.5;">${escapeHtml(shippingAddrStr)}</div>`
            : ''}
        </td>
        <td style="width:33.33%; padding:22px 28px; vertical-align:top;">
          <div style="font-size:10px; font-weight:700; color:#e01a1b; text-transform:uppercase; letter-spacing:1px; margin-bottom:9px;">Order Details</div>
          <table role="presentation" style="width:100%; font-size:12px; border-collapse:collapse;">
            <tr>
              <td style="padding:3px 0; color:#6b7280;">Order ID</td>
              <td style="padding:3px 0; text-align:right; font-weight:600; color:#1a1a1a;">${escapeHtml(orderId)}</td>
            </tr>
            <tr>
              <td style="padding:3px 0; color:#6b7280;">Invoice No</td>
              <td style="padding:3px 0; text-align:right; font-weight:700; color:#e01a1b;">${escapeHtml(invoiceNo || '—')}</td>
            </tr>
            <tr>
              <td style="padding:3px 0; color:#6b7280;">Order Date</td>
              <td style="padding:3px 0; text-align:right; font-weight:600; color:#1a1a1a;">${fmtDate(orderDate)}</td>
            </tr>
            <tr>
              <td style="padding:3px 0; color:#6b7280;">Payment</td>
              <td style="padding:3px 0; text-align:right; font-weight:600; color:#1a1a1a; text-transform:capitalize;">${escapeHtml(paymentMethod || '—')}</td>
            </tr>
            <tr>
              <td style="padding:3px 0; color:#6b7280;">Currency</td>
              <td style="padding:3px 0; text-align:right; font-weight:600; color:#1a1a1a;">${escapeHtml(invoiceCurrency)}</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <!-- ── Items ── -->
    <div style="padding:24px 36px 8px;">
      <table role="presentation" style="width:100%; border-collapse:collapse; font-size:13px;">
        <thead>
          <tr style="background:#faf9f7;">
            <th style="padding:11px 8px; text-align:center; font-size:10px; font-weight:700; color:#6b7280; text-transform:uppercase; letter-spacing:0.6px; border-bottom:2px solid #e01a1b;">#</th>
            <th style="padding:11px 8px; text-align:left; font-size:10px; font-weight:700; color:#6b7280; text-transform:uppercase; letter-spacing:0.6px; border-bottom:2px solid #e01a1b;">Item</th>
            <th style="padding:11px 8px; text-align:center; font-size:10px; font-weight:700; color:#6b7280; text-transform:uppercase; letter-spacing:0.6px; border-bottom:2px solid #e01a1b;">Qty</th>
            <th style="padding:11px 8px; text-align:right; font-size:10px; font-weight:700; color:#6b7280; text-transform:uppercase; letter-spacing:0.6px; border-bottom:2px solid #e01a1b;">Unit Price</th>
            <th style="padding:11px 8px; text-align:right; font-size:10px; font-weight:700; color:#6b7280; text-transform:uppercase; letter-spacing:0.6px; border-bottom:2px solid #e01a1b;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${itemRows}
        </tbody>
      </table>
    </div>

    <!-- ── Summary (right-aligned via table cell, not flex) ── -->
    <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%; border-collapse:collapse;">
      <tr>
        <td style="padding:8px 36px 32px;" align="right">
          <table role="presentation" cellpadding="0" cellspacing="0" style="width:300px; border-collapse:collapse;">
            ${summaryRows}
            <tr>
              <td colspan="2" style="padding:0;"><div style="height:2px; background:#1a1a1a; font-size:0; line-height:0;">&nbsp;</div></td>
            </tr>
            <tr>
              <td style="padding:11px 0; font-size:15px; font-weight:800; color:#1a1a1a;">Grand Total</td>
              <td style="padding:11px 0; text-align:right; font-size:17px; font-weight:800; color:#e01a1b;">${sym}${fmt(totalAmount)}</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <!-- ── Footer ── -->
    <div style="background:#faf9f7; border-top:1px solid #ececea; padding:20px 36px; text-align:center;">
      <div style="font-size:13px; font-weight:600; color:#1a1a1a; margin-bottom:4px;">Thank you for shopping with ${escapeHtml(companyName)}!</div>
      <div style="font-size:11px; color:#9ca3af;">This is a computer generated invoice and does not require a signature.</div>
      ${gstNumber ? `<div style="font-size:11px; color:#9ca3af; margin-top:3px;">GSTIN: ${escapeHtml(gstNumber)}${(state || country) ? ` | ${escapeHtml([state, country].filter(Boolean).join(', '))}` : ''}</div>` : ''}
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
