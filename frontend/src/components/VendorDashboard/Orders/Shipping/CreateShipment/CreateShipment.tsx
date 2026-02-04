'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/UI/Card';
import { Button } from '@/components/UI/Button';
import Dropdown from '@/components/UI/Dropdown';
import { ArrowLeft, Save, Package, Truck, Calendar, Hash, Building2 } from 'lucide-react';

interface OrderProduct {
  id: string;
  name: string;
  sku: string;
  quantity: number;
  price: number;
  variant?: string;
}

interface Order {
  id: string;
  orderNumber: string;
  customer: string;
  email: string;
  total: number;
  status: string;
  date: string;
  products: OrderProduct[];
}

interface HubAddress {
  id: string;
  name: string;
  addressLine1: string;
  addressLine2?: string;
  landmark?: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  phone: string;
  email: string;
}

interface ShipmentForm {
  orderId: string;
  customer: string;
  hubId: string;
  hubAddress: HubAddress | null;
  carrier: string;
  trackingNumber: string;
  status: 'Pending' | 'Shipped to Hub' | 'Received at Hub' | 'Quality Check' | 'Approved' | 'Rejected';
  estimatedDelivery: string;
  items: string;
  selectedProducts: string[]; // Array of selected product IDs
  notes?: string;
}

// Mock hub addresses data
const mockHubAddresses: HubAddress[] = [
  {
    id: 'hub-1',
    name: 'M2C Textiles Admin Hub - Warehouse A',
    addressLine1: '500 Industrial Blvd',
    addressLine2: 'Warehouse A',
    landmark: 'Near Highway 101',
    city: 'Manufacturing City',
    state: 'TX',
    zipCode: '75001',
    country: 'United States',
    phone: '+1 (555) 000-0001',
    email: 'warehouse-a@m2ctextiles.com'
  },
  {
    id: 'hub-2',
    name: 'M2C Textiles Admin Hub - Warehouse B',
    addressLine1: '500 Industrial Blvd',
    addressLine2: 'Warehouse B',
    landmark: 'Near Highway 101',
    city: 'Manufacturing City',
    state: 'TX',
    zipCode: '75001',
    country: 'United States',
    phone: '+1 (555) 000-0002',
    email: 'warehouse-b@m2ctextiles.com'
  },
  {
    id: 'hub-3',
    name: 'M2C Textiles Admin Hub - Warehouse C',
    addressLine1: '750 Commerce Drive',
    addressLine2: 'Warehouse C',
    landmark: 'Industrial District',
    city: 'Distribution Center',
    state: 'CA',
    zipCode: '90210',
    country: 'United States',
    phone: '+1 (555) 000-0003',
    email: 'warehouse-c@m2ctextiles.com'
  },
  {
    id: 'hub-4',
    name: 'M2C Textiles Admin Hub - Warehouse D',
    addressLine1: '1200 Logistics Avenue',
    addressLine2: 'Warehouse D',
    landmark: 'Near Port Authority',
    city: 'Shipping Hub',
    state: 'FL',
    zipCode: '33101',
    country: 'United States',
    phone: '+1 (555) 000-0004',
    email: 'warehouse-d@m2ctextiles.com'
  }
];

