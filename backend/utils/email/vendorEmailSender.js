const { sendEmail: sendSMTPEmail, sendEmailWithEnv } = require("../../config/connectSMTP");
const { prisma } = require("../../config/database");
const bcrypt = require('bcryptjs');

/**
 * Send email using centralized SMTP configuration
 */
async function sendVendorEmail(emailData) {
  try {
    let result;
    
    try {
      // Try to get active email configuration from database
      const emailConfig = await prisma.emailConfiguration.findFirst({
        where: { isActive: true }
      });
      
      if (emailConfig) {
        // Use database SMTP configuration
        result = await sendSMTPEmail(emailConfig, emailData);
      } else {
        // Fallback to environment variables
        result = await sendEmailWithEnv(emailData);
      }
    } catch (dbError) {
      // If emailConfiguration table doesn't exist, fallback to environment variables
      console.log("📧 Email configuration table not found, using environment variables");
      result = await sendEmailWithEnv(emailData);
    }

    if (!result.success) {
      throw new Error(result.message || 'Failed to send email');
    }
    
    return result;
  } catch (error) {
    console.error("❌ Vendor email sending error:", error);
    throw error;
  }
}

/**
 * Generate vendor approval email template
 */
function getVendorApprovalEmailTemplate({ companyName, ownerName, email, password, loginUrl }) {
  const subject = `🎉 Welcome to Our Platform - Your Vendor Account is Approved!`;
  
  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Vendor Account Approved</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .credentials-box { background: #fff; border: 2px solid #4CAF50; border-radius: 8px; padding: 20px; margin: 20px 0; }
            .button { display: inline-block; background: #4CAF50; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 20px 0; }
            .warning { background: #fff3cd; border: 1px solid #ffeaa7; color: #856404; padding: 15px; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🎉 Congratulations!</h1>
                <p>Your vendor application has been approved</p>
            </div>
            
            <div class="content">
                <h2>Welcome to Our Platform, ${companyName}!</h2>
                
                <p>Dear ${ownerName},</p>
                
                <p>We're excited to inform you that your vendor application for <strong>${companyName}</strong> has been approved! You can now access your vendor dashboard and start managing your business on our platform.</p>
                
                <div class="credentials-box">
                    <h3>🔐 Your Login Credentials</h3>
                    <p><strong>Email:</strong> ${email}</p>
                    <p><strong>Password:</strong> <code style="background: #f0f0f0; padding: 2px 6px; border-radius: 3px;">${password}</code></p>
                    <p><strong>Login URL:</strong> <a href="${loginUrl}">${loginUrl}</a></p>
                </div>
                
                <div class="warning">
                    <strong>⚠️ Important Security Notice:</strong>
                    <ul>
                        <li>Please change your password immediately after your first login</li>
                        <li>Keep your login credentials secure and don't share them with anyone</li>
                        <li>Use a strong, unique password for your account</li>
                    </ul>
                </div>
                
                <div style="text-align: center;">
                    <a href="${loginUrl}" class="button">Access Your Dashboard</a>
                </div>
                
                <h3>What's Next?</h3>
                <ul>
                    <li>Complete your vendor profile setup</li>
                    <li>Upload your product catalog</li>
                    <li>Configure your business settings</li>
                    <li>Start receiving orders from customers</li>
                </ul>
                
                <p>If you have any questions or need assistance, please don't hesitate to contact our support team.</p>
                
                <p>Welcome aboard!</p>
                
                <p>Best regards,<br>
                <strong>The Platform Team</strong></p>
            </div>
            
            <div class="footer">
                <p>This is an automated message. Please do not reply to this email.</p>
                <p>If you need help, contact our support team.</p>
            </div>
        </div>
    </body>
    </html>
  `;

  return { subject, html };
}

/**
 * Generate vendor rejection email template
 */
function getVendorRejectionEmailTemplate({ companyName, ownerName, email, reason }) {
  const subject = `Application Status Update - ${companyName}`;
  
  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Vendor Application Update</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #dc3545; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .reason-box { background: #fff; border-left: 4px solid #dc3545; padding: 20px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>Application Status Update</h1>
                <p>Regarding your vendor application</p>
            </div>
            
            <div class="content">
                <p>Dear ${ownerName},</p>
                
                <p>Thank you for your interest in becoming a vendor on our platform. After careful review of your application for <strong>${companyName}</strong>, we regret to inform you that we cannot approve your application at this time.</p>
                
                <div class="reason-box">
                    <h3>Reason for Decision:</h3>
                    <p>${reason}</p>
                </div>
                
                <p>We encourage you to address the mentioned concerns and reapply in the future. Our platform is always looking for quality vendors who meet our standards.</p>
                
                <p>If you have any questions about this decision or need clarification on the requirements, please feel free to contact our support team.</p>
                
                <p>Thank you for your understanding.</p>
                
                <p>Best regards,<br>
                <strong>The Platform Team</strong></p>
            </div>
            
            <div class="footer">
                <p>This is an automated message. Please do not reply to this email.</p>
                <p>If you need help, contact our support team.</p>
            </div>
        </div>
    </body>
    </html>
  `;

  return { subject, html };
}

/**
 * Generate vendor suspension email template
 */
function getVendorSuspensionEmailTemplate({ companyName, ownerName, email, reason }) {
  const subject = `Account Suspension Notice - ${companyName}`;
  
  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Account Suspension Notice</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #ff9800; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .reason-box { background: #fff; border-left: 4px solid #ff9800; padding: 20px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>⚠️ Account Suspension Notice</h1>
                <p>Important update regarding your vendor account</p>
            </div>
            
            <div class="content">
                <p>Dear ${ownerName},</p>
                
                <p>We are writing to inform you that your vendor account for <strong>${companyName}</strong> has been temporarily suspended from our platform.</p>
                
                <div class="reason-box">
                    <h3>Reason for Suspension:</h3>
                    <p>${reason}</p>
                </div>
                
                <p>During the suspension period, you will not be able to:</p>
                <ul>
                    <li>Access your vendor dashboard</li>
                    <li>Receive new orders</li>
                    <li>Update your product listings</li>
                    <li>Process payments</li>
                </ul>
                
                <p>To resolve this issue and reactivate your account, please contact our support team immediately. We are here to help you address the concerns and get your account back in good standing.</p>
                
                <p>We value your partnership and hope to resolve this matter quickly.</p>
                
                <p>Best regards,<br>
                <strong>The Platform Team</strong></p>
            </div>
            
            <div class="footer">
                <p>This is an automated message. Please do not reply to this email.</p>
                <p>If you need help, contact our support team immediately.</p>
            </div>
        </div>
    </body>
    </html>
  `;

  return { subject, html };
}

/**
 * Send approval email with credentials to vendor
 */
async function sendVendorApprovalEmail({ companyName, ownerName, email, password }) {
  const loginUrl = process.env.FRONTEND_URL ? `${process.env.FRONTEND_URL}/vendor` : 'http://localhost:3000/vendor';
  
  const emailTemplate = getVendorApprovalEmailTemplate({ 
    companyName, 
    ownerName, 
    email, 
    password,
    loginUrl
  });

  return await sendVendorEmail({
    to: email,
    subject: emailTemplate.subject,
    html: emailTemplate.html,
  });
}

/**
 * Send rejection email to vendor
 */
async function sendVendorRejectionEmail({ companyName, ownerName, email, reason }) {
  const emailTemplate = getVendorRejectionEmailTemplate({ 
    companyName, 
    ownerName, 
    email, 
    reason 
  });

  return await sendVendorEmail({
    to: email,
    subject: emailTemplate.subject,
    html: emailTemplate.html,
  });
}

/**
 * Send suspension email to vendor
 */
async function sendVendorSuspensionEmail({ companyName, ownerName, email, reason }) {
  const emailTemplate = getVendorSuspensionEmailTemplate({ 
    companyName, 
    ownerName, 
    email, 
    reason 
  });

  return await sendVendorEmail({
    to: email,
    subject: emailTemplate.subject,
    html: emailTemplate.html,
  });
}

/**
 * Send email to all admins when a new vendor registers
 */
async function sendNewVendorRegistrationEmailToAdmins({ companyName, ownerName, vendorEmail, vendorPhone, city, state }) {
  try {
    // Check if specific notification emails are configured
    let adminEmails = [];
    try {
      const notifSettings = await prisma.vendorNotificationSettings.findFirst();
      if (notifSettings && notifSettings.emails && notifSettings.emails.length > 0) {
        adminEmails = notifSettings.emails;
      }
    } catch {
      // Table may not exist yet — fall through to fallback
    }

    // Fallback: if no emails configured, don't send to anyone
    if (adminEmails.length === 0) return;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: #1a1a2e; color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
          <h1 style="margin: 0; font-size: 22px;">New Vendor Registration</h1>
        </div>
        <div style="border: 1px solid #e5e7eb; border-top: none; padding: 24px; border-radius: 0 0 8px 8px;">
          <p style="color: #374151; font-size: 16px;">A new vendor has submitted a registration application.</p>
          <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
            <tr style="border-bottom: 1px solid #e5e7eb;">
              <td style="padding: 10px 0; color: #6b7280; width: 40%;">Company Name</td>
              <td style="padding: 10px 0; font-weight: 600; color: #111827;">${companyName}</td>
            </tr>
            <tr style="border-bottom: 1px solid #e5e7eb;">
              <td style="padding: 10px 0; color: #6b7280;">Owner Name</td>
              <td style="padding: 10px 0; font-weight: 600; color: #111827;">${ownerName}</td>
            </tr>
            <tr style="border-bottom: 1px solid #e5e7eb;">
              <td style="padding: 10px 0; color: #6b7280;">Email</td>
              <td style="padding: 10px 0; color: #111827;">${vendorEmail}</td>
            </tr>
            <tr style="border-bottom: 1px solid #e5e7eb;">
              <td style="padding: 10px 0; color: #6b7280;">Phone</td>
              <td style="padding: 10px 0; color: #111827;">${vendorPhone || 'N/A'}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0; color: #6b7280;">Location</td>
              <td style="padding: 10px 0; color: #111827;">${[city, state].filter(Boolean).join(', ') || 'N/A'}</td>
            </tr>
          </table>
          <div style="text-align: center; margin-top: 24px;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/admin/dashboard/vendors"
               style="display: inline-block; background: #2563eb; color: white; padding: 12px 28px; border-radius: 6px; text-decoration: none; font-weight: 600;">
              Review Application
            </a>
          </div>
          <p style="color: #9ca3af; font-size: 13px; margin-top: 20px; text-align: center;">
            Please review and take action on this vendor application.
          </p>
        </div>
      </div>
    `;

    await sendVendorEmail({
      to: adminEmails.join(', '),
      subject: `New Vendor Registration — ${companyName}`,
      html
    });

    console.log(`✅ New vendor registration email sent to ${adminEmails.length} admin(s)`);
  } catch (error) {
    console.error('❌ Failed to send new vendor registration email to admins:', error);
  }
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
  generateSecurePassword
};