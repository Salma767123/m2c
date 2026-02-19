const nodemailer = require('nodemailer');

// Create reusable transporter
const createTransporter = () => {
    return nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true', // true for 465, false for 587
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
    });
};

/**
 * Send vendor approval email with registration link
 */
const sendVendorApprovalEmail = async ({ to, name, companyName, registrationLink }) => {
    const transporter = createTransporter();

    const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Vendor Application Approved</title>
    </head>
    <body style="margin:0;padding:0;background-color:#f4f4f5;font-family:'Segoe UI',Arial,sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:40px 0;">
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
              
              <!-- Header -->
              <tr>
                <td style="background-color:#111827;padding:40px 40px 32px;text-align:center;">
                  <div style="display:inline-block;background-color:#fff;border-radius:50%;width:60px;height:60px;line-height:60px;text-align:center;margin-bottom:16px;">
                    <span style="font-size:28px;">🏪</span>
                  </div>
                  <h1 style="margin:0;color:#ffffff;font-size:26px;font-weight:700;letter-spacing:-0.5px;">Application Approved!</h1>
                  <p style="margin:8px 0 0;color:#9ca3af;font-size:14px;">Your vendor application has been reviewed and approved</p>
                </td>
              </tr>

              <!-- Body -->
              <tr>
                <td style="padding:40px;">
                  <p style="margin:0 0 16px;color:#374151;font-size:16px;line-height:1.6;">
                    Dear <strong>${name}</strong>,
                  </p>
                  <p style="margin:0 0 16px;color:#374151;font-size:16px;line-height:1.6;">
                    Congratulations! We are pleased to inform you that your application for <strong>${companyName}</strong> to join our vendor marketplace has been <strong style="color:#16a34a;">approved</strong>.
                  </p>
                  <p style="margin:0 0 28px;color:#374151;font-size:16px;line-height:1.6;">
                    Please click the button below to complete your vendor registration and set up your account:
                  </p>

                  <!-- CTA Button -->
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td align="center" style="padding:0 0 32px;">
                        <a href="${registrationLink}" 
                           style="display:inline-block;background-color:#111827;color:#ffffff;text-decoration:none;padding:16px 40px;border-radius:8px;font-size:16px;font-weight:600;letter-spacing:0.3px;">
                          Complete Registration →
                        </a>
                      </td>
                    </tr>
                  </table>

                  <!-- Info Box -->
                  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;">
                    <tr>
                      <td style="padding:16px 20px;">
                        <p style="margin:0;color:#166534;font-size:14px;line-height:1.6;">
                          <strong>⚠️ Important:</strong> This registration link is unique to you. Please do not share it with others.
                          Complete your registration to start listing your products on our marketplace.
                        </p>
                      </td>
                    </tr>
                  </table>

                  <p style="margin:28px 0 0;color:#6b7280;font-size:14px;line-height:1.6;">
                    If the button doesn't work, copy and paste this link into your browser:<br>
                    <a href="${registrationLink}" style="color:#4f46e5;word-break:break-all;">${registrationLink}</a>
                  </p>
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td style="background-color:#f9fafb;border-top:1px solid #e5e7eb;padding:24px 40px;text-align:center;">
                  <p style="margin:0;color:#9ca3af;font-size:13px;">
                    This email was sent by the Marketplace Admin Team.<br>
                    If you did not apply, please ignore this email.
                  </p>
                </td>
              </tr>

            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

    await transporter.sendMail({
        from: `"Marketplace Team" <${process.env.SMTP_USER}>`,
        to,
        subject: `🎉 Vendor Application Approved – Complete Your Registration`,
        html,
    });
};

/**
 * Send vendor rejection email
 */
const sendVendorRejectionEmail = async ({ to, name, companyName }) => {
    const transporter = createTransporter();

    const html = `
    <!DOCTYPE html>
    <html>
    <body style="margin:0;padding:0;background-color:#f4f4f5;font-family:'Segoe UI',Arial,sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:40px 0;">
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
              <tr>
                <td style="background-color:#111827;padding:40px;text-align:center;">
                  <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;">Application Status Update</h1>
                </td>
              </tr>
              <tr>
                <td style="padding:40px;">
                  <p style="color:#374151;font-size:16px;">Dear <strong>${name}</strong>,</p>
                  <p style="color:#374151;font-size:16px;line-height:1.6;">
                    Thank you for your interest in partnering with us. After reviewing your application for <strong>${companyName}</strong>, 
                    we regret to inform you that we are unable to approve your application at this time.
                  </p>
                  <p style="color:#374151;font-size:16px;line-height:1.6;">
                    We encourage you to apply again in the future. If you have any questions, please contact our support team.
                  </p>
                </td>
              </tr>
              <tr>
                <td style="background-color:#f9fafb;border-top:1px solid #e5e7eb;padding:24px 40px;text-align:center;">
                  <p style="margin:0;color:#9ca3af;font-size:13px;">Marketplace Admin Team</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

    await transporter.sendMail({
        from: `"Marketplace Team" <${process.env.SMTP_USER}>`,
        to,
        subject: `Vendor Application Status – ${companyName}`,
        html,
    });
};

module.exports = { sendVendorApprovalEmail, sendVendorRejectionEmail };
