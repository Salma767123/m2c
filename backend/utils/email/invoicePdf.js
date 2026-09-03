const PDFDocument = require('pdfkit');

const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

/**
 * Build a tax-invoice PDF (Buffer) from an order + company settings, using pdfkit
 * (pure JS — no headless browser, safe on serverless). Mirrors the HTML invoice:
 * header + PAID badge, bill-to / ship-to / order-details, item table with per-line
 * GST, and the totals block. Returns a Promise<Buffer>.
 */
async function buildInvoicePdfBuffer(order, company = {}) {
  const {
    orderId, invoiceNo, createdAt,
    customerName, customerEmail, customerPhone,
    shippingAddress = {},
    items = [],
    subtotal = 0, shippingCost = 0, tax = 0,
    cgstAmount = 0, sgstAmount = 0, igstAmount = 0, taxType = null,
    discount = 0, totalAmount = 0,
    paymentMethod, paymentStatus,
  } = order;

  const companyName = company.companyName || 'M2C Markdowns';
  const gstNumber = company.gstNumber || '';
  const companyAddress = company.address || '';

  const currency = order.currency === 'USD' ? 'USD' : 'INR';
  const sym = currency === 'INR' ? 'Rs.' : '$'; // pdfkit core fonts lack the ₹ glyph
  const fmt = (n) => `${sym} ${Number(n || 0).toFixed(2)}`;
  const isTax = !!gstNumber && currency === 'INR';
  const title = isTax ? 'TAX INVOICE' : 'INVOICE';

  const RED = '#e01a1b';
  const DARK = '#1a1a1a';
  const GREY = '#6b7280';

  const doc = new PDFDocument({ size: 'A4', margin: 40 });
  const chunks = [];
  doc.on('data', (c) => chunks.push(c));
  const done = new Promise((resolve) => doc.on('end', () => resolve(Buffer.concat(chunks))));

  const L = 40;                 // left margin
  const R = doc.page.width - 40; // right edge
  const W = R - L;

  // ── Header ──
  doc.fillColor(DARK).font('Helvetica-Bold').fontSize(18).text(companyName, L, 44);
  if (gstNumber) doc.font('Helvetica').fontSize(9).fillColor(GREY).text(`GSTIN: ${gstNumber}`, L, 68);
  if (companyAddress) doc.font('Helvetica').fontSize(9).fillColor(GREY).text(companyAddress, L, 82, { width: W * 0.55 });

  doc.font('Helvetica-Bold').fontSize(20).fillColor(DARK).text(title, L, 44, { width: W, align: 'right' });
  doc.font('Helvetica-Bold').fontSize(11).fillColor(RED).text(invoiceNo || orderId || '', L, 70, { width: W, align: 'right' });
  const dateStr = createdAt ? new Date(createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '';
  doc.font('Helvetica').fontSize(9).fillColor(GREY).text(`Date: ${dateStr}`, L, 86, { width: W, align: 'right' });
  if (String(paymentStatus).toUpperCase() === 'PAID') {
    doc.font('Helvetica-Bold').fontSize(10).fillColor('#16a34a').text(`PAID  ${fmt(totalAmount)}`, L, 100, { width: W, align: 'right' });
  }

  // ── Bill-to / Ship-to / Order details ──
  let y = 130;
  doc.moveTo(L, y).lineTo(R, y).strokeColor('#e5e7eb').lineWidth(1).stroke();
  y += 12;
  const colW = W / 3;
  const label = (t, x) => doc.font('Helvetica-Bold').fontSize(8).fillColor(RED).text(t, x, y, { width: colW - 10, characterSpacing: 0.5 });
  label('BILL TO', L); label('SHIP TO', L + colW); label('ORDER DETAILS', L + colW * 2);

  const addr = [
    shippingAddress.address, shippingAddress.addressLine2, shippingAddress.addressLine3,
    [shippingAddress.city, shippingAddress.state, shippingAddress.zipCode].filter(Boolean).join(', '),
    shippingAddress.country,
  ].filter(Boolean);

  const c1 = [customerName, customerEmail, customerPhone].filter(Boolean);
  const c2 = [shippingAddress.name || customerName, ...addr].filter(Boolean);
  const c3 = [
    `Order ID: ${orderId || '-'}`,
    `Invoice: ${invoiceNo || '-'}`,
    `Payment: ${paymentMethod || '-'}`,
    `Status: ${paymentStatus || '-'}`,
    `Currency: ${currency}`,
  ];

  const cy = y + 14;
  doc.font('Helvetica').fontSize(9).fillColor(DARK);
  doc.text(c1.join('\n'), L, cy, { width: colW - 10 });
  doc.text(c2.join('\n'), L + colW, cy, { width: colW - 10 });
  doc.text(c3.join('\n'), L + colW * 2, cy, { width: colW - 10 });

  y = Math.max(doc.y, cy + 70) + 10;

  // ── Item table ──
  const cols = isTax
    ? [ { t: 'ITEM', w: 0.30, a: 'left' }, { t: 'UNIT', w: 0.12, a: 'right' }, { t: 'QTY', w: 0.08, a: 'center' }, { t: 'NET', w: 0.14, a: 'right' }, { t: 'TAX', w: 0.10, a: 'center' }, { t: 'TAX AMT', w: 0.12, a: 'right' }, { t: 'TOTAL', w: 0.14, a: 'right' } ]
    : [ { t: 'ITEM', w: 0.44, a: 'left' }, { t: 'UNIT', w: 0.16, a: 'right' }, { t: 'QTY', w: 0.10, a: 'center' }, { t: 'TOTAL', w: 0.30, a: 'right' } ];
  const colX = []; let acc = L;
  cols.forEach((c) => { colX.push(acc); acc += c.w * W; });

  const drawHeader = () => {
    doc.rect(L, y, W, 20).fill('#faf5f2');
    doc.font('Helvetica-Bold').fontSize(8).fillColor(RED);
    cols.forEach((c, i) => doc.text(c.t, colX[i] + 4, y + 6, { width: c.w * W - 8, align: c.a }));
    y += 24;
  };
  drawHeader();

  const fallbackRate = subtotal > 0 ? (tax / subtotal) * 100 : 0;
  doc.font('Helvetica').fontSize(9);
  for (const item of items) {
    const gross = Number(item.totalPrice) || 0;
    const couponShare = subtotal > 0 ? (gross / subtotal) * discount : 0;
    const net = round2(Math.max(0, gross - couponShare));
    const ratePct = item.gstPercentage != null ? Number(item.gstPercentage) : fallbackRate;
    const lineTax = round2(net * ratePct / 100);
    const lineTotal = round2(net + lineTax);

    if (y > doc.page.height - 120) { doc.addPage(); y = 50; drawHeader(); doc.font('Helvetica').fontSize(9); }

    const subParts = [item.size ? `Size: ${item.size}` : '', item.color ? `Color: ${item.color}` : ''].filter(Boolean);
    const nameH = doc.heightOfString(item.productName || 'Item', { width: cols[0].w * W - 8 });
    const rowH = Math.max(22, nameH + (subParts.length ? 12 : 0) + 8);

    doc.fillColor(DARK).font('Helvetica-Bold').text(item.productName || 'Item', colX[0] + 4, y + 4, { width: cols[0].w * W - 8 });
    if (subParts.length) doc.font('Helvetica').fontSize(7.5).fillColor(GREY).text(subParts.join('  '), colX[0] + 4, doc.y, { width: cols[0].w * W - 8 });
    doc.font('Helvetica').fontSize(9).fillColor(DARK);

    if (isTax) {
      const taxLabel = ratePct <= 0 ? '-' : (taxType === 'INTERSTATE' || igstAmount > 0 ? `IGST ${ratePct}%` : `GST ${ratePct}%`);
      doc.text(fmt(item.unitPrice), colX[1] + 4, y + 4, { width: cols[1].w * W - 8, align: 'right' });
      doc.text(String(item.quantity), colX[2] + 4, y + 4, { width: cols[2].w * W - 8, align: 'center' });
      doc.text(fmt(net), colX[3] + 4, y + 4, { width: cols[3].w * W - 8, align: 'right' });
      doc.fontSize(8).fillColor(GREY).text(taxLabel, colX[4] + 4, y + 4, { width: cols[4].w * W - 8, align: 'center' }).fontSize(9).fillColor(DARK);
      doc.text(fmt(lineTax), colX[5] + 4, y + 4, { width: cols[5].w * W - 8, align: 'right' });
      doc.font('Helvetica-Bold').text(fmt(lineTotal), colX[6] + 4, y + 4, { width: cols[6].w * W - 8, align: 'right' }).font('Helvetica');
    } else {
      doc.text(fmt(item.unitPrice), colX[1] + 4, y + 4, { width: cols[1].w * W - 8, align: 'right' });
      doc.text(String(item.quantity), colX[2] + 4, y + 4, { width: cols[2].w * W - 8, align: 'center' });
      doc.font('Helvetica-Bold').text(fmt(lineTotal), colX[3] + 4, y + 4, { width: cols[3].w * W - 8, align: 'right' }).font('Helvetica');
    }
    y += rowH;
    doc.moveTo(L, y).lineTo(R, y).strokeColor('#f0f0ee').lineWidth(0.5).stroke();
  }

  // ── Totals ──
  y += 14;
  const tX = L + W * 0.55;
  const tW = W * 0.45;
  const row = (lbl, val, bold) => {
    if (y > doc.page.height - 60) { doc.addPage(); y = 50; }
    doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(bold ? 12 : 10).fillColor(bold ? DARK : GREY);
    doc.text(lbl, tX, y, { width: tW * 0.55 });
    doc.fillColor(bold ? RED : DARK).text(val, tX + tW * 0.45, y, { width: tW * 0.55, align: 'right' });
    y += bold ? 24 : 18;
  };
  row('Subtotal', fmt(subtotal));
  if (discount > 0) row('Discount', `- ${fmt(discount)}`);
  if (isTax && (cgstAmount > 0 || sgstAmount > 0)) { row('CGST', fmt(cgstAmount)); row('SGST', fmt(sgstAmount)); }
  else if (isTax && igstAmount > 0) row('IGST', fmt(igstAmount));
  else if (tax > 0) row('Tax (GST)', fmt(tax));
  row('Shipping', shippingCost > 0 ? fmt(shippingCost) : 'Free');
  doc.moveTo(tX, y).lineTo(R, y).strokeColor(DARK).lineWidth(1).stroke(); y += 8;
  row('Grand Total', fmt(totalAmount), true);

  doc.font('Helvetica').fontSize(8).fillColor(GREY).text(
    'Thank you for shopping with us. This is a computer-generated invoice.',
    L, doc.page.height - 55, { width: W, align: 'center' }
  );

  doc.end();
  return done;
}

module.exports = { buildInvoicePdfBuffer };
