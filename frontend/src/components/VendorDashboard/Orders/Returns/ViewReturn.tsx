'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/UI/Card';
import { Button } from '@/components/UI/Button';
import Dropdown from '@/components/UI/Dropdown';
import { ArrowLeft, CheckCircle, XCircle, Clock, Package, AlertTriangle, RotateCcw, FileText, Camera, MessageSquare } from 'lucide-react';

interface ReturnRequest {
  id: string;
  orderNumber: string;
  customer: string;
  email: string;
  product: string;
  reason: string;
  status: 'Pending Review' | 'Approved' | 'Rejected' | 'Item Received' | 'Refund Processed' | 'Replacement Sent';
  requestDate: string;
  quantity: number;
  returnType: 'Refund' | 'Replacement';
  customerNotes?: string;
  vendorNotes?: string;
  images?: string[];
  statusHistory?: Array<{
    status: string;
    date: string;
    note?: string;
  }>;
}

// Mock data - in real app, this would come from API
const mockReturns: ReturnRequest[] = [
  {
    id: 'RET-001',
    orderNumber: 'ORD-001',
    customer: 'John Doe',
    email: 'john@example.com',
    product: 'Cotton Kitchen Towel',
    reason: 'Defective item - torn fabric',
    status: 'Pending Review',
    requestDate: '2024-01-15',
    quantity: 1,
    returnType: 'Refund',
    customerNotes: 'The towel arrived with a large tear in the fabric. Photos attached showing the damage.',
    images: ['torn-fabric-1.jpg', 'torn-fabric-2.jpg'],
    statusHistory: [
      { status: 'Pending Review', date: '2024-01-15', note: 'Return request submitted by customer' }
    ]
  },
  {
    id: 'RET-002',
    orderNumber: 'ORD-002',
    customer: 'Jane Smith',
    email: 'jane@example.com',
    product: 'Handwoven Bath Towel',
    reason: 'Wrong size received',
    status: 'Approved',
    requestDate: '2024-01-14',
    quantity: 2,
    returnType: 'Replacement',
    customerNotes: 'Ordered Large size but received Medium size towels.',
    vendorNotes: 'Replacement approved - Large size towels will be sent',
    statusHistory: [
      { status: 'Pending Review', date: '2024-01-14', note: 'Return request submitted by customer' },
      { status: 'Approved', date: '2024-01-15', note: 'Return approved - replacement will be sent' }
    ]
  }
];

interface ViewReturnProps {
  returnId: string;
}

