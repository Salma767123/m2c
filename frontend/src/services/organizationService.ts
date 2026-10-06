import axios from '@/lib/axios';

export interface OrgMember {
  id: string;
  name: string;
  email?: string;
  image?: string | null;
  isActive?: boolean;
  roleId?: string | null;
  roleName?: string | null;
  roleLevel?: number | null;
  departmentId?: string | null;
  teamId?: string | null;
  reportsToId?: string | null;
}

export interface OrgTeam {
  id: string;
  name: string;
  departmentId: string;
  leadId?: string | null;
  description?: string | null;
  isActive: boolean;
  lead?: OrgMember | null;
  members: OrgMember[];
}

export interface OrgDepartment {
  id: string;
  name: string;
  code?: string | null;
  description?: string | null;
  parentId?: string | null;
  headId?: string | null;
  isActive: boolean;
  head?: OrgMember | null;
  teams: OrgTeam[];
  unassignedMembers: OrgMember[];
}

export interface OrgTree {
  departments: OrgDepartment[];
  unassigned: OrgMember[];
}

export interface RoleAssignment {
  id: string;
  adminId: string;
  roleId: string;
  scopeType: 'GLOBAL' | 'DEPARTMENT' | 'TEAM';
  departmentId?: string | null;
  teamId?: string | null;
}

class OrganizationService {
  async getTree(): Promise<{ success: boolean; data: OrgTree }> {
    const res = await axios.get('/organization/tree');
    return res.data;
  }
  // Departments
  async createDepartment(body: { name: string; code?: string; description?: string; parentId?: string; headId?: string }) {
    const res = await axios.post('/organization/departments', body);
    return res.data as { success: boolean; message: string; data: OrgDepartment };
  }
  async updateDepartment(id: string, body: Partial<{ name: string; code: string; description: string; parentId: string | null; headId: string | null; isActive: boolean }>) {
    const res = await axios.put(`/organization/departments/${id}`, body);
    return res.data as { success: boolean; message: string; data: OrgDepartment };
  }
  async deleteDepartment(id: string) {
    const res = await axios.delete(`/organization/departments/${id}`);
    return res.data as { success: boolean; message: string };
  }
  // Teams
  async createTeam(body: { name: string; departmentId: string; leadId?: string; description?: string }) {
    const res = await axios.post('/organization/teams', body);
    return res.data as { success: boolean; message: string; data: OrgTeam };
  }
  async updateTeam(id: string, body: Partial<{ name: string; departmentId: string; leadId: string | null; description: string; isActive: boolean }>) {
    const res = await axios.put(`/organization/teams/${id}`, body);
    return res.data as { success: boolean; message: string; data: OrgTeam };
  }
  async deleteTeam(id: string) {
    const res = await axios.delete(`/organization/teams/${id}`);
    return res.data as { success: boolean; message: string };
  }
  // People placement
  async placeMember(adminId: string, body: { departmentId?: string | null; teamId?: string | null; reportsToId?: string | null; roleId?: string | null }) {
    const res = await axios.post(`/organization/members/${adminId}/place`, body);
    return res.data as { success: boolean; message: string };
  }
}

export const organizationService = new OrganizationService();
export default organizationService;
