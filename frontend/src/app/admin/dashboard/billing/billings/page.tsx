import PermissionGuard from '@/components/AdminDashboard/PermissionGuard'

// Billing page temporarily commented out
// import BillingManagement from "@/components/AdminDashboard/Billing/BillingManagement";

// export default function BillingsPage() {
//   return (
//     <div className="p-6">
//       <div className="mb-6">
//         <h1 className="text-2xl font-bold text-slate-900">Billing Management</h1>
//         <p className="text-slate-600 mt-1">Manage vendor billing statements and commissions</p>
//       </div>
//       <BillingManagement />
//     </div>
//   );
// }

export default function BillingsPage() {
  return (
    <PermissionGuard permission="settlement:view">
      {null}
    </PermissionGuard>
  );
}
