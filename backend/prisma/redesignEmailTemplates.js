/**
 * Re-skin every email template into the shared on-brand layout (the same shell
 * the low-stock alert uses): grey backdrop, white rounded 600px card, brand-red
 * header with emoji + title + subtitle, consistent typography, and a footer.
 *
 * Only bodyHtml is rewritten — subject / fromName / variables / category stay as
 * seeded. Each template's inner content uses ONLY that template's declared
 * variables (validated before write). low_stock_alert is left as-is (it IS the
 * reference design).
 *
 * Re-runnable. Usage:  node prisma/redesignEmailTemplates.js
 */
const { PrismaClient } = require('@prisma/client');
const path = require('path');
const fs = require('fs');

const prisma = new PrismaClient();

const BRAND = '#e01a1b';

// ── Shared chrome ─────────────────────────────────────────────────────────
function wrap({ emoji, title, subtitle, inner, footer }) {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${title}</title></head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
        <!-- Header -->
        <tr><td style="background-color:${BRAND};padding:32px 40px;text-align:center;">
          <div style="font-size:30px;line-height:1;margin-bottom:8px;">${emoji}</div>
          <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;letter-spacing:-0.5px;">${title}</h1>
          <p style="margin:8px 0 0;color:#ffe2e2;font-size:14px;">${subtitle}</p>
        </td></tr>
        <!-- Body -->
        <tr><td style="padding:36px 40px;">
${inner}
        </td></tr>
        <!-- Footer -->
        <tr><td style="padding:20px 40px;border-top:1px solid #f0f0f0;text-align:center;">
          <p style="margin:0;color:#9ca3af;font-size:13px;">${footer || 'This is an automated message. Please do not reply to this email.'}</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ── Inner-content helpers ─────────────────────────────────────────────────
const greeting = (name) =>
  `          <p style="margin:0 0 16px;color:#374151;font-size:16px;line-height:1.6;">Dear <strong>${name}</strong>,</p>`;

const para = (html) =>
  `          <p style="margin:0 0 24px;color:#374151;font-size:15px;line-height:1.6;">${html}</p>`;

// Key/value info table (like the low-stock product summary). rows: [ [label, value, mono?] ]
function infoTable(rows) {
  const body = rows
    .map(([label, value, mono], i) => {
      const border = i < rows.length - 1 ? 'border-bottom:1px solid #e5e7eb;' : '';
      const valStyle = mono
        ? 'color:#111827;font-family:monospace;font-weight:600;'
        : 'color:#111827;font-weight:600;';
      return `                <tr style="${border}"><td style="padding:12px 16px;color:#6b7280;width:42%;">${label}</td><td style="padding:12px 16px;${valStyle}">${value}</td></tr>`;
    })
    .join('\n');
  return `          <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;margin:0 0 24px;">
${body}
          </table>`;
}

// Brand-tinted callout used for rejection / suspension reasons.
function reasonBox(label, value) {
  return `          <table width="100%" cellpadding="0" cellspacing="0" style="border-left:4px solid ${BRAND};background:#fff5f5;border-radius:8px;margin:0 0 24px;">
            <tr><td style="padding:16px 18px;">
              <p style="margin:0 0 6px;color:#6b7280;font-size:12px;text-transform:uppercase;letter-spacing:0.04em;">${label}</p>
              <p style="margin:0;color:#111827;font-size:15px;line-height:1.6;">${value}</p>
            </td></tr>
          </table>`;
}

// Subtle neutral note box (security tips etc).
function noteBox(html) {
  return `          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;margin:0 0 24px;">
            <tr><td style="padding:14px 18px;color:#6b7280;font-size:13px;line-height:1.6;">${html}</td></tr>
          </table>`;
}

function ctaButton(href, label) {
  return `          <div style="text-align:center;margin-top:8px;">
            <a href="${href}" style="display:inline-block;background-color:${BRAND};color:#ffffff;padding:12px 30px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;">${label}</a>
          </div>`;
}

// Small "or paste this link" fallback used by verify / reset emails.
function linkFallback(url) {
  return `          <p style="margin:24px 0 4px;color:#6b7280;font-size:13px;">Or copy and paste this link into your browser:</p>
          <p style="margin:0;color:#9ca3af;font-size:13px;word-break:break-all;">${url}</p>`;
}

const V = (name) => `{{${name}}}`; // readability helper for variables

// ── Per-template definitions ──────────────────────────────────────────────
// Each entry returns the full re-skinned bodyHtml. low_stock_alert intentionally omitted.
const templates = {
  vendor_enquiry_approval: wrap({
    emoji: '🎉',
    title: 'Application Approved',
    subtitle: 'Complete your registration to get started',
    inner: [
      greeting(V('name')),
      para(`Great news — your vendor application for <strong>${V('companyName')}</strong> has been approved. Complete your registration to set up your account and start selling with us.`),
      ctaButton(V('registrationLink'), 'Complete Registration'),
    ].join('\n'),
    footer: 'This is an automated message. Please do not reply to this email.',
  }),

  vendor_enquiry_rejection: wrap({
    emoji: '📋',
    title: 'Application Status Update',
    subtitle: 'Regarding your vendor application',
    inner: [
      greeting(V('name')),
      para(`Thank you for your interest in becoming a vendor. After carefully reviewing your application for <strong>${V('companyName')}</strong>, we're unable to approve it at this time.`),
      para(`You're welcome to address any gaps and reapply in the future. If you have questions about this decision, our support team is happy to help.`),
    ].join('\n'),
  }),

  qc_checker_credentials: wrap({
    emoji: '🔑',
    title: 'Welcome to QC Portal',
    subtitle: 'Your Quality Control Checker account is ready',
    inner: [
      greeting(V('name')),
      para(`Your QC Checker account has been created. Use the credentials below to sign in to the Quality Control portal.`),
      infoTable([
        ['Checker ID', V('checkerId'), true],
        ['Password', V('password'), true],
      ]),
      ctaButton(V('loginLink'), 'Log in to QC Portal'),
      noteBox(`🔒 For your security, please change your password after your first login and keep your credentials private.`),
    ].join('\n'),
  }),

  staff_credentials: wrap({
    emoji: '🔑',
    title: 'Welcome to the Admin Portal',
    subtitle: 'Your account has been created',
    inner: [
      greeting(V('name')),
      para(`An account has been created for you on the Admin Portal. Use the credentials below to sign in.`),
      infoTable([
        ['Email', V('email'), false],
        ['Password', V('password'), true],
      ]),
      para(`Please verify your email address to activate your account:`),
      ctaButton(V('verificationLink'), 'Verify Email'),
      noteBox(`After verifying, you can log in any time at <a href="${V('loginLink')}" style="color:${BRAND};text-decoration:none;font-weight:600;">the Admin Portal</a>. For your security, change your password after your first login.`),
    ].join('\n'),
  }),

  vendor_email_verification_test: wrap({
    emoji: '✅',
    title: 'Email Verification Test',
    subtitle: 'Confirming this address is reachable',
    inner: [
      para(`${V('checkerLineBlock')} reaching out${V('vendorNameBlock')} to confirm that this email address is working and can receive messages from us.`),
      para(`No action is needed — if you received this email, the address is verified. You can safely ignore this message.`),
    ].join('\n'),
    footer: 'This is an automated verification test. Please do not reply to this email.',
  }),

  inspection_reminder: wrap({
    emoji: '⏰',
    title: 'Inspection Reminder',
    subtitle: 'Your assigned inspection starts soon',
    inner: [
      `          <p style="margin:0 0 16px;color:#374151;font-size:16px;line-height:1.6;">Hi <strong>${V('checkerGreeting')}</strong>,</p>`,
      para(`This is a reminder that your inspection for <strong>${V('vendorNameStrong')}</strong> is starting soon. Please reach the location on time — it can only be started within its scheduled window.`),
      infoTable([
        ['Vendor', V('vendorNameOrDash'), false],
        ['Date', V('scheduledDateOrDash'), false],
        ['Time', V('scheduledTimeOrDash'), false],
      ]),
      `          <p style="margin:0 0 6px;color:#6b7280;font-size:13px;">Estimated Duration</p>`,
      `          ${V('estimatedDurationAndLocationBlock')}`,
    ].join('\n'),
    footer: 'This is an automated inspection reminder. Please do not reply to this email.',
  }),

  vendor_approval_credentials: wrap({
    emoji: '🎉',
    title: 'Your Vendor Account is Approved',
    subtitle: 'Welcome aboard — here are your login details',
    inner: [
      greeting(V('ownerName')),
      para(`Congratulations! Your vendor account for <strong>${V('companyName')}</strong> has been approved. You can now access your dashboard and start managing your business with us.`),
      infoTable([
        ['Email', V('email'), false],
        ['Password', V('password'), true],
      ]),
      ctaButton(V('loginUrl'), 'Access Your Dashboard'),
      noteBox(`🔒 For your security, please change your password immediately after your first login and keep your credentials private.`),
    ].join('\n'),
    footer: 'This is an automated message. Please do not reply to this email.',
  }),

  vendor_rejection: wrap({
    emoji: '📋',
    title: 'Application Status Update',
    subtitle: 'Regarding your vendor application',
    inner: [
      greeting(V('ownerName')),
      para(`Thank you for your interest in our platform. After careful review of your application for <strong>${V('companyName')}</strong>, we're unable to approve it at this time.`),
      reasonBox('Reason for decision', V('reason')),
      para(`We encourage you to address the points above and reapply in the future. If you have any questions, please contact our support team.`),
    ].join('\n'),
  }),

  vendor_suspension: wrap({
    emoji: '⚠️',
    title: 'Account Suspension Notice',
    subtitle: 'Important update about your account',
    inner: [
      greeting(V('ownerName')),
      para(`We're writing to let you know that your vendor account for <strong>${V('companyName')}</strong> has been temporarily suspended.`),
      reasonBox('Reason for suspension', V('reason')),
      para(`While suspended, you won't be able to access your dashboard, receive new orders, or update listings. To resolve this and reactivate your account, please contact our support team.`),
    ].join('\n'),
  }),

  new_vendor_registration_admin: wrap({
    emoji: '🏷️',
    title: 'New Vendor Registration',
    subtitle: 'A new vendor has submitted an application',
    inner: [
      para(`A new vendor has submitted a registration application. Review the details below and take action.`),
      infoTable([
        ['Company', V('companyName'), false],
        ['Owner', V('ownerName'), false],
        ['Email', V('vendorEmail'), false],
        ['Phone', V('phoneDisplay'), false],
        ['Location', V('locationDisplay'), false],
      ]),
      ctaButton(V('reviewUrl'), 'Review Application'),
    ].join('\n'),
    footer: 'This is an automated notification. Please do not reply to this email.',
  }),

  email_verification: wrap({
    emoji: '✉️',
    title: 'Verify Your Email',
    subtitle: 'One quick step to activate your account',
    inner: [
      `          <p style="margin:0 0 16px;color:#374151;font-size:16px;line-height:1.6;">Hi <strong>${V('name')}</strong>,</p>`,
      para(`Thanks for registering. Please confirm your email address to activate your account.`),
      ctaButton(V('verificationUrl'), 'Verify Email'),
      linkFallback(V('verificationUrl')),
      para(`<span style="color:#6b7280;font-size:13px;">This link will expire in 24 hours. If you didn't create this account, you can safely ignore this email.</span>`),
    ].join('\n'),
    footer: 'This is an automated message. Please do not reply to this email.',
  }),

  password_reset: wrap({
    emoji: '🔒',
    title: 'Password Reset Request',
    subtitle: 'Reset your {{accountType}} password',
    inner: [
      `          <p style="margin:0 0 16px;color:#374151;font-size:16px;line-height:1.6;">Hi <strong>${V('userName')}</strong>,</p>`,
      para(`We received a request to reset your password. Click the button below to choose a new one.`),
      ctaButton(V('resetUrl'), 'Reset Password'),
      linkFallback(V('resetUrl')),
      para(`<span style="color:#6b7280;font-size:13px;">This link will expire in 1 hour. If you didn't request this, you can safely ignore this email — your password won't change.</span>`),
    ].join('\n'),
    footer: 'This is an automated message. Please do not reply to this email.',
  }),
};

async function main() {
  // Load the seed data to validate variable usage per template.
  const seedPath = path.join(__dirname, 'emailTemplatesSeedData.js');
  delete require.cache[require.resolve(seedPath)];
  const seed = require(seedPath);
  const declaredByKey = Object.fromEntries(seed.map((t) => [t.key, new Set(t.variables)]));

  // 1) Validate: every {{var}} used in a new body must be declared.
  let invalid = 0;
  for (const [key, html] of Object.entries(templates)) {
    const declared = declaredByKey[key];
    if (!declared) { console.log(`  ⚠️  ${key}: not in seed data — skipping`); continue; }
    const used = new Set();
    for (const m of html.matchAll(/\{\{\s*([\w.]+)\s*\}\}/g)) used.add(m[1]);
    const missing = [...used].filter((v) => !declared.has(v));
    if (missing.length) { invalid++; console.log(`  ❌ ${key}: uses undeclared vars: ${missing.join(', ')}`); }
  }
  if (invalid) { console.error(`\nAborting — ${invalid} template(s) reference undeclared variables.`); process.exitCode = 1; return; }

  // 2) Update DB rows.
  let updated = 0;
  for (const [key, bodyHtml] of Object.entries(templates)) {
    const res = await prisma.emailTemplate.updateMany({ where: { key }, data: { bodyHtml } });
    if (res.count) { updated++; console.log(`  ✓ re-skinned  ${key}`); }
    else console.log(`  = no row for  ${key} (run seed first)`);
  }

  // 3) Keep the seed file in sync so fresh environments get the new design.
  const newSeed = seed.map((t) => (templates[t.key] ? { ...t, bodyHtml: templates[t.key] } : t));
  const header = fs.readFileSync(seedPath, 'utf8').split('module.exports')[0];
  fs.writeFileSync(seedPath, header + 'module.exports = ' + JSON.stringify(newSeed, null, 2) + ';\n');
  console.log(`\nDone. DB updated=${updated}. Seed file re-synced (low_stock_alert left as the reference design).`);
}

main()
  .catch((e) => { console.error('Redesign failed:', e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
