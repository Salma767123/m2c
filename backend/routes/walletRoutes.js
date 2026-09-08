const express = require('express');
const router = express.Router();
const { authenticateToken, requireAdminRole, requirePermission } = require('../middleware/auth');
const ctrl = require('../controllers/walletController');

router.use(authenticateToken);

// ── Customer ──
router.get('/mine', ctrl.getMyWallet);

// ── Admin ──
router.get('/admin', requireAdminRole, requirePermission('wallet:view'), ctrl.getAllWallets);
router.get('/admin/:customerId', requireAdminRole, requirePermission('wallet:view'), ctrl.getWalletByCustomer);
router.post('/admin/:customerId/adjust', requireAdminRole, requirePermission('wallet:adjust'), ctrl.adjustWallet);

module.exports = router;
