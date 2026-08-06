const { prisma } = require('../config/database');
const { buildBodyHtml, getButtonInfo } = require('../utils/email/templateLayout');

// Attach UI hints (does the template render a button, and which variable is its
// target) so the editor can show the button-label field conditionally.
function withButtonInfo(t) {
  return { ...t, ...getButtonInfo(t.key) };
}

/**
 * List all email templates, ordered for the admin UI. Admin only.
 */
const getEmailTemplates = async (req, res) => {
  try {
    const templates = await prisma.emailTemplate.findMany({
      orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }, { name: 'asc' }],
    });
    res.json({ success: true, data: templates.map(withButtonInfo) });
  } catch (error) {
    console.error('Get email templates error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch email templates' });
  }
};

/**
 * Fetch a single template by id.
 */
const getEmailTemplate = async (req, res) => {
  try {
    const template = await prisma.emailTemplate.findUnique({ where: { id: req.params.id } });
    if (!template) {
      return res.status(404).json({ success: false, error: 'Email template not found' });
    }
    res.json({ success: true, data: withButtonInfo(template) });
  } catch (error) {
    console.error('Get email template error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch email template' });
  }
};

// Merge stored content with an incoming edit, keeping stored values where the
// request omits a field.
function mergeContent(existing, body) {
  const pick = (key) => (body[key] !== undefined ? body[key] : existing[key]);
  return {
    emoji: pick('emoji'),
    headerTitle: pick('headerTitle'),
    headerSubtitle: pick('headerSubtitle'),
    bodyText: pick('bodyText'),
    buttonLabel: pick('buttonLabel'),
    footerText: pick('footerText'),
  };
}

/**
 * Update a template's structured text content. The send-ready bodyHtml is
 * regenerated from the content + the code-side layout; admins never edit HTML.
 * subject / fromName / name / description are also editable. Admin only.
 */
const updateEmailTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, subject, fromName } = req.body;

    const existing = await prisma.emailTemplate.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Email template not found' });
    }

    if (subject !== undefined && !String(subject).trim()) {
      return res.status(400).json({ success: false, error: 'Subject cannot be empty' });
    }
    if (req.body.headerTitle !== undefined && !String(req.body.headerTitle).trim()) {
      return res.status(400).json({ success: false, error: 'Header title cannot be empty' });
    }
    if (req.body.bodyText !== undefined && !String(req.body.bodyText).trim()) {
      return res.status(400).json({ success: false, error: 'Message cannot be empty' });
    }

    const content = mergeContent(existing, req.body);
    const bodyHtml = buildBodyHtml(existing.key, content);

    const data = { updatedBy: req.userId, ...content, bodyHtml };
    if (name !== undefined) data.name = name;
    if (description !== undefined) data.description = description;
    if (subject !== undefined) data.subject = subject;
    if (fromName !== undefined) data.fromName = fromName || null;

    const updated = await prisma.emailTemplate.update({ where: { id }, data });
    res.json({ success: true, data: withButtonInfo(updated), message: 'Email template updated successfully' });
  } catch (error) {
    console.error('Update email template error:', error);
    res.status(500).json({ success: false, error: 'Failed to update email template' });
  }
};

/**
 * Compose (but do not save) the bodyHtml for a template from draft content, so
 * the editor can show a live preview without duplicating the layout on the
 * client. Returns HTML with {{variables}} intact — the client fills sample
 * values. Admin only.
 */
const previewEmailTemplate = async (req, res) => {
  try {
    const existing = await prisma.emailTemplate.findUnique({ where: { id: req.params.id } });
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Email template not found' });
    }
    const content = mergeContent(existing, req.body || {});
    const html = buildBodyHtml(existing.key, content);
    res.json({ success: true, data: { html, subject: req.body?.subject ?? existing.subject } });
  } catch (error) {
    console.error('Preview email template error:', error);
    res.status(500).json({ success: false, error: 'Failed to preview email template' });
  }
};

/**
 * Enable or disable a template. Security templates cannot be disabled.
 */
const toggleEmailTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    const { enabled } = req.body;

    if (typeof enabled !== 'boolean') {
      return res.status(400).json({ success: false, error: '`enabled` must be a boolean' });
    }

    const existing = await prisma.emailTemplate.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Email template not found' });
    }

    if (existing.isSecurity && enabled === false) {
      return res.status(400).json({
        success: false,
        error: 'Security emails always send and cannot be disabled',
      });
    }

    const updated = await prisma.emailTemplate.update({
      where: { id },
      data: { enabled, updatedBy: req.userId },
    });
    res.json({
      success: true,
      data: withButtonInfo(updated),
      message: `Email "${updated.name}" ${enabled ? 'enabled' : 'disabled'}`,
    });
  } catch (error) {
    console.error('Toggle email template error:', error);
    res.status(500).json({ success: false, error: 'Failed to update email template' });
  }
};

module.exports = {
  getEmailTemplates,
  getEmailTemplate,
  updateEmailTemplate,
  previewEmailTemplate,
  toggleEmailTemplate,
};
