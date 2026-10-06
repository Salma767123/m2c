import ApprovalsInbox from '@/components/AdminDashboard/Approvals/ApprovalsInbox'

export default function ApprovalsPage() {
  // No single-permission guard: the inbox itself only surfaces modules the user
  // is authorised to approve (and shows an empty state otherwise).
  return <ApprovalsInbox />
}

export const metadata = {
  title: 'Approvals | Admin Dashboard',
  description: 'Approve or reject items awaiting authorization',
}
