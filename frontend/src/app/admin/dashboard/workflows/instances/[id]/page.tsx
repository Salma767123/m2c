import InstanceTimeline from '@/components/AdminDashboard/Workflows/InstanceTimeline'
import PermissionGuard from '@/components/AdminDashboard/PermissionGuard'

export default async function WorkflowInstancePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <PermissionGuard permission="workflows:view">
      <InstanceTimeline instanceId={id} />
    </PermissionGuard>
  );
}
