const nodemailer = require('nodemailer');
const { prisma } = require('../config/database');

/**
 * DB-driven email templates.
 *
 * Templates live in the `email_templates` collection (model EmailTemplate) and
 * are edited by admins in Settings → Email Templates. Backend code no longer
 * hardcodes subject/body HTML; instead it renders a template by its stable
 * `key` and passes a flat `data` object of already-computed string values.
 *
 * The renderer does SIMPLE {{variable}} substitution only — no conditionals or
 * loops. Any per-send logic (ternaries, .map() rows, optional blocks) is
 * pre-computed by the caller into a single variable string.
 */

// Default sender name when a template has no fromName set.
const DEFAULT_FROM_NAME = 'M2C MarkDowns';

// Reusable transporter — mirrors the env-based config the legacy senders used.
const createTransporter = () =>
  nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    tls: { rejectUnauthorized: false },
  });

/**
 * Replace every {{ key }} (whitespace tolerant) in `str` with data[key].
 * Missing / null / undefined values become an empty string. Unknown placeholders
 * are left blank so a stray variable never leaks raw `{{ }}` into an email.
 */
const interpolate = (str, data = {}) => {
  if (!str) return '';
  return str.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_match, key) => {
    const value = data[key];
    return value === undefined || value === null ? '' : String(value);
  });
};

/**
 * Fetch a template by key and render its subject + html against `data`.
 * Returns null if no such template row exists.
 */
const renderEmailTemplate = async (key, data = {}) => {
  const tpl = await prisma.emailTemplate.findUnique({ where: { key } });
  if (!tpl) return null;
  return {
    key: tpl.key,
    enabled: tpl.enabled,
    isSecurity: tpl.isSecurity,
    fromName: tpl.fromName || DEFAULT_FROM_NAME,
    subject: interpolate(tpl.subject, data),
    html: interpolate(tpl.bodyHtml, data),
  };
};

/**
 * Render a template by key and send it.
 *
 * Behaviour:
 *  - Template row missing        → { sent: false, reason: 'not_found' }  (caller may fall back)
 *  - Disabled & not a security   → { sent: false, reason: 'disabled' }   (intentionally skipped)
 *  - Otherwise                   → sends and returns { sent: true, messageId }
 *
 * Security templates (password reset, email verification) always send even when
 * `enabled` is false — they are never toggleable in the UI.
 *
 * Never throws on a send failure; returns { sent: false, reason: 'error', error }
 * so a failed notification can't break the parent request. Callers that must
 * know (e.g. a "resend credentials" action) can inspect the result.
 *
 * @param {Object} opts
 * @param {string} opts.key       Template key
 * @param {string|string[]} opts.to  Recipient(s)
 * @param {Object} [opts.data]    Flat map of {{variable}} values
 * @param {Array}  [opts.attachments]  nodemailer attachments
 * @param {string} [opts.replyTo]
 */
const sendTemplatedEmail = async ({ key, to, data = {}, attachments = [], replyTo }) => {
  try {
    const rendered = await renderEmailTemplate(key, data);

    if (!rendered) {
      console.warn(`[emailTemplate] No template found for key "${key}" — email not sent`);
      return { sent: false, reason: 'not_found' };
    }

    if (!rendered.enabled && !rendered.isSecurity) {
      console.log(`[emailTemplate] Template "${key}" is disabled — skipping send to ${to}`);
      return { sent: false, reason: 'disabled' };
    }

    const transporter = createTransporter();
    const fromEmail = process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER;

    const result = await transporter.sendMail({
      from: `"${rendered.fromName}" <${fromEmail}>`,
      to,
      subject: rendered.subject,
      html: rendered.html,
      attachments,
      ...(replyTo ? { replyTo } : {}),
    });

    return { sent: true, messageId: result.messageId };
  } catch (error) {
    console.error(`[emailTemplate] Failed to send "${key}" to ${to}:`, error.message);
    return { sent: false, reason: 'error', error };
  }
};

module.exports = {
  interpolate,
  renderEmailTemplate,
  sendTemplatedEmail,
  DEFAULT_FROM_NAME,
};
