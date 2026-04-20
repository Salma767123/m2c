"use client";

import { useState, useRef } from "react";
import { ArrowLeft, Download, Printer, Building2, Calendar, Package } from "lucide-react";
import { useRouter } from "next/navigation";
import { showSuccessToast } from "@/lib/toast-utils";
import { hasPermission } from "@/lib/auth";

interface BillingDetailProps {
  billingId: string;
}

export default function BillingDetail({ billingId }: BillingDetailProps) {
  const router = useRouter();
  const billingRef = useRef<HTMLDivElement>(null);

  // Mock billing data
  const billing = {
    billingNumber: "BILL-2024-001",
    vendor: {
      name: "Textile Traders",
      email: "vendor@textiletraders.com",
      phone: "+91 98765 43210",
      address: "456, Textile Market, Surat, Gujarat - 395003",
      gst: "27AABCT1234F1Z5",
      bankName: "HDFC Bank",
      accountNumber: "1234567890",
      ifsc: "HDFC0001234",
    },
    period: "January 2024",
    startDate: "2024-01-01",
    endDate: "2024-01-31",
    generatedDate: "2024-02-01",
    status: "Paid",
    orders: [
      {
        id: "1",
        orderId: "ORD-2024-001",
        date: "2024-01-10",
        product: "Cotton Bedsheet Set",
        quantity: 2,
        amount: 2500,
      },
      {
        id: "2",
        orderId: "ORD-2024-015",
        date: "2024-01-15",
        product: "Silk Saree",
        quantity: 1,
        amount: 5000,
      },
      {
        id: "3",
        orderId: "ORD-2024-023",
        date: "2024-01-20",
        product: "Woolen Blanket",
        quantity: 3,
        amount: 3500,
      },
    ],
    totalOrders: 45,
    totalAmount: 125000,
    commissionRate: 10,
    commission: 12500,
    netAmount: 112500,
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const billingContent = billingRef.current?.innerHTML || '';
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Billing ${billing.billingNumber}</title>
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            body {
              font-family: Arial, sans-serif;
              padding: 20px;
              color: #000;
            }
            .billing-container {
              max-width: 800px;
              margin: 0 auto;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin: 20px 0;
            }
            table thead {
              background-color: #1a1a1a;
              color: white;
            }
            table th,
            table td {
              border: 1px solid #000;
              padding: 12px;
              text-align: left;
            }
            .text-right {
              text-align: right;
            }
            .text-center {
              text-align: center;
            }
            .font-bold {
              font-weight: 700;
            }
            .font-semibold {
              font-weight: 600;
            }
            .font-medium {
              font-weight: 500;
            }
            @media print {
              body {
                padding: 0;
              }
              @page {
                size: A4;
                margin: 1cm;
              }
            }
          </style>
        </head>
        <body>
          <div class="billing-container">
            ${billingContent}
          </div>
        </body>
      </html>
    `);
    
    printWindow.document.close();
    printWindow.focus();
    
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  const handleDownload = () => {
    showSuccessToast("Billing statement downloaded successfully");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between print:hidden">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Billing Statement</h1>
            <p className="text-sm text-gray-600 mt-1">Billing: {billing.billingNumber}</p>
          </div>
        </div>
        {hasPermission('view_billing') && (
          <div className="flex gap-3">
            <button
              onClick={handleDownload}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Download
            </button>
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors font-medium flex items-center gap-2"
            >
              <Printer className="h-4 w-4" />
              Print
            </button>
          </div>
        )}
      </div>

      {/* Billing Content */}
      <div ref={billingRef} className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        {/* Header */}
        <div className="border-b border-gray-200 pb-6 mb-6">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-3xl font-bold text-gray-900">Navnit Textiles</h2>
              <p className="text-sm text-gray-600 mt-2">123, Textile Market, Mumbai, Maharashtra - 400001</p>
              <p className="text-sm text-gray-600">Phone: +91 98765 00000</p>
              <p className="text-sm text-gray-600">Email: info@navnittextiles.com</p>
            </div>
            <div className="text-right">
              <h3 className="text-2xl font-bold text-gray-900">BILLING STATEMENT</h3>
              <p className="text-sm text-gray-600 mt-2">
                Billing #: <span className="font-medium text-gray-900">{billing.billingNumber}</span>
              </p>
              <p className="text-sm text-gray-600">
                Period: <span className="font-medium text-gray-900">{billing.period}</span>
              </p>
              <p className="text-sm text-gray-600">
                Generated: <span className="font-medium text-gray-900">{new Date(billing.generatedDate).toLocaleDateString()}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Vendor Details */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Building2 className="h-5 w-5 text-gray-600" />
            <h4 className="text-lg font-semibold text-gray-900">Vendor Details</h4>
          </div>
          <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
            <div>
              <p className="text-sm text-gray-600">Vendor Name</p>
              <p className="text-base font-medium text-gray-900">{billing.vendor.name}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Email</p>
              <p className="text-base font-medium text-gray-900">{billing.vendor.email}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Phone</p>
              <p className="text-base font-medium text-gray-900">{billing.vendor.phone}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">GST Number</p>
              <p className="text-base font-medium text-gray-900">{billing.vendor.gst}</p>
            </div>
            <div className="col-span-2">
              <p className="text-sm text-gray-600">Address</p>
              <p className="text-base font-medium text-gray-900">{billing.vendor.address}</p>
            </div>
          </div>
        </div>

        {/* Billing Period */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="h-5 w-5 text-gray-600" />
            <h4 className="text-lg font-semibold text-gray-900">Billing Period</h4>
          </div>
          <div className="flex gap-4 bg-blue-50 p-4 rounded-lg border border-blue-200">
            <div>
              <p className="text-sm text-blue-800">Start Date</p>
              <p className="text-base font-medium text-blue-900">{new Date(billing.startDate).toLocaleDateString()}</p>
            </div>
            <div className="border-l border-blue-300 pl-4">
              <p className="text-sm text-blue-800">End Date</p>
              <p className="text-base font-medium text-blue-900">{new Date(billing.endDate).toLocaleDateString()}</p>
            </div>
            <div className="border-l border-blue-300 pl-4">
              <p className="text-sm text-blue-800">Total Orders</p>
              <p className="text-base font-medium text-blue-900">{billing.totalOrders}</p>
            </div>
          </div>
        </div>

        {/* Sample Orders */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Package className="h-5 w-5 text-gray-600" />
            <h4 className="text-lg font-semibold text-gray-900">Sample Orders (First 3)</h4>
          </div>
          <table className="w-full border-collapse border border-gray-900">
            <thead className="bg-gray-900 text-white">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium border border-gray-900">Order ID</th>
                <th className="px-4 py-3 text-left text-sm font-medium border border-gray-900">Date</th>
                <th className="px-4 py-3 text-left text-sm font-medium border border-gray-900">Product</th>
                <th className="px-4 py-3 text-center text-sm font-medium border border-gray-900">Quantity</th>
                <th className="px-4 py-3 text-right text-sm font-medium border border-gray-900">Amount</th>
              </tr>
            </thead>
            <tbody>
              {billing.orders.map((order) => (
                <tr key={order.id}>
                  <td className="px-4 py-3 text-sm text-gray-900 border border-gray-300">{order.orderId}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 border border-gray-300">{new Date(order.date).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 border border-gray-300">{order.product}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 text-center border border-gray-300">{order.quantity}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 text-right font-medium border border-gray-300">₹{order.amount.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-xs text-gray-500 mt-2">* Showing first 3 orders. Total {billing.totalOrders} orders in this period.</p>
        </div>

        {/* Summary */}
        <div className="mb-6">
          <h4 className="text-lg font-semibold text-gray-900 mb-3">Billing Summary</h4>
          <div className="flex justify-end">
            <div className="w-80">
              <div className="flex justify-between py-2 border-b border-gray-200">
                <span className="text-sm text-gray-600">Total Sales Amount:</span>
                <span className="text-sm font-medium text-gray-900">₹{billing.totalAmount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-200">
                <span className="text-sm text-gray-600">Platform Commission ({billing.commissionRate}%):</span>
                <span className="text-sm font-medium text-red-600">-₹{billing.commission.toLocaleString()}</span>
              </div>
              <div className="flex justify-between py-3 bg-gray-900 text-white px-4 rounded-lg mt-2">
                <span className="text-base font-semibold">Net Payable Amount:</span>
                <span className="text-base font-bold">₹{billing.netAmount.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bank Details */}
        <div className="border-t border-gray-200 pt-6 mb-6">
          <h4 className="text-sm font-semibold text-gray-900 mb-3">Vendor Bank Details</h4>
          <div className="grid grid-cols-3 gap-4 bg-gray-50 p-4 rounded-lg">
            <div>
              <p className="text-xs text-gray-600">Bank Name</p>
              <p className="text-sm font-medium text-gray-900">{billing.vendor.bankName}</p>
            </div>
            <div>
              <p className="text-xs text-gray-600">Account Number</p>
              <p className="text-sm font-medium text-gray-900">{billing.vendor.accountNumber}</p>
            </div>
            <div>
              <p className="text-xs text-gray-600">IFSC Code</p>
              <p className="text-sm font-medium text-gray-900">{billing.vendor.ifsc}</p>
            </div>
          </div>
        </div>

        {/* Status */}
        <div className="border-t border-gray-200 pt-6">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-gray-600">Payment Status</p>
              <p className={`text-lg font-semibold mt-1 ${
                billing.status === "Paid" ? "text-green-600" :
                billing.status === "Processed" ? "text-blue-600" :
                "text-yellow-600"
              }`}>
                {billing.status}
              </p>
            </div>
            {billing.status === "Paid" && (
              <div className="text-right">
                <p className="text-xs text-gray-500">This billing statement has been processed and paid.</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 mt-6 pt-6 text-center">
          <p className="text-sm text-gray-600">Thank you for your partnership!</p>
          <p className="text-xs text-gray-500 mt-2">This is a computer-generated billing statement.</p>
        </div>
      </div>
    </div>
  );
}