// Mock orders data (same as in Orders.tsx)
const mockOrders: Order[] = [
  {
    id: '1',
    orderNumber: 'ORD-001',
    customer: 'John Doe',
    email: 'john@example.com',
    total: 89.97,
    status: 'Processing',
    date: '2024-01-15',
    products: [
      {
        id: 'p1',
        name: 'Cotton Kitchen Towel',
        sku: 'KL-CKT-001',
        quantity: 2,
        price: 12.99,
        variant: 'White - Medium'
      },
      {
        id: 'p2',
        name: 'Handwoven Bath Towel',
        sku: 'BL-HBT-002',
        quantity: 1,
        price: 24.99,
        variant: 'Blue - Large'
      }
    ]
  },
  {
    id: '2',
    orderNumber: 'ORD-002',
    customer: 'Jane Smith',
    email: 'jane@example.com',
    total: 45.99,
    status: 'Shipped',
    date: '2024-01-14',
    products: [
      {
        id: 'p3',
        name: 'Premium Bed Sheet Set',
        sku: 'BL-PBS-003',
        quantity: 1,
        price: 45.99,
        variant: 'Queen - White'
      }
    ]
  },
  {
    id: '3',
    orderNumber: 'ORD-003',
    customer: 'Mike Johnson',
    email: 'mike@example.com',
    total: 124.50,
    status: 'Delivered',
    date: '2024-01-13',
    products: [
      {
        id: 'p4',
        name: 'Artisan Apron',
        sku: 'AP-ART-004',
        quantity: 3,
        price: 18.99,
        variant: 'Navy - One Size'
      },
      {
        id: 'p5',
        name: 'Linen Table Runner',
        sku: 'TL-LTR-005',
        quantity: 2,
        price: 32.76,
        variant: 'Natural - 180cm'
      }
    ]
  }
];

