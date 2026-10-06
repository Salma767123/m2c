const express = require('express');
const router = express.Router();
const { authenticateToken, requireAdminRole, requirePermission } = require('../middleware/auth');
const ctrl = require('../controllers/organizationController');

router.use(authenticateToken, requireAdminRole);

// Read
router.get('/tree', requirePermission('organization:view'), ctrl.getOrgTree);
router.get('/departments', requirePermission('organization:view'), ctrl.listDepartments);
router.get('/teams', requirePermission('organization:view'), ctrl.listTeams);
router.get('/members/:adminId/assignments', requirePermission('organization:view'), ctrl.getMemberAssignments);

// Departments
router.post('/departments', requirePermission('organization:create'), ctrl.createDepartment);
router.put('/departments/:id', requirePermission('organization:edit'), ctrl.updateDepartment);
router.delete('/departments/:id', requirePermission('organization:delete'), ctrl.deleteDepartment);

// Teams
router.post('/teams', requirePermission('organization:create'), ctrl.createTeam);
router.put('/teams/:id', requirePermission('organization:edit'), ctrl.updateTeam);
router.delete('/teams/:id', requirePermission('organization:delete'), ctrl.deleteTeam);

// People placement / role assignment
router.post('/members/:adminId/place', requirePermission(['organization:assign_roles', 'organization:edit']), ctrl.placeMember);

module.exports = router;
