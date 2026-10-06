const express = require('express');
const router = express.Router();
const { authenticateToken, requireAdminRole, requirePermission } = require('../middleware/auth');
const ctrl = require('../controllers/workflowController');

router.use(authenticateToken, requireAdminRole);

// --- Personal inbox (any admin with my_tasks:view) ---
router.get('/my-tasks', requirePermission('my_tasks:view'), ctrl.myTasks);
router.post('/tasks/:id/act', requirePermission(['my_tasks:act', 'my_tasks:view']), ctrl.actOnTask);

// --- Delegation (cover-my-tasks; self-service, gated by my_tasks:view) ---
router.get('/delegations', requirePermission('my_tasks:view'), ctrl.myDelegations);
router.post('/delegations', requirePermission('my_tasks:view'), ctrl.createDelegation);
router.post('/delegations/:id/end', requirePermission('my_tasks:view'), ctrl.endDelegation);

// --- Dashboard ---
router.get('/stats', requirePermission('workflows:view'), ctrl.getStats);

// --- Definitions (workflow builder / management) ---
router.get('/definitions', requirePermission('workflows:view'), ctrl.listDefinitions);
router.get('/definitions/:id', requirePermission('workflows:view'), ctrl.getDefinition);
router.post('/definitions', requirePermission('workflows:create'), ctrl.createDefinition);
router.put('/definitions/:id', requirePermission('workflows:edit'), ctrl.updateDefinition);
router.delete('/definitions/:id', requirePermission('workflows:delete'), ctrl.deleteDefinition);

// --- Instances ---
router.get('/instances', requirePermission('workflows:view'), ctrl.listInstances);
router.get('/instances/:id', requirePermission('workflows:view'), ctrl.getInstance);
router.post('/instances', requirePermission(['workflows:start', 'workflows:create']), ctrl.startInstance);
router.post('/instances/:id/cancel', requirePermission(['workflows:cancel', 'workflows:edit']), ctrl.cancelInstance);

module.exports = router;
