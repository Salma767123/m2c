'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/UI/Card';
import { Button } from '@/components/UI/Button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/UI/Table';
import Dropdown from '@/components/UI/Dropdown';
import { RotateCcw, Search, Eye, CheckCircle, XCircle, Clock, Package, AlertTriangle } from 'lucide-react';

interface ReturnRequest {
  id: string;
  orderNumber: string;
  adminHub: string;
  product: string;
  reason: string;
  status: 'Pending Review' | 'Approved' | 'Rejected' | 'Item Returned' | 'Replacement Sent' | 'Issue Resolved';
  requestDate: string;
  quantity: number;
  returnType: 'Quality Issue' | 'Defective Item' | 'Wrong Specification';
  adminNotes?: string;
  vendorResponse?: string;
  images?: string[];
}

const mockReturns: ReturnRequest[] = [
  {
    id: 'RET-001',
    orderNumber: 'ORD-001',
    adminHub: 'M2C Admin Hub - Warehouse A',
    product: 'Cotton Kitchen Towel',
    reason: 'Quality issue detected during hub inspection',
    status: 'Pending Review',
    requestDate: '2024-01-15',
    quantity: 1,
    returnType: 'Quality Issue',
    adminNotes: 'Fabric quality does not meet standards. Requesting replacement or improvement.',
    images: ['quality-issue-1.jpg', 'quality-issue-2.jpg']
  },
  {
    id: 'RET-002',
    orderNumber: 'ORD-002',
    adminHub: 'M2C Admin Hub - Warehouse B',
    product: 'Handwoven Bath Towel',
    reason: 'Wrong size specification',
    status: 'Approved',
    requestDate: '2024-01-14',
    quantity: 2,
    returnType: 'Wrong Specification',
    adminNotes: 'Ordered Large size but received Medium size towels.',
    vendorResponse: 'Replacement approved - Large size towels will be sent'
  },
  {
    id: 'RET-003',
    orderNumber: 'ORD-003',
    adminHub: 'M2C Admin Hub - Warehouse C',
    product: 'Artisan Apron',
    reason: 'Defective stitching found',
    status: 'Issue Resolved',
    requestDate: '2024-01-13',
    quantity: 1,
    returnType: 'Defective Item',
    adminNotes: 'Stitching defects found during quality check.',
    vendorResponse: 'Quality issue acknowledged. Replacement sent and process improved.'
  },
  {
    id: 'RET-004',
    orderNumber: 'ORD-004',
    adminHub: 'M2C Admin Hub - Warehouse D',
    product: 'Linen Table Runner',
    reason: 'Color variation from specification',
    status: 'Item Returned',
    requestDate: '2024-01-12',
    quantity: 1,
    returnType: 'Quality Issue',
    adminNotes: 'Color does not match approved sample.',
    vendorResponse: 'Item received back. Investigating color consistency issue.'
  },
  {
    id: 'RET-005',
    orderNumber: 'ORD-005',
    adminHub: 'M2C Admin Hub - Warehouse E',
    product: 'Organic Cotton Towel Set',
    reason: 'Packaging damage during transit',
    status: 'Rejected',
    requestDate: '2024-01-11',
    quantity: 2,
    returnType: 'Defective Item',
    adminNotes: 'Packaging was damaged but product is intact.',
    vendorResponse: 'Packaging issue noted. Will improve packaging for future shipments.'
  }
];

