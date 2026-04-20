"use client";

import { useState } from "react";
import { ArrowLeft, Building2, Calendar, CreditCard, CheckCircle, Clock } from "lucide-react";
import { useRouter } from "next/navigation";
import { showSuccessToast } from "@/lib/toast-utils";
import { hasPermission } from "@/lib/auth";

interface SettlementDetailProps {
  settlementId: string;
}

export default function SettlementDetail({ settlementId }: SettlementDetailProps) {
  const router = useRouter();
  const [status, setStatus] = useState("Pending");

  // Mock settlement data
  const settlement = {
    settlementNumber: "SET-2024-003",
    billingNumber: "BILL-2024-003",
    period: "February 2024",
    createdDate: "2024-03-01",
    dueDate: "2024-03-10",
    status: status,
    vendor: {
      name: "Wool Crafts",
      email: "vendor@woolcrafts.com",
      phone: "+91 98765 55555",
      address: "789, Wool Market, Ludhiana, Punjab - 141001",
      gst: "03AABCT9876F1Z3",
      bankName: "ICICI Bank",
      accountNumber: "9876543210",
      ifsc: "ICIC0009876",
      accountHolder: "Wool Crafts Pvt Ltd",
    },
    billing: {
      totalOrders: 28,
      totalAmount: 75000,
      commissionRate: 10,
      commission: 7500,
      netAmount: 67500,
    },
    payment: {
      transactionId: "TXN-SET-003",
      paymentDate: "2024-03-08",
      paymentMethod: "Bank Transfer",
    },
  };

  const handleMarkAsPaid = () => {
    setStatus("Paid");
    showSuccessToast("Settlement marked as paid successfully");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Settlement Details</h1>
            <p className="text-sm text-gray-600 mt-1">Settlement: {settlement.settlementNumber}</p>
          </div>
        </div>
        {status === "Pending" && hasPermission("manage_billing") && (
          <button
            onClick={handleMarkAsPaid}
            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium flex items-center gap-2"
          >
            <CheckCircle className="h-4 w-4" />
            Mark as Paid
          </button>
        )}
      </div>

      {/* Settlement Overview */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Settlement Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <p className="text-sm text-gray-600">Settlement Number</p>
            <p className="text-base font-medium text-gray-900 mt-1">{settlement.settlementNumber}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Billing Number</p>
            <p className="text-base font-medium text-gray-900 mt-1">{settlement.billingNumber}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Period</p>
            <p className="text-base font-medium text-gray-900 mt-1">{settlement.period}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Status</p>
            <p className={`text-base font-medium mt-1 ${
              status === "Paid" ? "text-green-600" :
              status === "Processing" ? "text-blue-600" :
              "text-yellow-600"
            }`}>
              {status}
            </p>
          </div>
        </div>
      </div>

      {/* Vendor Details */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="flex items-center gap-2 mb-4">
          <Building2 className="h-5 w-5 text-gray-600" />
          <h2 className="text-lg font-semibold text-gray-900">Vendor Information</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-600">Vendor Name</p>
            <p className="text-base font-medium text-gray-900 mt-1">{settlement.vendor.name}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Email</p>
            <p className="text-base font-medium text-gray-900 mt-1">{settlement.vendor.email}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Phone</p>
            <p className="text-base font-medium text-gray-900 mt-1">{settlement.vendor.phone}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">GST Number</p>
            <p className="text-base font-medium text-gray-900 mt-1">{settlement.vendor.gst}</p>
          </div>
          <div className="md:col-span-2">
            <p className="text-sm text-gray-600">Address</p>
            <p className="text-base font-medium text-gray-900 mt-1">{settlement.vendor.address}</p>
          </div>
        </div>
      </div>

      {/* Bank Details */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="flex items-center gap-2 mb-4">
          <CreditCard className="h-5 w-5 text-gray-600" />
          <h2 className="text-lg font-semibold text-gray-900">Bank Account Details</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-blue-50 p-4 rounded-lg border border-blue-200">
          <div>
            <p className="text-sm text-blue-800">Account Holder Name</p>
            <p className="text-base font-medium text-blue-900 mt-1">{settlement.vendor.accountHolder}</p>
          </div>
          <div>
            <p className="text-sm text-blue-800">Bank Name</p>
            <p className="text-base font-medium text-blue-900 mt-1">{settlement.vendor.bankName}</p>
          </div>
          <div>
            <p className="text-sm text-blue-800">Account Number</p>
            <p className="text-base font-medium text-blue-900 mt-1">{settlement.vendor.accountNumber}</p>
          </div>
          <div>
            <p className="text-sm text-blue-800">IFSC Code</p>
            <p className="text-base font-medium text-blue-900 mt-1">{settlement.vendor.ifsc}</p>
          </div>
        </div>
      </div>

      {/* Billing Summary */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Billing Summary</h2>
        <div className="space-y-3">
          <div className="flex justify-between py-2 border-b border-gray-200">
            <span className="text-sm text-gray-600">Total Orders</span>
            <span className="text-sm font-medium text-gray-900">{settlement.billing.totalOrders}</span>
          </div>
          <div className="flex justify-between py-2 border-b border-gray-200">
            <span className="text-sm text-gray-600">Total Sales Amount</span>
            <span className="text-sm font-medium text-gray-900">₹{settlement.billing.totalAmount.toLocaleString()}</span>
          </div>
          <div className="flex justify-between py-2 border-b border-gray-200">
            <span className="text-sm text-gray-600">Platform Commission ({settlement.billing.commissionRate}%)</span>
            <span className="text-sm font-medium text-red-600">-₹{settlement.billing.commission.toLocaleString()}</span>
          </div>
          <div className="flex justify-between py-3 bg-gray-900 text-white px-4 rounded-lg">
            <span className="text-base font-semibold">Net Payable Amount</span>
            <span className="text-base font-bold">₹{settlement.billing.netAmount.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="h-5 w-5 text-gray-600" />
          <h2 className="text-lg font-semibold text-gray-900">Timeline</h2>
        </div>
        <div className="space-y-4">
          <div className="flex gap-4">
            <div className="flex flex-col items-center">
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div className="w-0.5 h-full bg-gray-200 mt-2"></div>
            </div>
            <div className="flex-1 pb-4">
              <p className="text-sm font-medium text-gray-900">Settlement Created</p>
              <p className="text-xs text-gray-600 mt-1">{new Date(settlement.createdDate).toLocaleDateString()}</p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex flex-col items-center">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                status === "Paid" ? "bg-green-100" : "bg-yellow-100"
              }`}>
                {status === "Paid" ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <Clock className="h-5 w-5 text-yellow-600" />
                )}
              </div>
              {status === "Paid" && <div className="w-0.5 h-full bg-gray-200 mt-2"></div>}
            </div>
            <div className="flex-1 pb-4">
              <p className="text-sm font-medium text-gray-900">Payment Due</p>
              <p className="text-xs text-gray-600 mt-1">{new Date(settlement.dueDate).toLocaleDateString()}</p>
            </div>
          </div>

          {status === "Paid" && (
            <div className="flex gap-4">
              <div className="flex flex-col items-center">
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                </div>
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">Payment Completed</p>
                <p className="text-xs text-gray-600 mt-1">{new Date(settlement.payment.paymentDate).toLocaleDateString()}</p>
                <div className="mt-2 bg-green-50 p-3 rounded-lg border border-green-200">
                  <p className="text-xs text-green-800">
                    Transaction ID: <span className="font-medium">{settlement.payment.transactionId}</span>
                  </p>
                  <p className="text-xs text-green-800 mt-1">
                    Method: <span className="font-medium">{settlement.payment.paymentMethod}</span>
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Status Message */}
      {status === "Pending" && (
        <div className="bg-yellow-50 border border-yellow-200 p-6 rounded-lg">
          <h3 className="text-sm font-semibold text-yellow-900 mb-2">Pending Payment</h3>
          <p className="text-sm text-yellow-800">
            This settlement is pending payment. Please process the payment to the vendor's bank account and mark it as paid.
          </p>
        </div>
      )}

      {status === "Paid" && (
        <div className="bg-green-50 border border-green-200 p-6 rounded-lg">
          <h3 className="text-sm font-semibold text-green-900 mb-2">Payment Completed</h3>
          <p className="text-sm text-green-800">
            This settlement has been successfully paid to the vendor. The transaction is complete.
          </p>
        </div>
      )}
    </div>
  );
}
