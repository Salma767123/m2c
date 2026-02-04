'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/UI/Card';
import { Button } from '@/components/UI/Button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/UI/Table';
import Dropdown from '@/components/UI/Dropdown';
import { Truck, Package, Clock, CheckCircle, Search, Edit, Trash2, X } from 'lucide-react';

interface Shipment {
  id: string;
  orderId: string;
  adminHub: string;
  status: 'Pending' | 'Shipped to Hub' | 'Received at Hub' | 'Quality Check' | 'Approved' | 'Rejected';
  trackingNumber: string;
  carrier: string;
  estimatedDelivery: string;
  items: number;
  hubNotes?: string;
  rejectionReason?: string;
}

export default function Shipping() {
  const router = useRouter();
  const [shipments, setShipments] = useState<Shipment[]>([
    {
      id: 'SH-001',
      orderId: 'ORD-001',
      adminHub: 'M2C Admin Hub - Warehouse A',
      status: 'Shipped to Hub',
      trackingNumber: 'TRK123456789',
      carrier: 'FedEx',
      estimatedDelivery: '2024-01-18',
      items: 3
    },
    {
      id: 'SH-002',
      orderId: 'ORD-002',
      adminHub: 'M2C Admin Hub - Warehouse B',
      status: 'Approved',
      trackingNumber: 'TRK987654321',
      carrier: 'UPS',
      estimatedDelivery: '2024-01-16',
      items: 2,
      hubNotes: 'Quality check passed - items approved for customer shipment'
    },
    {
      id: 'SH-003',
      orderId: 'ORD-003',
      adminHub: 'M2C Admin Hub - Warehouse C',
      status: 'Rejected',
      trackingNumber: 'TRK555666777',
      carrier: 'DHL',
      estimatedDelivery: '2024-01-15',
      items: 1,
      hubNotes: 'Quality issue detected - fabric defect found',
      rejectionReason: 'Product quality does not meet standards'
    }
  ]);

  const [editingShipment, setEditingShipment] = useState<Shipment | null>(null);
  const [newStatus, setNewStatus] = useState<string>('');

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Pending': return 'text-yellow-600 bg-yellow-100';
      case 'Shipped to Hub': return 'text-blue-600 bg-blue-100';
      case 'Received at Hub': return 'text-indigo-600 bg-indigo-100';
      case 'Quality Check': return 'text-purple-600 bg-purple-100';
      case 'Approved': return 'text-green-600 bg-green-100';
      case 'Rejected': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const handleEditShipment = (shipment: Shipment) => {
    setEditingShipment(shipment);
    setNewStatus(shipment.status);
  };

  const handleUpdateStatus = () => {
    if (editingShipment && newStatus) {
      setShipments(prev => 
        prev.map(shipment => 
          shipment.id === editingShipment.id 
            ? { ...shipment, status: newStatus as Shipment['status'] }
            : shipment
        )
      );
      setEditingShipment(null);
      setNewStatus('');
    }
  };

  const handleDeleteShipment = (shipmentId: string) => {
    if (confirm('Are you sure you want to delete this shipment?')) {
      setShipments(prev => prev.filter(shipment => shipment.id !== shipmentId));
    }
  };

  const closeEditModal = () => {
    setEditingShipment(null);
    setNewStatus('');
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-[#222222]">Shipments to Admin Hub</h1>
          <p className="text-slate-600">Track shipments sent to admin hub for quality control</p>
        </div>
        <Button
          className="bg-[#222222] text-white text-base font-semibold hover:bg-[#313131]"
          onClick={() => router.push('/vendor/dashboard/shipping/create')}
        >
          <Package className="w-4 h-4 mr-2" />
          Create Shipment
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="border border-gray-200 hover:border-gray-200">
          <CardContent className="p-6">
            <div className="flex items-center">
              <Package className="w-8 h-8 text-gray-700" />
              <div className="ml-4">
                <p className="text-sm font-medium text-slate-600">Total Shipments</p>
                <p className="text-2xl font-bold text-[#222222]">24</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-gray-200 hover:border-gray-200">
          <CardContent className="p-6">
            <div className="flex items-center">
              <Clock className="w-8 h-8 text-yellow-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-slate-600">Pending</p>
                <p className="text-2xl font-bold text-[#222222]">
                  {shipments.filter(s => s.status === 'Pending').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-gray-200 hover:border-gray-200">
          <CardContent className="p-6">
            <div className="flex items-center">
              <Truck className="w-8 h-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-slate-600">Shipped to Hub</p>
                <p className="text-2xl font-bold text-[#222222]">
                  {shipments.filter(s => s.status === 'Shipped to Hub').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-gray-200 hover:border-gray-200">
          <CardContent className="p-6">
            <div className="flex items-center">
              <CheckCircle className="w-8 h-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-slate-600">Approved</p>
                <p className="text-2xl font-bold text-[#222222]">
                  {shipments.filter(s => s.status === 'Approved').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border border-gray-200">
        <CardContent className="p-6">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Search shipments..."
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-gray-700 focus:border-gray-700"
            />
          </div>
        </CardContent>
      </Card>

      <Card className="border border-gray-200">
        <CardHeader className="bg-gray-50 border-b border-gray-200">
          <CardTitle className="text-[#222222]">Shipments to Admin Hub</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Shipment ID</TableHead>
                <TableHead>Order</TableHead>
                <TableHead>Admin Hub</TableHead>
                <TableHead>Carrier</TableHead>
                <TableHead>Tracking</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>ETA</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {shipments.map((shipment) => (
                <TableRow key={shipment.id}>
                  <TableCell className="font-medium text-[#222222]">{shipment.id}</TableCell>
                  <TableCell className="text-slate-600">{shipment.orderId}</TableCell>
                  <TableCell className="text-slate-600">{shipment.adminHub}</TableCell>
                  <TableCell className="text-slate-600">{shipment.carrier}</TableCell>
                  <TableCell className="text-slate-600">{shipment.trackingNumber}</TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(shipment.status)}`}>
                      {shipment.status}
                    </span>
                  </TableCell>
                  <TableCell className="text-slate-600">{shipment.estimatedDelivery}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700"
                        onClick={() => handleEditShipment(shipment)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="hover:bg-red-50 hover:border-red-200 hover:text-red-700"
                        onClick={() => handleDeleteShipment(shipment.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit Status Modal */}
      {editingShipment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">Edit Shipment</p>
                <h3 className="text-lg font-semibold text-[#222222]">{editingShipment.id}</h3>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="hover:bg-gray-50 hover:text-[#222222]"
                onClick={closeEditModal}
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            <div className="px-6 py-5 space-y-4">
              <div className="space-y-3">
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-slate-600">Order:</span>
                      <span className="font-medium ml-2 text-[#222222]">{editingShipment.orderId}</span>
                    </div>
                    <div>
                      <span className="text-slate-600">Admin Hub:</span>
                      <span className="font-medium ml-2 text-[#222222]">{editingShipment.adminHub}</span>
                    </div>
                    <div>
                      <span className="text-slate-600">Carrier:</span>
                      <span className="font-medium ml-2 text-[#222222]">{editingShipment.carrier}</span>
                    </div>
                    <div>
                      <span className="text-slate-600">Tracking:</span>
                      <span className="font-medium ml-2 text-[#222222]">{editingShipment.trackingNumber}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#222222] mb-2">
                    Update Status
                  </label>
                  <Dropdown
                    value={newStatus}
                    options={[
                      'Pending',
                      'Shipped to Hub',
                      'Received at Hub',
                      'Quality Check',
                      'Approved',
                      'Rejected'
                    ]}
                    placeholder="Select Status"
                    onChange={(value) => setNewStatus(value as string)}
                  />
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-sm text-blue-800">
                    <strong>Current Status:</strong> 
                    <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(editingShipment.status)}`}>
                      {editingShipment.status}
                    </span>
                  </p>
                  {newStatus && newStatus !== editingShipment.status && (
                    <p className="text-sm text-blue-800 mt-2">
                      <strong>New Status:</strong> 
                      <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(newStatus)}`}>
                        {newStatus}
                      </span>
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 px-6 py-4 border-t border-slate-200 bg-gray-50/50">
              <Button
                variant="outline"
                className="hover:bg-gray-50 hover:border-gray-200"
                onClick={closeEditModal}
              >
                Cancel
              </Button>
              <Button 
                className="bg-[#222222] text-white hover:bg-[#313131]"
                onClick={handleUpdateStatus}
                disabled={!newStatus || newStatus === editingShipment.status}
              >
                Update Status
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
