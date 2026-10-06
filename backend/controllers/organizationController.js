const { prisma } = require('../config/database');

// Phase-1 advanced user management: departments, teams, reporting structure and
// scoped role assignments. Permission/approval ENFORCEMENT is unchanged in this
// phase — assigning a person's primary role still mirrors to Admin.roleId so the
// existing requirePermission() path keeps working. RoleAssignment is the richer
// source of truth the org UI + (later) workflow engine read.

const isOid = (v) => typeof v === 'string' && /^[a-f\d]{24}$/i.test(v);

// ── Departments ──────────────────────────────────────────────────────────────
const listDepartments = async (req, res) => {
    try {
        const departments = await prisma.department.findMany({ orderBy: { createdAt: 'asc' } });
        res.json({ success: true, data: departments });
    } catch (e) { console.error('listDepartments', e); res.status(500).json({ success: false, message: 'Failed to load departments' }); }
};

const createDepartment = async (req, res) => {
    try {
        const { name, code, description, parentId, headId } = req.body;
        if (!name || !String(name).trim()) return res.status(400).json({ success: false, message: 'Department name is required' });
        const dept = await prisma.department.create({
            data: {
                name: String(name).trim(),
                code: code ? String(code).trim() : null,
                description: description || null,
                parentId: isOid(parentId) ? parentId : null,
                headId: isOid(headId) ? headId : null,
            },
        });
        res.status(201).json({ success: true, message: 'Department created', data: dept });
    } catch (e) { console.error('createDepartment', e); res.status(500).json({ success: false, message: 'Failed to create department' }); }
};

const updateDepartment = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, code, description, parentId, headId, isActive } = req.body;
        const data = {};
        if (name !== undefined) data.name = String(name).trim();
        if (code !== undefined) data.code = code ? String(code).trim() : null;
        if (description !== undefined) data.description = description || null;
        if (parentId !== undefined) data.parentId = isOid(parentId) ? parentId : null;
        if (headId !== undefined) data.headId = isOid(headId) ? headId : null;
        if (isActive !== undefined) data.isActive = !!isActive;
        const dept = await prisma.department.update({ where: { id }, data });
        res.json({ success: true, message: 'Department updated', data: dept });
    } catch (e) { console.error('updateDepartment', e); res.status(500).json({ success: false, message: 'Failed to update department' }); }
};

const deleteDepartment = async (req, res) => {
    try {
        const { id } = req.params;
        const [teams, members, children] = await Promise.all([
            prisma.team.count({ where: { departmentId: id } }),
            prisma.admin.count({ where: { departmentId: id } }),
            prisma.department.count({ where: { parentId: id } }),
        ]);
        if (teams || members || children) {
            return res.status(409).json({ success: false, message: `Cannot delete: ${teams} team(s), ${members} member(s), ${children} sub-department(s) still attached. Reassign them first.` });
        }
        await prisma.roleAssignment.deleteMany({ where: { departmentId: id } });
        await prisma.department.delete({ where: { id } });
        res.json({ success: true, message: 'Department deleted' });
    } catch (e) { console.error('deleteDepartment', e); res.status(500).json({ success: false, message: 'Failed to delete department' }); }
};

// ── Teams ────────────────────────────────────────────────────────────────────
const listTeams = async (req, res) => {
    try {
        const where = {};
        if (isOid(req.query.departmentId)) where.departmentId = req.query.departmentId;
        const teams = await prisma.team.findMany({ where, orderBy: { createdAt: 'asc' } });
        res.json({ success: true, data: teams });
    } catch (e) { console.error('listTeams', e); res.status(500).json({ success: false, message: 'Failed to load teams' }); }
};

const createTeam = async (req, res) => {
    try {
        const { name, departmentId, leadId, description } = req.body;
        if (!name || !String(name).trim()) return res.status(400).json({ success: false, message: 'Team name is required' });
        if (!isOid(departmentId)) return res.status(400).json({ success: false, message: 'A valid department is required' });
        const team = await prisma.team.create({
            data: { name: String(name).trim(), departmentId, leadId: isOid(leadId) ? leadId : null, description: description || null },
        });
        res.status(201).json({ success: true, message: 'Team created', data: team });
    } catch (e) { console.error('createTeam', e); res.status(500).json({ success: false, message: 'Failed to create team' }); }
};

const updateTeam = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, departmentId, leadId, description, isActive } = req.body;
        const data = {};
        if (name !== undefined) data.name = String(name).trim();
        if (departmentId !== undefined && isOid(departmentId)) data.departmentId = departmentId;
        if (leadId !== undefined) data.leadId = isOid(leadId) ? leadId : null;
        if (description !== undefined) data.description = description || null;
        if (isActive !== undefined) data.isActive = !!isActive;
        const team = await prisma.team.update({ where: { id }, data });
        res.json({ success: true, message: 'Team updated', data: team });
    } catch (e) { console.error('updateTeam', e); res.status(500).json({ success: false, message: 'Failed to update team' }); }
};