export default function Returns() {
  const router = useRouter();
  const [returns] = useState<ReturnRequest[]>(mockReturns);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Pending Review': return 'text-yellow-600 bg-yellow-100';
      case 'Approved': return 'text-blue-600 bg-blue-100';
      case 'Rejected': return 'text-gray-700 bg-gray-50';
      case 'Item Returned': return 'text-purple-600 bg-purple-100';
      case 'Issue Resolved': return 'text-green-600 bg-green-100';
      case 'Replacement Sent': return 'text-indigo-600 bg-indigo-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Pending Review': return <Clock className="w-4 h-4" />;
      case 'Approved': return <CheckCircle className="w-4 h-4" />;
      case 'Rejected': return <XCircle className="w-4 h-4" />;
      case 'Item Returned': return <Package className="w-4 h-4" />;
      case 'Issue Resolved': return <CheckCircle className="w-4 h-4" />;
      case 'Replacement Sent': return <Package className="w-4 h-4" />;
      default: return <AlertTriangle className="w-4 h-4" />;
    }
  };

  const filteredReturns = returns.filter(returnItem => {
    const matchesSearch = returnItem.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         returnItem.customer.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         returnItem.product.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'All' || returnItem.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const pendingReturns = returns.filter(r => r.status === 'Pending Review').length;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-[#222222]">Returns from Admin Hub</h1>
          <p className="text-slate-600">Manage return requests from admin hub quality control</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border border-gray-200 hover:border-gray-200">
          <CardContent className="p-6">
            <div className="flex items-center">
              <RotateCcw className="w-8 h-8 text-gray-700" />
              <div className="ml-4">
                <p className="text-sm font-medium text-slate-600">Total Returns</p>
                <p className="text-2xl font-bold text-[#222222]">{returns.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-gray-200 hover:border-gray-200">
          <CardContent className="p-6">
            <div className="flex items-center">
              <Clock className="w-8 h-8 text-yellow-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-slate-600">Pending Review</p>
                <p className="text-2xl font-bold text-[#222222]">{pendingReturns}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-gray-200 hover:border-gray-200">
          <CardContent className="p-6">
            <div className="flex items-center">
              <CheckCircle className="w-8 h-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-slate-600">Resolved</p>
                <p className="text-2xl font-bold text-[#222222]">
                  {returns.filter(r => r.status === 'Issue Resolved' || r.status === 'Replacement Sent').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border border-gray-200">
        <CardContent className="p-6">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="Search returns..."
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-gray-700 focus:border-gray-700"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="min-w-[200px]">
              <Dropdown
                value={statusFilter}
                options={[
                  'All',
                  'Pending Review',
                  'Approved',
                  'Rejected',
                  'Item Returned',
                  'Issue Resolved',
                  'Replacement Sent'
                ]}
                placeholder="All Status"
                onChange={(value) => setStatusFilter(value as string)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border border-gray-200">
        <CardHeader className="bg-gray-50 border-b border-gray-200">
          <CardTitle className="text-[#222222]">Return Requests from Admin Hub</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Return ID</TableHead>
                <TableHead>Order</TableHead>
                <TableHead>Admin Hub</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredReturns.map((returnItem) => (
                <TableRow key={returnItem.id}>
                  <TableCell>
                    <div className="font-medium text-[#222222]">{returnItem.id}</div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium text-[#222222]">{returnItem.orderNumber}</div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium text-[#222222]">{returnItem.adminHub}</div>
                      <div className="text-sm text-slate-600">Return ID: {returnItem.id}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium text-[#222222]">{returnItem.product}</div>
                      <div className="text-sm text-slate-600">Qty: {returnItem.quantity}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm text-slate-600 max-w-xs truncate">
                      {returnItem.reason}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      returnItem.returnType === 'Quality Issue' 
                        ? 'text-red-600 bg-red-100' 
                        : returnItem.returnType === 'Defective Item'
                        ? 'text-orange-600 bg-orange-100'
                        : 'text-blue-600 bg-blue-100'
                    }`}>
                      {returnItem.returnType}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(returnItem.status)}`}>
                      {getStatusIcon(returnItem.status)}
                      {returnItem.status}
                    </span>
                  </TableCell>
                  <TableCell className="text-slate-600">{returnItem.requestDate}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="hover:bg-gray-50 hover:border-gray-200"
                        onClick={() => router.push(`/vendor/dashboard/returns/view/${returnItem.id}`)}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      {returnItem.status === 'Pending Review' && (
                        <>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="text-green-600 hover:text-green-700 hover:bg-green-50"
                            title="Approve Return"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            title="Reject Return"
                          >
                            <XCircle className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                      {returnItem.status === 'Approved' && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                          title="Mark Item Returned"
                        >
                          <Package className="w-4 h-4" />
                        </Button>
                      )}
                      {returnItem.status === 'Item Returned' && returnItem.returnType === 'Quality Issue' && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="text-green-600 hover:text-green-700 hover:bg-green-50"
                          title="Mark Issue Resolved"
                        >
                          <CheckCircle className="w-4 h-4" />
                        </Button>
                      )}
                      {returnItem.status === 'Item Returned' && returnItem.returnType === 'Defective Item' && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
                          title="Send Replacement"
                        >
                          <Package className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
