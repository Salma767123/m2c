const express = require('express');
const router = express.Router();
const { authenticateToken, requireAdminRole, requirePermission } = require('../middleware/auth');
const ctrl = require('../controllers/returnController');

// Everything here needs a signed-in user (customer or admin).
router.use(authenticateToken);

// ── Customer self-service ───────────────────────────────────────────────────
router.post('/', ctrl.createReturnRequest);
router.get('/mine', ctrl.getMyReturns);
router.get('/mine/:id', ctrl.getMyReturnById);
router.post('/mine/:id/cancel', ctrl.cancelMyReturn);

// ── Admin (Returns & Replacements module) ───────────────────────────────────
router.get('/admin', requireAdminRole, requirePermission('returns:view'), ctrl.getAllReturns);
router.get('/admin/:id', requireAdminRole, requirePermission('returns:view'), ctrl.getReturnByIdAdmin);
router.post('/admin/:id/decision', requireAdminRole, requirePermission('returns:manage'), ctrl.decideReturn);
router.post('/admin/:id/status', requireAdminRole, requirePermission('returns:manage'), ctrl.advanceReturnStatus);

module.exports = router;
