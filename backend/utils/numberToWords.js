// Amount-in-words for invoices. Supports INR (Indian numbering: lakh/crore,
// "Rupees … and … Paise") and USD/others (international grouping, "Dollars …
// and … Cents"). Returns a Title-cased string ending in "Only".

const ONES = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
  'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen',
  'Eighteen', 'Nineteen'];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

function twoDigits(n) {
  if (n < 20) return ONES[n];
  const t = Math.floor(n / 10), o = n % 10;
  return TENS[t] + (o ? ' ' + ONES[o] : '');
}

function threeDigits(n) {
  const h = Math.floor(n / 100), r = n % 100;
  let s = '';
  if (h) s += ONES[h] + ' Hundred';
  if (r) s += (s ? ' ' : '') + twoDigits(r);
  return s;
}

// International grouping (thousand / million / billion) — used for USD & others.
function intToWordsIntl(num) {
  if (num === 0) return 'Zero';
  const SCALES = ['', ' Thousand', ' Million', ' Billion', ' Trillion'];
  const parts = [];
  let i = 0;
  while (num > 0) {
    const chunk = num % 1000;
    if (chunk) parts.unshift(threeDigits(chunk) + SCALES[i]);
    num = Math.floor(num / 1000);
    i++;
  }
  return parts.join(' ').trim();
}

// Indian grouping (thousand / lakh / crore) — used for INR.
function intToWordsIndian(num) {
  if (num === 0) return 'Zero';
  const last3 = num % 1000;
  let rest = Math.floor(num / 1000); // groups of 2 digits (thousand, lakh, crore…)
  const scales = [' Thousand', ' Lakh', ' Crore', ' Arab'];
  const parts = [];
  let i = 0;
  while (rest > 0) {
    const pair = rest % 100;
    if (pair) parts.unshift(twoDigits(pair) + scales[i]);
    rest = Math.floor(rest / 100);
    i++;
  }
  if (last3) parts.push(threeDigits(last3));
  return parts.join(' ').trim();
}

/**
 * @param {number} amount
 * @param {string} currency  'INR' | 'USD' | …
 * @returns {string}  e.g. "Rupees One Thousand Two Hundred and Fifty Paise Only"
 */
function amountInWords(amount, currency = 'INR') {
  const cur = String(currency || 'INR').toUpperCase();
  const isINR = cur === 'INR';
  const whole = Math.floor(Math.abs(Number(amount) || 0));
  const frac = Math.round((Math.abs(Number(amount) || 0) - whole) * 100);

  const majorName = isINR ? 'Rupees' : cur === 'USD' ? 'Dollars' : cur;
  const minorName = isINR ? 'Paise' : cur === 'USD' ? 'Cents' : 'Cents';
  const toWords = isINR ? intToWordsIndian : intToWordsIntl;

  let s = `${majorName} ${toWords(whole)}`;
  if (frac > 0) s += ` and ${twoDigits(frac)} ${minorName}`;
  return `${s} Only`;
}

module.exports = { amountInWords };
