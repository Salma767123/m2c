import HubToCustomer from "@/components/AdminDashboard/Orders/HubToCustomer";

export default function HubToCustomerPage() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Hub to Customer Orders</h1>
        <p className="text-gray-600 mt-1">Manage orders from hub to customers</p>
      </div>
      <HubToCustomer />
    </div>
  );
}
