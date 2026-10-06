import axios from '@/lib/axios';

export type WorkflowAction = 'APPROVE' | 'REJECT' | 'ASSIGN' | 'SUBMIT' | 'REQUEST_CHANGES';
export type AssigneeType = 'ROLE' | 'DEPARTMENT' | 'TEAM' | 'USER' | 'INITIATOR' | 'DEPT_HEAD' | 'TEAM_LEAD' | 'DYNAMIC';
export type InstanceStatus = 'ACTIVE' | 'COMPLETED' | 'REJECTED' | 'CANCELLED';

export interface WorkflowStage {
  id?: string;
  definitionId?: string;
  order: number;
  name: string;
  description?: string | null;
  assigneeType: AssigneeType;
  assigneeRoleId?: string | null;
  assigneeDepartmentId?: string | null;
  assigneeTeamId?: string | null;
  assigneeAdminId?: string | null;
  assignedByStageOrder?: number | null;
  actions: WorkflowAction[];
  onApprove: string; // NEXT | COMPLETE | PREVIOUS | REJECT_END | order:N
  onReject: string;
  requiresComment: boolean;
  allowReassign: boolean;
  slaHours?: number | null;
}

export interface WorkflowDefinition {
  id: string;
  name: string;
  code: string;
  description?: string | null;
  subjectType: string;
  isActive: boolean;
  version: number;
  trigger: string;
  triggerEvent?: string | null;
  stageCount?: number;
  stages?: WorkflowStage[];
  createdByName?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface WorkflowTask {
  id: string;
  instanceId: string;
  definitionId: string;
  stageId: string;
  stageName: string;
  stageOrder: number;
  assigneeType: AssigneeType;
  assigneeRoleId?: string | null;
  assigneeDepartmentId?: string | null;
  assigneeTeamId?: string | null;
  assigneeAdminId?: string | null;
  actions: WorkflowAction[];
  subjectType: string;
  subjectId: string;
  subjectLabel?: string | null;
  status: 'PENDING' | 'DONE' | 'SKIPPED' | 'CANCELLED';
  actionTaken?: string | null;
  actedByName?: string | null;
  comment?: string | null;
  actedAt?: string | null;
  dueAt?: string | null;
  escalated?: boolean;
  escalationLevel?: number;
  escalatedAt?: string | null;
  createdAt: string;
}

export interface WorkflowDelegation {
  id: string;
  fromAdminId: string;
  fromName?: string | null;
  toAdminId: string;
  toName?: string | null;
  reason?: string | null;
  startsAt: string;
  endsAt?: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface WorkflowStats {
  instances: { active: number; completed: number; rejected: number; cancelled: number; total: number };
  tasks: { pending: number; overdue: number; escalated: number };
  perWorkflow: { code: string; ACTIVE: number; COMPLETED: number; REJECTED: number; CANCELLED: number }[];
}

export interface WorkflowHistoryEntry {
  id: string;
  instanceId: string;
  stageName?: string | null;
  stageOrder?: number | null;
  action: string;
  actorName?: string | null;
  comment?: string | null;
  fromStageOrder?: number | null;
  toStageOrder?: number | null;
  createdAt: string;
}

export interface WorkflowInstance {
  id: string;
  definitionId: string;
  definitionCode: string;
  name: string;
  subjectType: string;
  subjectId: string;
  subjectLabel?: string | null;
  status: InstanceStatus;
  currentStageId?: string | null;
  currentStageOrder: number;
  initiatedByName?: string | null;
  completedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  stages?: WorkflowStage[];
  tasks?: WorkflowTask[];
  history?: WorkflowHistoryEntry[];
}

class WorkflowService {
  // Inbox
  async myTasks() {
    const res = await axios.get('/workflows/my-tasks');
    return res.data as { success: boolean; data: WorkflowTask[]; count: number };
  }
  async actOnTask(taskId: string, body: { action: WorkflowAction; comment?: string; assignTo?: string }) {
    const res = await axios.post(`/workflows/tasks/${taskId}/act`, body);
    return res.data as { success: boolean; message: string };
  }

