/**
 * Shared email layout — single source of truth for how every transactional
 * email looks. Admins edit only PLAIN-TEXT fields (emoji, header title/subtitle,
 * body message, button label, footer). The structural pieces (credential/detail
 * tables, pre-computed HTML blocks, the CTA button target, boilerplate notes)
 * live here in code, keyed by template `key`.
 *
 * `buildBodyHtml(key, content)` composes the final send-ready HTML (with
 * {{variables}} left intact for the send-time renderer). Used by the seed /
 * migration scripts, the update controller, and the live-preview endpoint.
 */

const BRAND = '#e01a1b';

// ── HTML shell ─────────────────────────────────────────────────────────────
function wrap({ emoji, title, subtitle, inner, footer }) {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${escapeText(title)}</title></head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
        <tr><td style="background-color:${BRAND};padding:32px 40px;text-align:center;">
          <div style="font-size:30px;line-height:1;margin-bottom:8px;">${emoji || ''}</div>
          <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;letter-spacing:-0.5px;">${escapeText(title)}</h1>
          <p style="margin:8px 0 0;color:#ffe2e2;font-size:14px;">${escapeText(subtitle)}</p>
        </td></tr>
        <tr><td style="padding:36px 40px;">
${inner}
        </td></tr>
        <tr><td style="padding:20px 40px;border-top:1px solid #f0f0f0;text-align:center;">
          <p style="margin:0;color:#9ca3af;font-size:13px;">${escapeText(footer) || 'This is an automated message. Please do not reply to this email.'}</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// Escape user text but preserve {{variable}} tokens (they're plain word chars in
// braces, so escaping &<> never touches them).
function escapeText(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// Turn a plain-text message into styled paragraphs: blank line = new paragraph,
// single newline = <br>. Text is escaped; {{variables}} survive for send-time.
function renderBodyText(text) {
  const blocks = String(text || '')
    .replace(/\r\n/g, '\n')
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
  return blocks
    .map(
      (p) =>
        `          <p style="margin:0 0 20px;color:#374151;font-size:15px;line-height:1.6;">${escapeText(p).replace(/\n/g, '<br>')}</p>`
    )
    .join('\n');
}

function infoTable(rows) {
  if (!rows || !rows.length) return '';
  const body = rows
    .map(([label, varName, mono], i) => {
      const border = i < rows.length - 1 ? 'border-bottom:1px solid #e5e7eb;' : '';
      const valStyle = mono
        ? 'color:#111827;font-family:monospace;font-weight:600;'
        : 'color:#111827;font-weight:600;';
      return `                <tr style="${border}"><td style="padding:12px 16px;color:#6b7280;width:42%;">${escapeText(label)}</td><td style="padding:12px 16px;${valStyle}">{{${varName}}}</td></tr>`;
    })
    .join('\n');
  return `          <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;margin:0 0 24px;">
${body}
          </table>`;
}

function reasonBox(label, varName) {
  return `          <table width="100%" cellpadding="0" cellspacing="0" style="border-left:4px solid ${BRAND};background:#fff5f5;border-radius:8px;margin:0 0 24px;">
            <tr><td style="padding:16px 18px;">
              <p style="margin:0 0 6px;color:#6b7280;font-size:12px;text-transform:uppercase;letter-spacing:0.04em;">${escapeText(label)}</p>
              <p style="margin:0;color:#111827;font-size:15px;line-height:1.6;">{{${varName}}}</p>
            </td></tr>
          </table>`;
}

function noteBox(html) {
  return `          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;margin:0 0 24px;">
            <tr><td style="padding:14px 18px;color:#6b7280;font-size:13px;line-height:1.6;">${html}</td></tr>
          </table>`;
}

function ctaButton(urlVar, label) {
  return `          <div style="text-align:center;margin-top:8px;">
            <a href="{{${urlVar}}}" style="display:inline-block;background-color:${BRAND};color:#ffffff;padding:12px 30px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;">${escapeText(label)}</a>
          </div>`;
}

// ── Per-template registry ────────────────────────────────────────────────
// defaults{}  = editable text seeded into the DB
// infoRows    = [ [label, variableName, mono?] ]  (auto detail table)
// reason      = { label, var }                    (brand-tinted callout)
// rawAfterTable = HTML string (may contain {{blockVar}})  placed after the table
// cta         = { urlVar }                         (button; label comes from editable buttonLabel)
// note        = fixed HTML rendered in a subtle box after the button
const LAYOUTS = {
  vendor_enquiry_approval: {
    defaults: {
      emoji: '🎉', headerTitle: 'Application Approved',
      headerSubtitle: 'Complete your registration to get started',
      bodyText: "Dear {{name}},\n\nGreat news — your vendor application for {{companyName}} has been approved. Complete your registration to set up your account and start selling with us.",
      buttonLabel: 'Complete Registration', footerText: 'This is an automated message. Please do not reply to this email.',
    },
    cta: { urlVar: 'registrationLink' },
  },

  vendor_enquiry_rejection: {
    defaults: {
      emoji: '📋', headerTitle: 'Application Status Update',
      headerSubtitle: 'Regarding your vendor application',
      bodyText: "Dear {{name}},\n\nThank you for your interest in becoming a vendor. After carefully reviewing your application for {{companyName}}, we're unable to approve it at this time.\n\nYou're welcome to address any gaps and reapply in the future. If you have questions about this decision, our support team is happy to help.",
      buttonLabel: '', footerText: 'This is an automated message. Please do not reply to this email.',
    },
  },

  qc_checker_credentials: {
    defaults: {
      emoji: '🔑', headerTitle: 'Welcome to QC Portal',
      headerSubtitle: 'Your Quality Control Checker account is ready',
      bodyText: 'Dear {{name}},\n\nYour QC Checker account has been created. Use the credentials below to sign in to the Quality Control portal.',
      buttonLabel: 'Log in to QC Portal', footerText: 'This is an automated message. Please do not reply to this email.',
    },
    infoRows: [['Checker ID', 'checkerId', true], ['Password', 'password', true]],
    cta: { urlVar: 'loginLink' },
    note: '🔒 For your security, please change your password after your first login and keep your credentials private.',
  },

  staff_credentials: {
    defaults: {
      emoji: '🔑', headerTitle: 'Welcome to the Admin Portal',
      headerSubtitle: 'Your account has been created',
      bodyText: 'Dear {{name}},\n\nAn account has been created for you on the Admin Portal. Use the credentials below to sign in, then verify your email address to activate your account.',
      buttonLabel: 'Verify Email', footerText: 'This is an automated message. Please do not reply to this email.',
    },
    infoRows: [['Email', 'email', false], ['Password', 'password', true]],
    cta: { urlVar: 'verificationLink' },
    note: `After verifying, you can log in any time at <a href="{{loginLink}}" style="color:${BRAND};text-decoration:none;font-weight:600;">the Admin Portal</a>. For your security, change your password after your first login.`,
  },

  vendor_email_verification_test: {
    defaults: {
      emoji: '✅', headerTitle: 'Email Verification Test',
      headerSubtitle: 'Confirming this address is reachable',
      bodyText: '{{checkerLineBlock}} reaching out{{vendorNameBlock}} to confirm that this email address is working and can receive messages from us.\n\nNo action is needed — if you received this email, the address is verified. You can safely ignore this message.',
      buttonLabel: '', footerText: 'This is an automated verification test. Please do not reply to this email.',
    },
  },

  inspection_reminder: {
    defaults: {
      emoji: '⏰', headerTitle: 'Inspection Reminder',
      headerSubtitle: 'Your assigned inspection starts soon',
      bodyText: 'Hi {{checkerGreeting}},\n\nThis is a reminder that your inspection for {{vendorNameStrong}} is starting soon. Please reach the location on time — it can only be started within its scheduled window.',
      buttonLabel: '', footerText: 'This is an automated inspection reminder. Please do not reply to this email.',
    },
    infoRows: [['Vendor', 'vendorNameOrDash', false], ['Date', 'scheduledDateOrDash', false], ['Time', 'scheduledTimeOrDash', false]],
    rawAfterTable: `          <p style="margin:0 0 6px;color:#6b7280;font-size:13px;">Estimated Duration</p>\n          {{estimatedDurationAndLocationBlock}}`,
  },

  vendor_approval_credentials: {
    defaults: {
      emoji: '🎉', headerTitle: 'Your Vendor Account is Approved',
      headerSubtitle: 'Welcome aboard — here are your login details',
      bodyText: 'Dear {{ownerName}},\n\nCongratulations! Your vendor account for {{companyName}} has been approved. You can now access your dashboard and start managing your business with us.',
      buttonLabel: 'Access Your Dashboard', footerText: 'This is an automated message. Please do not reply to this email.',
    },
    infoRows: [['Email', 'email', false], ['Password', 'password', true]],
    cta: { urlVar: 'loginUrl' },
    note: '🔒 For your security, please change your password immediately after your first login and keep your credentials private.',
  },

  vendor_rejection: {
    defaults: {
      emoji: '📋', headerTitle: 'Application Status Update',
      headerSubtitle: 'Regarding your vendor application',
      bodyText: "Dear {{ownerName}},\n\nThank you for your interest in our platform. After careful review of your application for {{companyName}}, we're unable to approve it at this time.",
      buttonLabel: '', footerText: 'This is an automated message. Please do not reply to this email.',
    },
    reason: { label: 'Reason for decision', var: 'reason' },
    note: 'We encourage you to address the points above and reapply in the future. If you have any questions, please contact our support team.',
  },

  vendor_suspension: {
    defaults: {
      emoji: '⚠️', headerTitle: 'Account Suspension Notice',
      headerSubtitle: 'Important update about your account',
      bodyText: "Dear {{ownerName}},\n\nWe're writing to let you know that your vendor account for {{companyName}} has been temporarily suspended. While suspended, you won't be able to access your dashboard, receive new orders, or update listings.",
      buttonLabel: '', footerText: 'This is an automated message. Please do not reply to this email.',
    },
    reason: { label: 'Reason for suspension', var: 'reason' },
    note: 'To resolve this and reactivate your account, please contact our support team.',
  },

  new_vendor_registration_admin: {
    defaults: {
      emoji: '🏷️', headerTitle: 'New Vendor Registration',
      headerSubtitle: 'A new vendor has submitted an application',
      bodyText: 'A new vendor has submitted a registration application. Review the details below and take action.',
      buttonLabel: 'Review Application', footerText: 'This is an automated notification. Please do not reply to this email.',
    },
    infoRows: [
      ['Company', 'companyName', false], ['Owner', 'ownerName', false], ['Email', 'vendorEmail', false],
      ['Phone', 'phoneDisplay', false], ['Location', 'locationDisplay', false],
    ],
    cta: { urlVar: 'reviewUrl' },
  },

  low_stock_alert: {
    defaults: {
      emoji: '⚠️', headerTitle: 'Low Stock Alert',
      headerSubtitle: 'One or more products need restocking',
      bodyText: 'Dear {{greetingName}},\n\nOne or more products from {{companyName}} have reached their low-stock threshold. Review the details below and restock soon to avoid missing sales.',
      buttonLabel: 'Go to Inventory', footerText: 'This is an automated stock alert. Please do not reply to this email.',
    },
    infoRows: [
      ['Product', 'productName', false], ['SKU', 'skuDisplay', true], ['Category', 'categoryDisplay', false],
      ['Current Stock', 'currentStock', false], ['Minimum', 'minStock', false],
    ],
    rawAfterTable: '          {{unitsSection}}',
    cta: { urlVar: 'dashboardUrl' },
  },

  email_verification: {
    defaults: {
      emoji: '✉️', headerTitle: 'Verify Your Email',
      headerSubtitle: 'One quick step to activate your account',
      bodyText: 'Hi {{name}},\n\nThanks for registering. Please confirm your email address to activate your account.',
      buttonLabel: 'Verify Email', footerText: 'This is an automated message. Please do not reply to this email.',
    },
    cta: { urlVar: 'verificationUrl' },
    note: "This link will expire in 24 hours. If you didn't create this account, you can safely ignore this email.",
  },

  password_reset: {
    defaults: {
      emoji: '🔒', headerTitle: 'Password Reset Request',
      headerSubtitle: 'Reset your {{accountType}} password',
      bodyText: 'Hi {{userName}},\n\nWe received a request to reset your password. Click the button below to choose a new one.',
      buttonLabel: 'Reset Password', footerText: 'This is an automated message. Please do not reply to this email.',
    },
    cta: { urlVar: 'resetUrl' },
    note: "This link will expire in 1 hour. If you didn't request this, you can safely ignore this email — your password won't change.",
  },
};

/**
 * Compose the full bodyHtml for a template from its editable content + the
 * code-side structural pieces. `content` overrides the registry defaults.
 * Returns HTML with {{variables}} still intact (interpolated at send time).
 */
function buildBodyHtml(key, content = {}) {
  const layout = LAYOUTS[key];
  if (!layout) return null;
  const c = { ...layout.defaults, ...content };

  const parts = [];
  parts.push(renderBodyText(c.bodyText));
  if (layout.reason) parts.push(reasonBox(layout.reason.label, layout.reason.var));
  if (layout.infoRows) parts.push(infoTable(layout.infoRows));
  if (layout.rawAfterTable) parts.push(layout.rawAfterTable);
  if (layout.cta && c.buttonLabel && String(c.buttonLabel).trim()) {
    parts.push(ctaButton(layout.cta.urlVar, c.buttonLabel));
  }
  if (layout.note) parts.push(noteBox(layout.note));

  return wrap({
    emoji: c.emoji,
    title: c.headerTitle,
    subtitle: c.headerSubtitle,
    inner: parts.filter(Boolean).join('\n'),
    footer: c.footerText,
  });
}

// Editable defaults for seeding a template row.
function getEditableDefaults(key) {
  return LAYOUTS[key] ? { ...LAYOUTS[key].defaults } : null;
}

// Does this template render a CTA button? (drives whether the UI shows the
// "button label" field). Also expose which variable is the button target.
function getButtonInfo(key) {
  const cta = LAYOUTS[key] && LAYOUTS[key].cta;
  return { hasButton: !!cta, buttonUrlVar: cta ? cta.urlVar : null };
}

module.exports = { buildBodyHtml, getEditableDefaults, getButtonInfo, LAYOUTS };