export default function ViewReturn({ returnId }: ViewReturnProps) {
  const router = useRouter();
  const [returnRequest, setReturnRequest] = useState<ReturnRequest | null>(
    mockReturns.find(r => r.id === returnId) || null
  );
  const [newStatus, setNewStatus] = useState<string>('');
  const [vendorNote, setVendorNote] = useState<string>('');

  if (!returnRequest) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            className="hover:bg-gray-50 hover:border-gray-200"
            onClick={() => router.back()}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-[#222222]">Return Not Found</h1>
            <p className="text-slate-600">The requested return could not be found</p>
          </div>
        </div>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Pending Review': return 'text-yellow-600 bg-yellow-100';
      case 'Approved': return 'text-blue-600 bg-blue-100';
      case 'Rejected': return 'text-gray-700 bg-gray-50';
      case 'Item Received': return 'text-purple-600 bg-purple-100';
      case 'Refund Processed': return 'text-green-600 bg-green-100';
      case 'Replacement Sent': return 'text-indigo-600 bg-indigo-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Pending Review': return <Clock className="w-4 h-4" />;
      case 'Approved': return <CheckCircle className="w-4 h-4" />;
      case 'Rejected': return <XCircle className="w-4 h-4" />;
      case 'Item Received': return <Package className="w-4 h-4" />;
      case 'Refund Processed': return <CheckCircle className="w-4 h-4" />;
      case 'Replacement Sent': return <Package className="w-4 h-4" />;
      default: return <AlertTriangle className="w-4 h-4" />;
    }
  };

  const getNextStatusOptions = (currentStatus: string) => {
    switch (currentStatus) {
      case 'Pending Review':
        return ['Approved', 'Rejected'];
      case 'Approved':
        return ['Item Received'];
      case 'Item Received':
        return returnRequest.returnType === 'Refund' ? ['Refund Processed'] : ['Replacement Sent'];
      default:
        return [];
    }
  };

  const handleStatusUpdate = () => {
    if (!newStatus) return;

    const updatedHistory = [...(returnRequest.statusHistory || [])];
    updatedHistory.push({
      status: newStatus,
      date: new Date().toISOString().split('T')[0],
      note: vendorNote || `Status updated to ${newStatus}`
    });

    setReturnRequest(prev => prev ? {
      ...prev,
      status: newStatus as ReturnRequest['status'],
      vendorNotes: vendorNote || prev.vendorNotes,
      statusHistory: updatedHistory
    } : null);

    setNewStatus('');
    setVendorNote('');
  };

  const nextStatusOptions = getNextStatusOptions(returnRequest.status);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          className="hover:bg-gray-50 hover:border-gray-200"
          onClick={() => router.back()}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">Return Request</p>
          <h1 className="text-2xl font-bold text-[#222222]">{returnRequest.id}</h1>
          <p className="text-slate-600">Manage return request details and status</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Return Overview */}
          <Card className="border border-gray-200">
            <CardHeader className="bg-gray-50 border-b border-gray-200">
              <CardTitle className="text-[#222222] text-lg">Return Overview</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-slate-600">Return ID</label>
                    <p className="text-lg font-semibold text-[#222222]">{returnRequest.id}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-600">Order Number</label>
                    <p className="text-lg font-semibold text-[#222222]">{returnRequest.orderNumber}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-600">Customer</label>
                    <p className="text-lg font-semibold text-[#222222]">{returnRequest.customer}</p>
                    <p className="text-sm text-slate-600">Customer ID: {returnRequest.id}</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-slate-600">Request Date</label>
                    <p className="text-lg font-semibold text-[#222222]">{returnRequest.requestDate}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-600">Return Type</label>
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                      returnRequest.returnType === 'Refund' 
                        ? 'text-red-600 bg-red-100' 
                        : 'text-blue-600 bg-blue-100'
                    }`}>
                      {returnRequest.returnType}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Product Information */}
          <Card className="border border-gray-200">
            <CardHeader className="bg-gray-50 border-b border-gray-200">
              <CardTitle className="text-[#222222] text-lg">Product Information</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-[#222222]">{returnRequest.product}</h3>
                    <p className="text-sm text-slate-600">Quantity: {returnRequest.quantity}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-[#222222]">Qty: {returnRequest.quantity}</p>
                    <p className="text-sm text-slate-600">Quantity</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Return Reason */}
          <Card className="border border-gray-200">
            <CardHeader className="bg-gray-50 border-b border-gray-200">
              <CardTitle className="text-[#222222] text-lg flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                Return Reason
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-slate-600">Reason Category</label>
                  <p className="text-lg font-semibold text-[#222222]">{returnRequest.reason}</p>
                </div>
                {returnRequest.customerNotes && (
                  <div>
                    <label className="text-sm font-medium text-slate-600 flex items-center gap-2">
                      <MessageSquare className="w-4 h-4" />
                      Customer Notes
                    </label>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-2">
                      <p className="text-sm text-blue-900">{returnRequest.customerNotes}</p>
                    </div>
                  </div>
                )}
                {returnRequest.images && returnRequest.images.length > 0 && (
                  <div>
                    <label className="text-sm font-medium text-slate-600 flex items-center gap-2">
                      <Camera className="w-4 h-4" />
                      Attached Images
                    </label>
                    <div className="flex gap-2 mt-2">
                      {returnRequest.images.map((image, index) => (
                        <div key={index} className="bg-gray-100 border border-gray-200 rounded-lg p-3 text-center">
                          <Camera className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                          <p className="text-xs text-gray-600">{image}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Status History */}
          {returnRequest.statusHistory && returnRequest.statusHistory.length > 0 && (
            <Card className="border border-gray-200">
              <CardHeader className="bg-gray-50 border-b border-gray-200">
                <CardTitle className="text-[#222222] text-lg">Status History</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  {returnRequest.statusHistory.map((history, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${getStatusColor(history.status)}`}>
                        {getStatusIcon(history.status)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-[#222222]">{history.status}</p>
                          <p className="text-xs text-slate-600">{history.date}</p>
                        </div>
                        {history.note && (
                          <p className="text-xs text-slate-600 mt-1">{history.note}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Current Status */}
          <Card className="border border-gray-200">
            <CardHeader className="bg-gray-50 border-b border-gray-200">
              <CardTitle className="text-[#222222] text-lg">Current Status</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="text-center">
                <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold ${getStatusColor(returnRequest.status)}`}>
                  {getStatusIcon(returnRequest.status)}
                  {returnRequest.status}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Status Update */}
          {nextStatusOptions.length > 0 && (
            <Card className="border border-gray-200">
              <CardHeader className="bg-gray-50 border-b border-gray-200">
                <CardTitle className="text-[#222222] text-lg">Update Status</CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[#222222] mb-2">
                    New Status
                  </label>
                  <Dropdown
                    value={newStatus}
                    options={nextStatusOptions}
                    placeholder="Select Status"
                    onChange={(value) => setNewStatus(value as string)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#222222] mb-2">
                    Vendor Notes (Optional)
                  </label>
                  <textarea
                    value={vendorNote}
                    onChange={(e) => setVendorNote(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-gray-700 focus:border-gray-700 resize-none"
                    placeholder="Add notes about this status change..."
                  />
                </div>
                <Button
                  onClick={handleStatusUpdate}
                  disabled={!newStatus}
                  className="w-full bg-[#222222] text-white hover:bg-[#313131]"
                >
                  Update Status
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Vendor Notes */}
          {returnRequest.vendorNotes && (
            <Card className="border border-gray-200">
              <CardHeader className="bg-gray-50 border-b border-gray-200">
                <CardTitle className="text-[#222222] text-lg flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Vendor Notes
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <p className="text-sm text-gray-800">{returnRequest.vendorNotes}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Quick Actions */}
          <Card className="border border-gray-200">
            <CardHeader className="bg-gray-50 border-b border-gray-200">
              <CardTitle className="text-[#222222] text-lg">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-3">
              {returnRequest.status === 'Pending Review' && (
                <>
                  <Button
                    variant="outline"
                    className="w-full text-green-600 hover:text-green-700 hover:bg-green-50 hover:border-green-200"
                    onClick={() => {
                      setNewStatus('Approved');
                      setVendorNote('Return request approved');
                    }}
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Approve Return
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full text-red-600 hover:text-red-700 hover:bg-red-50 hover:border-red-200"
                    onClick={() => {
                      setNewStatus('Rejected');
                      setVendorNote('Return request rejected');
                    }}
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Reject Return
                  </Button>
                </>
              )}
              {returnRequest.status === 'Approved' && (
                <Button
                  variant="outline"
                  className="w-full text-purple-600 hover:text-purple-700 hover:bg-purple-50 hover:border-purple-200"
                  onClick={() => {
                    setNewStatus('Item Received');
                    setVendorNote('Item received and inspected');
                  }}
                >
                  <Package className="w-4 h-4 mr-2" />
                  Mark Item Received
                </Button>
              )}
              {returnRequest.status === 'Item Received' && returnRequest.returnType === 'Refund' && (
                <Button
                  variant="outline"
                  className="w-full text-green-600 hover:text-green-700 hover:bg-green-50 hover:border-green-200"
                  onClick={() => {
                    setNewStatus('Refund Processed');
                    setVendorNote('Refund processed successfully');
                  }}
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Process Refund
                </Button>
              )}
              {returnRequest.status === 'Item Received' && returnRequest.returnType === 'Replacement' && (
                <Button
                  variant="outline"
                  className="w-full text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 hover:border-indigo-200"
                  onClick={() => {
                    setNewStatus('Replacement Sent');
                    setVendorNote('Replacement item sent to customer');
                  }}
                >
                  <Package className="w-4 h-4 mr-2" />
                  Send Replacement
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}