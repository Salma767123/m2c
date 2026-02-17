"use client";

import { useState, useRef } from "react";
import { ArrowLeft, Download, Share2, Printer, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { showSuccessToast, showErrorToast } from "@/lib/toast-utils";
import Dropdown from "@/components/UI/Dropdown";

interface InvoiceDetailProps {
  invoiceId: string;
}

export default function InvoiceDetail({ invoiceId }: InvoiceDetailProps) {
  const router = useRouter();
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [downloadFormat, setDownloadFormat] = useState("");
  const [shareEmail, setShareEmail] = useState("");
  const invoiceRef = useRef<HTMLDivElement>(null);

  // Mock invoice data
  const invoice = {
    invoiceNumber: "INV-2024-001",
    orderId: "ORD-2024-001",
    date: "2024-02-10",
    dueDate: "2024-02-20",
    status: "Paid",
    type: "Customer",
    company: {
      name: "Navnit Textiles",
      address: "123, Textile Market, Mumbai, Maharashtra - 400001",
      phone: "+91 98765 00000",
      email: "info@navnittextiles.com",
      gst: "27AABCT1234F1Z5",
    },
    billTo: {
      name: "John Doe",
      address: "456, MG Road, Mumbai, Maharashtra - 400002",
      phone: "+91 98765 12345",
      email: "john.doe@example.com",
      gst: "27AABCT5678F1Z9",
    },
    items: [
      {
        id: "1",
        description: "Cotton Bedsheet Set",
        sku: "CBS-001",
        quantity: 2,
        rate: 1250,
        amount: 2500,
      },
    ],
    subtotal: 2500,
    tax: 450,
    discount: 0,
    total: 2950,
    paymentMethod: "Razorpay",
    transactionId: "TXN-2024-001",
  };

  const handleDownload = () => {
    if (!downloadFormat) {
      showErrorToast("Please select a format");
      return;
    }

    // Simulate download
    showSuccessToast(`Invoice downloaded as ${downloadFormat}`);
    setShowDownloadModal(false);
    setDownloadFormat("");
  };

  const handleShare = () => {
    if (!shareEmail.trim()) {
      showErrorToast("Please enter an email address");
      return;
    }

    // Simulate share
    showSuccessToast(`Invoice shared to ${shareEmail}`);
    setShowShareModal(false);
    setShareEmail("");
  };

  const handlePrint = () => {
    // Create a new window for printing
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const invoiceContent = invoiceRef.current?.innerHTML || '';
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Invoice ${invoice.invoiceNumber}</title>
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
            .invoice-container {
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
            table th {
              font-weight: 600;
            }
            table td {
              background-color: #fff;
            }
            .text-right {
              text-align: right;
            }
            .text-center {
              text-align: center;
            }
            .border-b {
              border-bottom: 1px solid #e5e7eb;
            }
            .font-bold {
              font-weight: 700;
            }
            .font-semibold {
              font-weight: 600;
            }
            .font-medium {
              font-medium: 500;
            }
            .text-3xl {
              font-size: 1.875rem;
            }
            .text-2xl {
              font-size: 1.5rem;
            }
            .text-base {
              font-size: 1rem;
            }
            .text-sm {
              font-size: 0.875rem;
            }
            .text-xs {
              font-size: 0.75rem;
            }
            .mt-2 {
              margin-top: 0.5rem;
            }
            .mt-6 {
              margin-top: 1.5rem;
            }
            .mb-2 {
              margin-bottom: 0.5rem;
            }
            .mb-6 {
              margin-bottom: 1.5rem;
            }
            .pb-6 {
              padding-bottom: 1.5rem;
            }
            .pt-6 {
              padding-top: 1.5rem;
            }
            .px-4 {
              padding-left: 1rem;
              padding-right: 1rem;
            }
            .py-2 {
              padding-top: 0.5rem;
              padding-bottom: 0.5rem;
            }
            .py-3 {
              padding-top: 0.75rem;
              padding-bottom: 0.75rem;
            }
            .totals-section {
              display: flex;
              justify-content: flex-end;
              margin-bottom: 1.5rem;
            }
            .totals-box {
              width: 300px;
            }
            .totals-row {
              display: flex;
              justify-content: space-between;
              padding: 0.5rem 0;
              border-bottom: 1px solid #e5e7eb;
            }
            .total-final {
              display: flex;
              justify-content: space-between;
              padding: 0.75rem 1rem;
              background-color: #1a1a1a;
              color: white;
              border-radius: 8px;
              margin-top: 0.5rem;
              font-weight: 700;
            }
            .header-section {
              display: flex;
              justify-content: space-between;
              border-bottom: 1px solid #e5e7eb;
              padding-bottom: 1.5rem;
              margin-bottom: 1.5rem;
            }
            .text-gray-600 {
              color: #4b5563;
            }
            .text-gray-900 {
              color: #111827;
            }
            .text-green-600 {
              color: #16a34a;
            }
            .text-yellow-600 {
              color: #ca8a04;
            }
            .text-red-600 {
              color: #dc2626;
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
          <div class="invoice-container">
            ${invoiceContent}
          </div>
        </body>
      </html>
    `);
    
    printWindow.document.close();
    printWindow.focus();
    
    // Wait for content to load then print
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
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
            <h1 className="text-2xl font-bold text-gray-900">Invoice Details</h1>
            <p className="text-sm text-gray-600 mt-1">Invoice: {invoice.invoiceNumber}</p>
          </div>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowDownloadModal(true)}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Download
          </button>
          <button
            onClick={() => setShowShareModal(true)}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium flex items-center gap-2"
          >
            <Share2 className="h-4 w-4" />
            Share
          </button>
          <button
            onClick={handlePrint}
            className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors font-medium flex items-center gap-2"
          >
            <Printer className="h-4 w-4" />
            Print
          </button>
        </div>
      </div>

      {/* Invoice Content */}
      <div ref={invoiceRef} className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        {/* Company Header */}
        <div className="border-b border-gray-200 pb-6 mb-6">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-3xl font-bold text-gray-900">{invoice.company.name}</h2>
              <p className="text-sm text-gray-600 mt-2">{invoice.company.address}</p>
              <p className="text-sm text-gray-600">Phone: {invoice.company.phone}</p>
              <p className="text-sm text-gray-600">Email: {invoice.company.email}</p>
              <p className="text-sm text-gray-600">GST: {invoice.company.gst}</p>
            </div>
            <div className="text-right">
              <h3 className="text-2xl font-bold text-gray-900">INVOICE</h3>
              <p className="text-sm text-gray-600 mt-2">
                Invoice #: <span className="font-medium text-gray-900">{invoice.invoiceNumber}</span>
              </p>
              <p className="text-sm text-gray-600">
                Order #: <span className="font-medium text-gray-900">{invoice.orderId}</span>
              </p>
              <p className="text-sm text-gray-600">
                Date: <span className="font-medium text-gray-900">{new Date(invoice.date).toLocaleDateString()}</span>
              </p>
              <p className="text-sm text-gray-600">
                Due Date: <span className="font-medium text-gray-900">{new Date(invoice.dueDate).toLocaleDateString()}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Bill To */}
        <div className="mb-6">
          <h4 className="text-sm font-semibold text-gray-900 mb-2">BILL TO:</h4>
          <p className="text-base font-medium text-gray-900">{invoice.billTo.name}</p>
          <p className="text-sm text-gray-600">{invoice.billTo.address}</p>
          <p className="text-sm text-gray-600">Phone: {invoice.billTo.phone}</p>
          <p className="text-sm text-gray-600">Email: {invoice.billTo.email}</p>
          {invoice.billTo.gst && <p className="text-sm text-gray-600">GST: {invoice.billTo.gst}</p>}
        </div>

        {/* Items Table */}
        <div className="mb-6">
          <table className="w-full border-collapse border border-gray-900">
            <thead className="bg-gray-900 text-white">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium border border-gray-900">Description</th>
                <th className="px-4 py-3 text-left text-sm font-medium border border-gray-900">SKU</th>
                <th className="px-4 py-3 text-center text-sm font-medium border border-gray-900">Quantity</th>
                <th className="px-4 py-3 text-right text-sm font-medium border border-gray-900">Rate</th>
                <th className="px-4 py-3 text-right text-sm font-medium border border-gray-900">Amount</th>
              </tr>
            </thead>
            <tbody>
              {invoice.items.map((item) => (
                <tr key={item.id}>
                  <td className="px-4 py-3 text-sm text-gray-900 border border-gray-300">{item.description}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 border border-gray-300">{item.sku}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 text-center border border-gray-300">{item.quantity}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 text-right border border-gray-300">₹{item.rate.toLocaleString()}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 text-right font-medium border border-gray-300">₹{item.amount.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="flex justify-end mb-6">
          <div className="w-64">
            <div className="flex justify-between py-2 border-b border-gray-200">
              <span className="text-sm text-gray-600">Subtotal:</span>
              <span className="text-sm font-medium text-gray-900">₹{invoice.subtotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-200">
              <span className="text-sm text-gray-600">Tax (18%):</span>
              <span className="text-sm font-medium text-gray-900">₹{invoice.tax.toLocaleString()}</span>
            </div>
            {invoice.discount > 0 && (
              <div className="flex justify-between py-2 border-b border-gray-200">
                <span className="text-sm text-gray-600">Discount:</span>
                <span className="text-sm font-medium text-red-600">-₹{invoice.discount.toLocaleString()}</span>
              </div>
            )}
            <div className="flex justify-between py-3 bg-gray-900 text-white px-4 rounded-lg mt-2">
              <span className="text-base font-semibold">Total:</span>
              <span className="text-base font-bold">₹{invoice.total.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Payment Info */}
        <div className="border-t border-gray-200 pt-6">
          <h4 className="text-sm font-semibold text-gray-900 mb-2">PAYMENT INFORMATION:</h4>
          <p className="text-sm text-gray-600">Payment Method: <span className="font-medium text-gray-900">{invoice.paymentMethod}</span></p>
          <p className="text-sm text-gray-600">Transaction ID: <span className="font-medium text-gray-900">{invoice.transactionId}</span></p>
          <p className="text-sm text-gray-600 mt-2">Status: <span className={`font-medium ${invoice.status === "Paid" ? "text-green-600" : "text-yellow-600"}`}>{invoice.status}</span></p>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 mt-6 pt-6 text-center">
          <p className="text-sm text-gray-600">Thank you for your business!</p>
          <p className="text-xs text-gray-500 mt-2">This is a computer-generated invoice and does not require a signature.</p>
        </div>
      </div>

      {/* Download Modal */}
      {showDownloadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">Download Invoice</h2>
              <button
                onClick={() => setShowDownloadModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5 text-gray-600" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Format
                </label>
                <Dropdown
                  value={downloadFormat}
                  options={[
                    { value: "thermal", label: "Thermal Print (80mm)" },
                    { value: "a4", label: "A4 Size (PDF)" },
                  ]}
                  onChange={(value) => setDownloadFormat(value as string)}
                  placeholder="Choose format"
                />
              </div>

              <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                <p className="text-sm text-blue-800">
                  {downloadFormat === "thermal" && "Optimized for 80mm thermal printers"}
                  {downloadFormat === "a4" && "Standard A4 size PDF format"}
                  {!downloadFormat && "Please select a format to continue"}
                </p>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => setShowDownloadModal(false)}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleDownload}
                className="px-6 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors font-medium"
              >
                Download
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Share Modal */}
      {showShareModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">Share Invoice</h2>
              <button
                onClick={() => setShowShareModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5 text-gray-600" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  value={shareEmail}
                  onChange={(e) => setShareEmail(e.target.value)}
                  placeholder="Enter email address"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                />
              </div>

              <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                <p className="text-sm text-blue-800">
                  Invoice will be sent as a PDF attachment to the specified email address.
                </p>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => setShowShareModal(false)}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleShare}
                className="px-6 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors font-medium"
              >
                Share
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