const deleteTeam = async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.admin.updateMany({ where: { teamId: id }, data: { teamId: null } });
        await prisma.roleAssignment.deleteMany({ where: { teamId: id } });
        await prisma.team.delete({ where: { id } });
        res.json({ success: true, message: 'Team deleted' });
    } catch (e) { console.error('deleteTeam', e); res.status(500).json({ success: false, message: 'Failed to delete team' }); }
};

// ── Org tree (departments → teams → members) ─────────────────────────────────
const getOrgTree = async (req, res) => {
    try {
        const [departments, teams, admins, roles] = await Promise.all([
            prisma.department.findMany({ orderBy: { createdAt: 'asc' } }),
            prisma.team.findMany({ orderBy: { createdAt: 'asc' } }),
            prisma.admin.findMany({ select: { id: true, name: true, email: true, image: true, roleId: true, departmentId: true, teamId: true, reportsToId: true, isActive: true } }),
            prisma.role.findMany({ select: { id: true, name: true, level: true } }),
        ]);
        const roleMap = Object.fromEntries(roles.map((r) => [r.id, r]));
        const memberDto = (a) => ({
            id: a.id, name: a.name, email: a.email, image: a.image, isActive: a.isActive,
            roleId: a.roleId, roleName: roleMap[a.roleId]?.name || null, roleLevel: roleMap[a.roleId]?.level ?? null,
            departmentId: a.departmentId, teamId: a.teamId, reportsToId: a.reportsToId,
        });
        const tree = departments.map((d) => ({
            ...d,
            head: d.headId ? memberDto(admins.find((a) => a.id === d.headId) || {}) : null,
            teams: teams.filter((t) => t.departmentId === d.id).map((t) => ({
                ...t,
                lead: t.leadId ? memberDto(admins.find((a) => a.id === t.leadId) || {}) : null,
                members: admins.filter((a) => a.teamId === t.id).map(memberDto),
            })),
            // Department members not in any team of this dept.
            unassignedMembers: admins.filter((a) => a.departmentId === d.id && !a.teamId).map(memberDto),
        }));
        res.json({ success: true, data: { departments: tree, unassigned: admins.filter((a) => !a.departmentId).map(memberDto) } });
    } catch (e) { console.error('getOrgTree', e); res.status(500).json({ success: false, message: 'Failed to load org structure' }); }
};

// ── People placement ─────────────────────────────────────────────────────────
// Set a person's primary department/team/manager + role. Mirrors the role to
// Admin.roleId (keeps current enforcement working) and upserts a DEPARTMENT-scoped
// RoleAssignment.
const placeMember = async (req, res) => {
    try {
        const { adminId } = req.params;
        const { departmentId, teamId, reportsToId, roleId } = req.body;
        if (!isOid(adminId)) return res.status(400).json({ success: false, message: 'Invalid user' });

        const data = {
            departmentId: isOid(departmentId) ? departmentId : null,
            teamId: isOid(teamId) ? teamId : null,
            reportsToId: isOid(reportsToId) ? reportsToId : null,
        };
        if (isOid(roleId)) data.roleId = roleId; // mirror primary role for back-compat enforcement
        const admin = await prisma.admin.update({ where: { id: adminId }, data });

        // Sync the primary scoped RoleAssignment.
        if (isOid(roleId)) {
            const scopeType = isOid(departmentId) ? 'DEPARTMENT' : 'GLOBAL';
            const existing = await prisma.roleAssignment.findFirst({
                where: { adminId, departmentId: isOid(departmentId) ? departmentId : null },
            });
            if (existing) {
                await prisma.roleAssignment.update({ where: { id: existing.id }, data: { roleId, scopeType, teamId: isOid(teamId) ? teamId : null } });
            } else {
                await prisma.roleAssignment.create({ data: { adminId, roleId, scopeType, departmentId: isOid(departmentId) ? departmentId : null, teamId: isOid(teamId) ? teamId : null } });
            }
        }
        res.json({ success: true, message: 'Member placed', data: { id: admin.id, departmentId: admin.departmentId, teamId: admin.teamId, reportsToId: admin.reportsToId, roleId: admin.roleId } });
    } catch (e) { console.error('placeMember', e); res.status(500).json({ success: false, message: 'Failed to place member' }); }
};

// List a person's scoped role assignments (for the detail view).
const getMemberAssignments = async (req, res) => {
    try {
        const { adminId } = req.params;
        const assignments = await prisma.roleAssignment.findMany({ where: { adminId } });
        res.json({ success: true, data: assignments });
    } catch (e) { console.error('getMemberAssignments', e); res.status(500).json({ success: false, message: 'Failed to load assignments' }); }
};

module.exports = {
    listDepartments, createDepartment, updateDepartment, deleteDepartment,
    listTeams, createTeam, updateTeam, deleteTeam,
    getOrgTree, placeMember, getMemberAssignments,
};
