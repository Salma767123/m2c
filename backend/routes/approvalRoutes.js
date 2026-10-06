const express = require('express');
const router = express.Router();
const { authenticateToken, requireAdminRole } = require('../middleware/auth');
const ctrl = require('../controllers/approvalController');

// All approval endpoints are admin-only. Per-module authorisation (who can
// approve what) is enforced inside the controller via approvals.canApprove().
router.use(authenticateToken, requireAdminRole);

router.get('/pending', ctrl.listPending);
router.get('/count', ctrl.count);
router.post('/:module/:id/approve', ctrl.approve);
router.post('/:module/:id/reject', ctrl.reject);

module.exports = router;