  // Definitions
  async listDefinitions(params?: { subjectType?: string; isActive?: boolean }) {
    const res = await axios.get('/workflows/definitions', { params });
    return res.data as { success: boolean; data: WorkflowDefinition[] };
  }
  async getDefinition(id: string) {
    const res = await axios.get(`/workflows/definitions/${id}`);
    return res.data as { success: boolean; data: WorkflowDefinition };
  }
  async createDefinition(body: Partial<WorkflowDefinition> & { stages?: WorkflowStage[] }) {
    const res = await axios.post('/workflows/definitions', body);
    return res.data as { success: boolean; data: WorkflowDefinition; message: string };
  }
  async updateDefinition(id: string, body: Partial<WorkflowDefinition> & { stages?: WorkflowStage[] }) {
    const res = await axios.put(`/workflows/definitions/${id}`, body);
    return res.data as { success: boolean; data: WorkflowDefinition; message: string };
  }
  async deleteDefinition(id: string) {
    const res = await axios.delete(`/workflows/definitions/${id}`);
    return res.data as { success: boolean; message: string };
  }

  // Instances
  async listInstances(params?: { status?: string; subjectType?: string; definitionId?: string }) {
    const res = await axios.get('/workflows/instances', { params });
    return res.data as { success: boolean; data: WorkflowInstance[] };
  }
  async getInstance(id: string) {
    const res = await axios.get(`/workflows/instances/${id}`);
    return res.data as { success: boolean; data: WorkflowInstance };
  }
  async startInstance(body: { definitionCode?: string; definitionId?: string; subjectType?: string; subjectId: string; subjectLabel?: string; data?: any }) {
    const res = await axios.post('/workflows/instances', body);
    return res.data as { success: boolean; data: WorkflowInstance; message: string };
  }
  async cancelInstance(id: string, reason?: string) {
    const res = await axios.post(`/workflows/instances/${id}/cancel`, { reason });
    return res.data as { success: boolean; message: string };
  }

  // Delegation
  async myDelegations() {
    const res = await axios.get('/workflows/delegations');
    return res.data as { success: boolean; data: WorkflowDelegation[] };
  }
  async createDelegation(body: { toAdminId: string; toName?: string; reason?: string; startsAt?: string; endsAt?: string }) {
    const res = await axios.post('/workflows/delegations', body);
    return res.data as { success: boolean; data: WorkflowDelegation; message: string };
  }
  async endDelegation(id: string) {
    const res = await axios.post(`/workflows/delegations/${id}/end`, {});
    return res.data as { success: boolean; message: string };
  }

  // Dashboard
  async getStats() {
    const res = await axios.get('/workflows/stats');
    return res.data as { success: boolean; data: WorkflowStats };
  }
}

export const workflowService = new WorkflowService();
export default workflowService;

// UI helpers
export const ACTION_LABEL: Record<WorkflowAction, string> = {
  APPROVE: 'Approve', REJECT: 'Reject', ASSIGN: 'Assign', SUBMIT: 'Submit', REQUEST_CHANGES: 'Request Changes',
};

export const ASSIGNEE_TYPE_LABEL: Record<AssigneeType, string> = {
  ROLE: 'Anyone with a role', DEPARTMENT: 'Anyone in a department', TEAM: 'Anyone in a team',
  USER: 'A specific person', INITIATOR: 'Whoever started it', DEPT_HEAD: 'Department head',
  TEAM_LEAD: 'Team lead', DYNAMIC: 'Chosen at runtime (by an Assign step)',
};

export const INSTANCE_STATUS_STYLE: Record<InstanceStatus, string> = {
  ACTIVE: 'bg-blue-100 text-blue-700',
  COMPLETED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-700',
  CANCELLED: 'bg-slate-100 text-slate-500',
};
