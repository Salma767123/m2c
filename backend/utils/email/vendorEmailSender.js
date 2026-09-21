const { prisma } = require("../../config/database");
const { sendTemplatedEmail } = require("../emailTemplateRenderer");

/**
 * Vendor-facing emails.
 *
 * These are now DB-driven: subject/body live in the EmailTemplate collection and
 * are edited in the admin UI (Settings → Email Templates). Each function keeps its
 * original signature so callers (vendorController, lowStockAlert) are untouched;
 * it just builds the flat {{variable}} data and renders/sends by template key.
 *
 * Public links use the real public site, NOT FRONTEND_URL (that is localhost in
 * development and feeds CORS/OAuth redirects, not vendor-facing emails).
 */
const publicSite = () => process.env.PUBLIC_SITE_URL || 'https://m2cmarkdowns.com';

/**
 * Approve a registered vendor and email their login credentials.
 */
async function sendVendorApprovalEmail({ companyName, ownerName, email, password }) {
  return sendTemplatedEmail({
    key: 'vendor_approval_credentials',
    to: email,
    data: {
      companyName,
      ownerName,
      email,
      password,
      loginUrl: `${publicSite()}/vendor`,
    },
  });
}

/**
 * Notify a vendor their application was rejected.
 */
async function sendVendorRejectionEmail({ companyName, ownerName, email, reason }) {
  return sendTemplatedEmail({
    key: 'vendor_rejection',
    to: email,
    data: { companyName, ownerName, reason },
  });
}

/**
 * Notify a vendor their account was suspended.
 */
async function sendVendorSuspensionEmail({ companyName, ownerName, email, reason }) {
  return sendTemplatedEmail({
    key: 'vendor_suspension',
    to: email,
    data: { companyName, ownerName, reason },
  });
}

/**
 * Email configured admins when a new vendor submits a registration.
 * Recipients come from vendorNotificationSettings; if none are configured we
 * send to no one (unchanged behaviour).
 */
async function sendNewVendorRegistrationEmailToAdmins({ companyName, ownerName, vendorEmail, vendorPhone, city, state }) {
  try {
    let adminEmails = [];
    try {
      const notifSettings = await prisma.vendorNotificationSettings.findFirst();
      if (notifSettings && notifSettings.emails && notifSettings.emails.length > 0) {
        adminEmails = notifSettings.emails;
      }
    } catch {
      // Table may not exist yet — fall through to fallback
    }

    // No recipients configured → don't send to anyone.
    if (adminEmails.length === 0) return;

    const result = await sendTemplatedEmail({
      key: 'new_vendor_registration_admin',
      to: adminEmails.join(', '),
      data: {
        companyName,
        ownerName,
        vendorEmail,
        phoneDisplay: vendorPhone || 'N/A',
        locationDisplay: [city, state].filter(Boolean).join(', ') || 'N/A',
        reviewUrl: `${publicSite()}/admin/dashboard/vendors`,
      },
    });

    if (result.sent) {
      console.log(`✅ New vendor registration email sent to ${adminEmails.length} admin(s)`);
    }
  } catch (error) {
    console.error('❌ Failed to send new vendor registration email to admins:', error);
  }
}

/**
 * Send a low-stock alert to a vendor.
 *
 * `lowUnits` is an array of { label, sku, stock, threshold } — the base product
 * and/or specific variants at/below their alert level. The rows + surrounding
 * table (previously a conditional block in the template) are pre-computed here
 * into the single {{unitsSection}} variable.
 */
async function sendLowStockAlertEmail({ to, companyName, ownerName, productName, category, sku, currentStock, minStock, lowUnits }) {
  const rows = (lowUnits || []).map(u => `
            <tr style="border-bottom:1px solid #e5e7eb;">
              <td style="padding:10px 12px;color:#111827;font-weight:600;">${u.label}</td>
              <td style="padding:10px 12px;color:#6b7280;font-family:monospace;font-size:13px;">${u.sku || '—'}</td>
              <td style="padding:10px 12px;text-align:center;color:#dc2626;font-weight:700;">${u.stock}</td>
              <td style="padding:10px 12px;text-align:center;color:#6b7280;">${u.threshold}</td>
            </tr>`).join('');

  const unitsSection = rows ? `
              <p style="margin:0 0 10px;color:#374151;font-size:14px;font-weight:600;">Units at or below their alert level:</p>
              <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;margin-bottom:24px;">
                <tr style="background:#f9fafb;">
                  <th align="left" style="padding:10px 12px;color:#6b7280;font-size:12px;text-transform:uppercase;letter-spacing:0.04em;">Unit</th>
                  <th align="left" style="padding:10px 12px;color:#6b7280;font-size:12px;text-transform:uppercase;letter-spacing:0.04em;">SKU</th>
                  <th align="center" style="padding:10px 12px;color:#6b7280;font-size:12px;text-transform:uppercase;letter-spacing:0.04em;">Stock</th>
                  <th align="center" style="padding:10px 12px;color:#6b7280;font-size:12px;text-transform:uppercase;letter-spacing:0.04em;">Alert at</th>
                </tr>
                ${rows}
              </table>` : '';

  return sendTemplatedEmail({
    key: 'low_stock_alert',
    to,
    data: {
      greetingName: ownerName || companyName,
      companyName,
      productName,
      skuDisplay: sku || '—',
      categoryDisplay: category || '—',
      currentStock,
      minStock,
      unitsSection,
      dashboardUrl: `${publicSite()}/vendor/dashboard/inventory`,
    },
  });
}

/**
 * Email a vendor that the admin has assigned them an order to deliver to a hub.
 * Fire-and-forget from the caller — never blocks the assignment response.
 */
async function sendVendorOrderAssignedEmail({ to, companyName, ownerName, orderId, itemCount, hubName, hubAddress }) {
  if (!to) return { success: false, skipped: 'no recipient' };
  return sendTemplatedEmail({
    key: 'vendor_order_assigned',
    to,
    data: {
      greetingName: ownerName || companyName || 'Vendor',
      companyName: companyName || 'your store',
      orderId: orderId || '',
      itemCount: itemCount != null ? String(itemCount) : '—',
      hubName: hubName || '—',
      hubAddress: hubAddress || '—',
      dashboardUrl: `${publicSite()}/vendor/dashboard/orders`,
    },
  });
}

/**
 * Generate a secure random password
 */
function generateSecurePassword(length = 12) {
  const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
  let password = "";
  for (let i = 0; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return password;
}

module.exports = {
  sendVendorApprovalEmail,
  sendVendorRejectionEmail,
  sendVendorSuspensionEmail,
  sendNewVendorRegistrationEmailToAdmins,
  sendLowStockAlertEmail,
  sendVendorOrderAssignedEmail,
  generateSecurePassword
};
