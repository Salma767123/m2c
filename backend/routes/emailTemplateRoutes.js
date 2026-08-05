const express = require('express');
const router = express.Router();
const {
  getEmailTemplates,
  getEmailTemplate,
  updateEmailTemplate,
  previewEmailTemplate,
  toggleEmailTemplate,
} = require('../controllers/emailTemplateController');
const { authenticateToken, requireAdminRole, requirePermission } = require('../middleware/auth');

// All email-template management is admin-only and gated on settings:edit.
router.use(authenticateToken, requireAdminRole, requirePermission('settings:edit'));

router.get('/', getEmailTemplates);
router.get('/:id', getEmailTemplate);
router.put('/:id', updateEmailTemplate);
router.post('/:id/preview', previewEmailTemplate);
router.patch('/:id/toggle', toggleEmailTemplate);

module.exports = router;