export default function CreateShipment() {
  const router = useRouter();
  const [form, setForm] = useState<ShipmentForm>({
    orderId: '',
    customer: '',
    hubId: '',
    hubAddress: null,
    carrier: '',
    trackingNumber: '',
    status: 'Pending',
    estimatedDelivery: '',
    items: '0',
    selectedProducts: [],
    notes: '',
  });

  const [errors, setErrors] = useState<Partial<Record<keyof ShipmentForm, string>>>({});
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const handleChange = (field: keyof ShipmentForm, value: string | string[]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const handleHubSelect = (hubId: string) => {
    const hub = mockHubAddresses.find(h => h.id === hubId);
    setForm(prev => ({
      ...prev,
      hubId: hubId,
      hubAddress: hub || null
    }));
  };

  const handleOrderSelect = (orderNumber: string) => {
    const order = mockOrders.find(o => o.orderNumber === orderNumber);
    if (order) {
      setSelectedOrder(order);
      setForm(prev => ({
        ...prev,
        orderId: orderNumber,
        customer: order.customer,
        selectedProducts: [], // Reset selected products
        items: '0' // Reset items count
      }));
    } else {
      setSelectedOrder(null);
      setForm(prev => ({
        ...prev,
        orderId: orderNumber,
        customer: '',
        selectedProducts: [],
        items: '0'
      }));
    }
  };

  const handleProductToggle = (productId: string) => {
    const newSelectedProducts = form.selectedProducts.includes(productId)
      ? form.selectedProducts.filter(id => id !== productId)
      : [...form.selectedProducts, productId];
    
    // Calculate total items based on selected products
    const totalItems = newSelectedProducts.reduce((total, id) => {
      const product = selectedOrder?.products.find(p => p.id === id);
      return total + (product?.quantity || 0);
    }, 0);

    setForm(prev => ({
      ...prev,
      selectedProducts: newSelectedProducts,
      items: totalItems.toString()
    }));
  };

  const validate = () => {
    const next: Partial<Record<keyof ShipmentForm, string>> = {};
    if (!form.orderId.trim()) next.orderId = 'Order ID is required';
    if (!form.customer.trim()) next.customer = 'Customer name is required';
    if (!form.hubId.trim()) next.hubId = 'Hub selection is required';
    if (!form.carrier.trim()) next.carrier = 'Carrier is required';
    if (!form.trackingNumber.trim()) next.trackingNumber = 'Tracking number is required';
    if (!form.estimatedDelivery.trim()) next.estimatedDelivery = 'ETA is required';
    if (form.selectedProducts.length === 0) next.items = 'Please select at least one product to ship';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    // Create shipment data that matches the Shipping component's expected format
    const newShipment = {
      id: `SH-${String(Date.now()).slice(-3)}`, // Generate a simple ID
      orderId: form.orderId,
      adminHub: form.hubAddress?.name || 'Unknown Hub',
      status: form.status,
      trackingNumber: form.trackingNumber,
      carrier: form.carrier,
      estimatedDelivery: form.estimatedDelivery,
      items: parseInt(form.items),
      hubNotes: form.notes || undefined,
    };

    // In a real app, this would be an API call
    console.log('Create shipment payload:', newShipment);
    
    // Navigate back to shipping list
    router.push('/vendor/dashboard/shipping');
  };

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
          <p className="text-xs uppercase tracking-wide text-slate-500">Shipping</p>
          <h1 className="text-2xl font-bold text-[#222222]">Create Shipment to Admin Hub</h1>
          <p className="text-slate-600">Generate a shipment for an order to admin hub</p>
        </div>
      </div>

      <Card className="border border-gray-200">
        <CardHeader className="bg-gray-50 border-b border-gray-200">
          <CardTitle className="text-[#222222] text-lg">Shipment Details</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Dropdown
                  label="Order ID *"
                  value={form.orderId}
                  options={mockOrders.map(order => ({
                    value: order.orderNumber,
                    label: `${order.orderNumber} - ${order.customer}`
                  }))}
                  placeholder="Select Order"
                  onChange={(value) => handleOrderSelect(value as string)}
                />
                {errors.orderId && <p className="text-gray-700 text-xs mt-1">{errors.orderId}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-[#222222] mb-2">
                  Customer Name
                </label>
                <input
                  type="text"
                  value={form.customer}
                  readOnly
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg bg-gray-50 text-gray-600"
                  placeholder="Auto-filled from order"
                />
              </div>
            </div>

            <div>
              <Dropdown
                label="Status"
                value={form.status}
                options={[
                  'Pending',
                  'Shipped to Hub',
                  'Received at Hub',
                  'Quality Check',
                  'Approved',
                  'Rejected'
                ]}
                placeholder="Select Status"
                onChange={(value) => handleChange('status', value as ShipmentForm['status'])}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-[#222222] mb-2">
                  Carrier <span className="text-gray-700">*</span>
                </label>
                <div className="relative">
                  <Truck className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    value={form.carrier}
                    onChange={(e) => handleChange('carrier', e.target.value)}
                    className={`w-full pl-9 pr-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-gray-700 focus:border-gray-700 ${
                      errors.carrier ? 'border-gray-500' : 'border-gray-200'
                    }`}
                    placeholder="FedEx, UPS..."
                  />
                </div>
                {errors.carrier && <p className="text-gray-700 text-xs mt-1">{errors.carrier}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-[#222222] mb-2">
                  Tracking Number <span className="text-gray-700">*</span>
                </label>
                <div className="relative">
                  <Package className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    value={form.trackingNumber}
                    onChange={(e) => handleChange('trackingNumber', e.target.value)}
                    className={`w-full pl-9 pr-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-gray-700 focus:border-gray-700 ${
                      errors.trackingNumber ? 'border-gray-500' : 'border-gray-200'
                    }`}
                    placeholder="TRK123456789"
                  />
                </div>
                {errors.trackingNumber && <p className="text-gray-700 text-xs mt-1">{errors.trackingNumber}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-[#222222] mb-2">
                  Estimated Delivery <span className="text-gray-700">*</span>
                </label>
                <div className="relative">
                  <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="date"
                    value={form.estimatedDelivery}
                    onChange={(e) => handleChange('estimatedDelivery', e.target.value)}
                    className={`w-full pl-9 pr-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-gray-700 focus:border-gray-700 ${
                      errors.estimatedDelivery ? 'border-gray-500' : 'border-gray-200'
                    }`}
                  />
                </div>
                {errors.estimatedDelivery && <p className="text-gray-700 text-xs mt-1">{errors.estimatedDelivery}</p>}
              </div>
            </div>

            {/* Products Selection */}
            {selectedOrder && (
              <div className="space-y-4">
                <div className="border-t border-gray-200 pt-6">
                  <h3 className="text-lg font-medium text-[#222222] mb-4">Select Products to Ship</h3>
                  <div className="space-y-3">
                    {selectedOrder.products.map((product) => (
                      <div key={product.id} className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                        <input
                          type="checkbox"
                          id={`product-${product.id}`}
                          checked={form.selectedProducts.includes(product.id)}
                          onChange={() => handleProductToggle(product.id)}
                          className="w-4 h-4 text-gray-900 border-gray-300 rounded focus:ring-gray-700"
                        />
                        <label htmlFor={`product-${product.id}`} className="ml-3 flex-1 cursor-pointer">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-[#222222]">{product.name}</p>
                              <div className="flex items-center gap-4 mt-1">
                                <span className="text-xs font-mono bg-gray-100 px-2 py-1 rounded">
                                  SKU: {product.sku}
                                </span>
                                {product.variant && (
                                  <span className="text-xs text-slate-600">
                                    {product.variant}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-medium text-[#222222]">
                                Qty: {product.quantity}
                              </p>
                            </div>
                          </div>
                        </label>
                      </div>
                    ))}
                  </div>
                  {errors.items && <p className="text-gray-700 text-xs mt-2">{errors.items}</p>}
                </div>

                

                {/* Items Summary */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-blue-900">
                      Selected Items for Shipment:
                    </span>
                    <span className="text-lg font-bold text-blue-900">
                      {form.items} items
                    </span>
                  </div>
                  {form.selectedProducts.length > 0 && (
                    <div className="mt-2 text-xs text-blue-800">
                      {form.selectedProducts.length} product{form.selectedProducts.length !== 1 ? 's' : ''} selected
                    </div>
                  )}
                </div>

                {/* Select Admin Hub Section */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-[#222222]">Select Admin Hub</h3>
                  <div>
                    <Dropdown
                      label="Select Admin Hub *"
                      value={form.hubId}
                      options={mockHubAddresses.map(hub => ({
                        value: hub.id,
                        label: hub.name
                      }))}
                      placeholder="Select Hub"
                      onChange={(value) => handleHubSelect(value as string)}
                    />
                    {errors.hubId && <p className="text-gray-700 text-xs mt-1">{errors.hubId}</p>}
                  </div>
                </div>

                {/* Hub Address Display */}
                {form.hubAddress && (
                  <div className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Building2 className="w-5 h-5 text-gray-600" />
                      <h3 className="text-sm font-medium text-gray-900">Selected Hub Address</h3>
                    </div>
                    <div className="space-y-1 text-sm text-gray-700">
                      <p className="font-medium">{form.hubAddress.name}</p>
                      <p>{form.hubAddress.addressLine1}</p>
                      {form.hubAddress.addressLine2 && <p>{form.hubAddress.addressLine2}</p>}
                      {form.hubAddress.landmark && <p>{form.hubAddress.landmark}</p>}
                      <p>{form.hubAddress.city}, {form.hubAddress.state} {form.hubAddress.zipCode}</p>
                      <p>{form.hubAddress.country}</p>
                      <div className="flex gap-4 mt-2">
                        <p>Phone: {form.hubAddress.phone}</p>
                        <p>Email: {form.hubAddress.email}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {!selectedOrder && form.orderId && (
              <div className="text-center py-8 text-slate-500">
                <Package className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                <p className="text-lg font-medium">Select an order to view products</p>
                <p className="text-sm">Choose an order from the dropdown above</p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-[#222222] mb-2">
                Notes
              </label>
              <textarea
                value={form.notes}
                onChange={(e) => handleChange('notes', e.target.value)}
                rows={4}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-gray-700 focus:border-gray-700 resize-none"
                placeholder="Optional notes for this shipment"
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
              <Button
                type="button"
                variant="outline"
                className="hover:bg-gray-50 hover:border-gray-200"
                onClick={() => router.back()}
              >
                Cancel
              </Button>
              <Button type="submit" className="bg-[#222222] hover:bg-[#313131] text-white">
                <Save className="w-4 h-4 mr-2" />
                Create Shipment
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
