const approvals = require('../utils/approvals');

const actorFrom = (req) => ({ id: req.user?.id, name: req.user?.name || req.user?.email, roleName: req.user?.roleName });

// GET /api/approvals/pending — items awaiting approval in modules the user can approve.
exports.listPending = async (req, res) => {
  try {
    const items = await approvals.listPending(req.user, req.query.module);
    res.json({ success: true, data: items, count: items.length, modules: approvals.approvableModules(req.user) });
  } catch (e) {
    console.error('listPending approvals', e);
    res.status(500).json({ success: false, message: 'Failed to load pending approvals' });
  }
};

// GET /api/approvals/count — pending count for the sidebar badge.
exports.count = async (req, res) => {
  try {
    const count = await approvals.pendingCount(req.user);
    res.json({ success: true, count });
  } catch (e) {
    res.json({ success: true, count: 0 });
  }
};

// POST /api/approvals/:module/:id/approve
exports.approve = async (req, res) => {
  try {
    const { module, id } = req.params;
    if (!approvals.canApprove(req.user, module)) {
      return res.status(403).json({ success: false, message: 'You are not authorised to approve this module' });
    }
    const result = await approvals.decide({ module, id, decision: 'APPROVE', actor: actorFrom(req) });
    res.json({ success: true, data: result, message: 'Approved' });
  } catch (e) {
    console.error('approve', e);
    res.status(400).json({ success: false, message: e.message || 'Failed to approve' });
  }
};

// POST /api/approvals/:module/:id/reject   body: { reason }
exports.reject = async (req, res) => {
  try {
    const { module, id } = req.params;
    const { reason } = req.body;
    if (!approvals.canApprove(req.user, module)) {
      return res.status(403).json({ success: false, message: 'You are not authorised to reject this module' });
    }
    const result = await approvals.decide({ module, id, decision: 'REJECT', actor: actorFrom(req), reason });
    res.json({ success: true, data: result, message: 'Rejected' });
  } catch (e) {
    console.error('reject', e);
    res.status(400).json({ success: false, message: e.message || 'Failed to reject' });
  }
};
