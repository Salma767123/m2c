'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/UI/Card';
import { Button } from '@/components/UI/Button';
import { Badge } from '@/components/UI/Badge';
import { Breadcrumb } from '@/components/AdminDashboard/Breadcrumb/Breadcrumb';
import Dropdown from '@/components/UI/Dropdown';
import { 
  ArrowLeft,
  Save,
  Package,
  User,
  MapPin,
  Phone,
  Mail,
  Plus,
  Trash2,
  ShoppingCart,
  DollarSign,
  Truck
} from 'lucide-react';

interface CustomerOrderItem {
  id: string;
  productName: string;
  sku: string;
  quantity: number;
  price: number;
  total: number;
  variant?: string;
}

interface ShippingAddress {
  name: string;
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  phone: string;
}

interface CustomerOrderForm {
  orderNumber: string;
  customer: {
    id: string;
    name: string;
    email: string;
    phone: string;
    loyaltyTier?: 'Bronze' | 'Silver' | 'Gold' | 'Platinum';
  };
  vendor: {
    id: string;
    name: string;
  };
  items: CustomerOrderItem[];
  subtotal: number;
  shipping: number;
  tax: number;
  total: number;
  status: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'returned';
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
  shippingAddress: ShippingAddress;
  trackingNumber?: string;
  shippingCarrier?: string;
  estimatedDelivery?: string;
  customerNotes?: string;
  adminNotes?: string;
  deliveryPreferences?: {
    preferredTime?: string;
    specialInstructions?: string;
    signatureRequired?: boolean;
    leaveAtDoor?: boolean;
  };
}

// Mock data for existing orders that can be selected
const mockExistingOrders = [
  {
    orderNumber: 'ORD-2024-001',
    customer: { id: 'CUST-001', name: 'Sarah Johnson', email: 'sarah.johnson@email.com', phone: '+1 (555) 123-4567' },
    vendor: { id: 'VEN-001', name: 'Cotton Mills Ltd' },
    items: [
      { id: 'item-1', productName: 'Premium Cotton Bed Sheet Set - Queen', sku: 'CS-Q-WHT-001', quantity: 2, price: 89.99, total: 179.98, variant: 'White - Queen Size' },
      { id: 'item-2', productName: 'Memory Foam Pillow', sku: 'MFP-S-WHT-004', quantity: 4, price: 34.99, total: 139.96, variant: 'Standard - White' }
    ],
    subtotal: 319.94,
    shipping: 15.00,
    tax: 25.59,
    total: 360.53,
    shippingAddress: {
      name: 'Sarah Johnson',
      street: '123 Main Street, Apt 4B',
      city: 'New York',
      state: 'NY',
      zipCode: '10001',
      country: 'United States',
      phone: '+1 (555) 123-4567'
    },
    customerNotes: 'Please leave package with doorman if not home',
    deliveryPreferences: {
      preferredTime: 'Morning (9AM-12PM)',
      specialInstructions: 'Leave with doorman',
      signatureRequired: false,
      leaveAtDoor: false,
    }
  },
  {
    orderNumber: 'ORD-2024-002',
    customer: { id: 'CUST-002', name: 'Michael Chen', email: 'michael.chen@email.com', phone: '+1 (555) 987-6543' },
    vendor: { id: 'VEN-002', name: 'Textile Pro' },
    items: [
      { id: 'item-3', productName: 'Luxury Bath Towel Set', sku: 'BT-L-BLU-002', quantity: 1, price: 24.99, total: 24.99, variant: 'Blue - Large Set' }
    ],
    subtotal: 24.99,
    shipping: 8.00,
    tax: 2.64,
    total: 35.63,
    shippingAddress: {
      name: 'Michael Chen',
      street: '456 Oak Avenue',
      city: 'Los Angeles',
      state: 'CA',
      zipCode: '90210',
      country: 'United States',
      phone: '+1 (555) 987-6543'
    },
    customerNotes: '',
    deliveryPreferences: {
      preferredTime: 'Afternoon (1PM-5PM)',
      specialInstructions: '',
      signatureRequired: true,
      leaveAtDoor: false,
    }
  },
  {
    orderNumber: 'ORD-2024-003',
    customer: { id: 'CUST-003', name: 'Emily Rodriguez', email: 'emily.rodriguez@email.com', phone: '+1 (555) 456-7890' },
    vendor: { id: 'VEN-003', name: 'Home Decor Inc' },
    items: [
      { id: 'item-4', productName: 'Blackout Curtains - Wide', sku: 'BC-W-GRY-003', quantity: 2, price: 45.99, total: 91.98, variant: 'Gray - 84 inch' },
      { id: 'item-5', productName: 'Wool Blanket - Queen', sku: 'WB-Q-BRN-005', quantity: 1, price: 67.99, total: 67.99, variant: 'Brown - Queen Size' }
    ],
    subtotal: 159.97,
    shipping: 12.00,
    tax: 13.76,
    total: 185.73,
    shippingAddress: {
      name: 'Emily Rodriguez',
      street: '789 Pine Street',
      city: 'Chicago',
      state: 'IL',
      zipCode: '60601',
      country: 'United States',
      phone: '+1 (555) 456-7890'
    },
    customerNotes: 'I ordered beige curtains but received brown ones. Please process return.',
    deliveryPreferences: {
      preferredTime: 'Evening (5PM-8PM)',
      specialInstructions: 'Ring doorbell twice',
      signatureRequired: false,
      leaveAtDoor: true,
    }
  }
];

// Mock data for dropdowns
const mockCustomers = [
  { id: 'CUST-001', name: 'Sarah Johnson', email: 'sarah.johnson@email.com', phone: '+1 (555) 123-4567', loyaltyTier: 'Gold' as const },
  { id: 'CUST-002', name: 'Michael Chen', email: 'michael.chen@email.com', phone: '+1 (555) 987-6543', loyaltyTier: 'Silver' as const },
  { id: 'CUST-003', name: 'Emily Rodriguez', email: 'emily.rodriguez@email.com', phone: '+1 (555) 456-7890', loyaltyTier: 'Platinum' as const },
];

const mockVendors = [
  { id: 'VEN-001', name: 'Cotton Mills Ltd' },
  { id: 'VEN-002', name: 'Textile Pro' },
  { id: 'VEN-003', name: 'Home Decor Inc' },
];

const mockProducts = [
  { id: 'PROD-001', name: 'Premium Cotton Bed Sheet Set - Queen', sku: 'CS-Q-WHT-001', price: 89.99 },
  { id: 'PROD-002', name: 'Memory Foam Pillow', sku: 'MFP-S-WHT-004', price: 34.99 },
  { id: 'PROD-003', name: 'Luxury Bath Towel Set', sku: 'BT-L-BLU-002', price: 24.99 },
  { id: 'PROD-004', name: 'Blackout Curtains - Wide', sku: 'BC-W-GRY-003', price: 45.99 },
  { id: 'PROD-005', name: 'Wool Blanket - Queen', sku: 'WB-Q-BRN-005', price: 67.99 },
];

const shippingCarriers = [
  { value: 'fedex', label: 'FedEx' },
  { value: 'ups', label: 'UPS' },
  { value: 'usps', label: 'USPS' },
  { value: 'dhl', label: 'DHL' },
];

const statusOptions = [
  { value: 'pending', label: 'Pending' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'processing', label: 'Processing' },
  { value: 'shipped', label: 'Shipped' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'returned', label: 'Returned' },
];

const paymentStatusOptions = [
  { value: 'pending', label: 'Pending' },
  { value: 'paid', label: 'Paid' },
  { value: 'failed', label: 'Failed' },
  { value: 'refunded', label: 'Refunded' },
];

interface AddEditCustomerOrderProps {
  orderId?: string;
}

export default function AddEditCustomerOrder({ orderId }: AddEditCustomerOrderProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const isEdit = !!orderId;
  const [formData, setFormData] = useState<CustomerOrderForm>({
    orderNumber: '',
    customer: {
      id: '',
      name: '',
      email: '',
      phone: '',
    },
    vendor: {
      id: '',
      name: '',
    },
    items: [],
    subtotal: 0,
    shipping: 0,
    tax: 0,
    total: 0,
    status: 'pending',
    paymentStatus: 'pending',
    shippingAddress: {
      name: '',
      street: '',
      city: '',
      state: '',
      zipCode: '',
      country: 'United States',
      phone: '',
    },
    trackingNumber: '',
    shippingCarrier: '',
    estimatedDelivery: '',
    customerNotes: '',
    adminNotes: '',
    deliveryPreferences: {
      preferredTime: '',
      specialInstructions: '',
      signatureRequired: false,
      leaveAtDoor: false,
    },
  });

  useEffect(() => {
    if (isEdit && orderId) {
      // In a real app, fetch order data here
      // For now, we'll use mock data
      const mockOrder = {
        orderNumber: `ORD-2024-${orderId.padStart(3, '0')}`,
        customer: mockCustomers[0],
        vendor: mockVendors[0],
        items: [
          {
            id: 'item-1',
            productName: 'Premium Cotton Bed Sheet Set - Queen',
            sku: 'CS-Q-WHT-001',
            quantity: 2,
            price: 89.99,
            total: 179.98,
            variant: 'White - Queen Size'
          }
        ],
        subtotal: 179.98,
        shipping: 15.00,
        tax: 14.40,
        total: 209.38,
        status: 'pending' as const,
        paymentStatus: 'pending' as const,
        shippingAddress: {
          name: 'Sarah Johnson',
          street: '123 Main Street, Apt 4B',
          city: 'New York',
          state: 'NY',
          zipCode: '10001',
          country: 'United States',
          phone: '+1 (555) 123-4567'
        },
        trackingNumber: '',
        shippingCarrier: '',
        estimatedDelivery: '',
        customerNotes: '',
        adminNotes: '',
        deliveryPreferences: {
          preferredTime: '',
          specialInstructions: '',
          signatureRequired: false,
          leaveAtDoor: false,
        },
      };
      setFormData(mockOrder);
    } else {
      // Generate new order number for new orders
      setFormData(prev => ({
        ...prev,
        orderNumber: `ORD-2024-${String(Date.now()).slice(-3)}`
      }));
    }
  }, [isEdit, orderId]);

  const handleOrderNumberChange = (orderNumber: string | string[]) => {
    const orderNumberStr = Array.isArray(orderNumber) ? orderNumber[0] : orderNumber;
    
    if (orderNumberStr === '' || !orderNumberStr) {
      // Reset form for new order
      setFormData({
        orderNumber: '',
        customer: { id: '', name: '', email: '', phone: '' },
        vendor: { id: '', name: '' },
        items: [],
        subtotal: 0,
        shipping: 0,
        tax: 0,
        total: 0,
        status: 'pending',
        paymentStatus: 'pending',
        shippingAddress: {
          name: '',
          street: '',
          city: '',
          state: '',
          zipCode: '',
          country: 'United States',
          phone: '',
        },
        trackingNumber: '',
        shippingCarrier: '',
        estimatedDelivery: '',
        customerNotes: '',
        adminNotes: '',
        deliveryPreferences: {
          preferredTime: '',
          specialInstructions: '',
          signatureRequired: false,
          leaveAtDoor: false,
        },
      });
      return;
    }

    const existingOrder = mockExistingOrders.find(order => order.orderNumber === orderNumberStr);
    if (existingOrder) {
      setFormData({
        orderNumber: existingOrder.orderNumber,
        customer: existingOrder.customer,
        vendor: existingOrder.vendor,
        items: existingOrder.items,
        subtotal: existingOrder.subtotal,
        shipping: existingOrder.shipping,
        tax: existingOrder.tax,
        total: existingOrder.total,
        status: 'pending', // Admin sets this
        paymentStatus: 'pending', // Admin sets this
        shippingAddress: existingOrder.shippingAddress,
        trackingNumber: '', // Admin fills this
        shippingCarrier: '', // Admin fills this
        estimatedDelivery: '', // Admin fills this
        customerNotes: existingOrder.customerNotes || '',
        adminNotes: '', // Admin fills this
        deliveryPreferences: existingOrder.deliveryPreferences,
      });
    }
  };



  const addOrderItem = () => {
    const newItem: CustomerOrderItem = {
      id: `item-${Date.now()}`,
      productName: '',
      sku: '',
      quantity: 1,
      price: 0,
      total: 0,
    };
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, newItem]
    }));
  };

  const updateOrderItem = (index: number, field: keyof CustomerOrderItem, value: any) => {
    const updatedItems = [...formData.items];
    updatedItems[index] = {
      ...updatedItems[index],
      [field]: value
    };

    // Recalculate total for the item
    if (field === 'quantity' || field === 'price') {
      updatedItems[index].total = updatedItems[index].quantity * updatedItems[index].price;
    }

    setFormData(prev => ({
      ...prev,
      items: updatedItems
    }));

    // Recalculate order totals
    calculateTotals(updatedItems);
  };

  const removeOrderItem = (index: number) => {
    const updatedItems = formData.items.filter((_, i) => i !== index);
    setFormData(prev => ({
      ...prev,
      items: updatedItems
    }));
    calculateTotals(updatedItems);
  };

  const calculateTotals = (items: CustomerOrderItem[]) => {
    const subtotal = items.reduce((sum, item) => sum + item.total, 0);
    const tax = subtotal * 0.08; // 8% tax
    const total = subtotal + formData.shipping + tax;

    setFormData(prev => ({
      ...prev,
      subtotal,
      tax,
      total
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // In a real app, make API call here
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      console.log('Order data:', formData);
      router.push('/admin/dashboard/orders/customer');
    } catch (error) {
      console.error('Error saving order:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <Breadcrumb />

      {/* Header */}
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
          <p className="text-xs uppercase tracking-wide text-gray-500">Customer Order</p>
          <h1 className="text-2xl font-bold text-gray-900">
            {isEdit ? `Edit Order ${formData.orderNumber}` : 'Create New Order'}
          </h1>
          <p className="text-gray-600">
            {isEdit ? 'Update customer order details' : 'Create a new customer order and shipping'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Order Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Order Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Order Number
                </label>
                <Dropdown
                  id="orderNumber"
                  value={formData.orderNumber}
                  options={[
                    { value: '', label: 'Select existing order or create new...' },
                    ...mockExistingOrders.map(order => ({
                      value: order.orderNumber,
                      label: `${order.orderNumber} - ${order.customer.name}`
                    }))
                  ]}
                  onChange={handleOrderNumberChange}
                />
                {formData.orderNumber === '' && (
                  <p className="text-xs text-gray-500 mt-1">
                    Select an existing order to auto-fill details, or leave empty to create new
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <Dropdown
                  id="status"
                  value={formData.status}
                  options={statusOptions}
                  onChange={(value) => {
                    const statusValue = Array.isArray(value) ? value[0] : value;
                    setFormData(prev => ({ ...prev, status: statusValue as any }));
                  }}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Payment Status
                </label>
                <Dropdown
                  id="paymentStatus"
                  value={formData.paymentStatus}
                  options={paymentStatusOptions}
                  onChange={(value) => {
                    const paymentValue = Array.isArray(value) ? value[0] : value;
                    setFormData(prev => ({ ...prev, paymentStatus: paymentValue as any }));
                  }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Customer Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Customer Information
              {formData.customer.id && (
                <Badge className="bg-green-100 text-green-800 text-xs">Auto-filled</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {formData.customer.id ? (
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Customer Name</label>
                    <p className="text-lg font-semibold text-gray-900">{formData.customer.name}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Customer ID</label>
                    <p className="text-sm text-gray-600">{formData.customer.id}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-gray-400" />
                    <span className="text-sm">{formData.customer.email}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-gray-400" />
                    <span className="text-sm">{formData.customer.phone}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Select Customer (Manual)
                </label>
                <Dropdown
                  id="manualCustomer"
                  value=""
                  options={[
                    { value: '', label: 'Select a customer...' },
                    ...mockCustomers.map(customer => ({
                      value: customer.id,
                      label: `${customer.name} (${customer.email})`
                    }))
                  ]}
                  onChange={(customerId) => {
                    const customerIdStr = Array.isArray(customerId) ? customerId[0] : customerId;
                    const customer = mockCustomers.find(c => c.id === customerIdStr);
                    if (customer) {
                      setFormData(prev => ({
                        ...prev,
                        customer,
                        shippingAddress: {
                          ...prev.shippingAddress,
                          name: customer.name,
                          phone: customer.phone,
                        }
                      }));
                    }
                  }}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Or select an order number above to auto-fill customer information
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Vendor Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Vendor Information
              {formData.vendor.id && (
                <Badge className="bg-green-100 text-green-800 text-xs">Auto-filled</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {formData.vendor.id ? (
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Vendor Name</label>
                    <p className="text-lg font-semibold text-gray-900">{formData.vendor.name}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Vendor ID</label>
                    <p className="text-sm text-gray-600">{formData.vendor.id}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Select Vendor (Manual)
                </label>
                <Dropdown
                  id="manualVendor"
                  value=""
                  options={[
                    { value: '', label: 'Select a vendor...' },
                    ...mockVendors.map(vendor => ({
                      value: vendor.id,
                      label: vendor.name
                    }))
                  ]}
                  onChange={(vendorId) => {
                    const vendorIdStr = Array.isArray(vendorId) ? vendorId[0] : vendorId;
                    const vendor = mockVendors.find(v => v.id === vendorIdStr);
                    if (vendor) {
                      setFormData(prev => ({
                        ...prev,
                        vendor
                      }));
                    }
                  }}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Or select an order number above to auto-fill vendor information
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Order Items */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                Order Items
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addOrderItem}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Item
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {formData.items.map((item, index) => (
                <div key={item.id} className="p-4 border border-gray-200 rounded-lg">
                  <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-end">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Product
                      </label>
                      <Dropdown
                        id={`product-${index}`}
                        value={item.sku}
                        options={[
                          { value: '', label: 'Select product...' },
                          ...mockProducts.map(product => ({
                            value: product.sku,
                            label: product.name
                          }))
                        ]}
                        onChange={(sku) => {
                          const skuValue = Array.isArray(sku) ? sku[0] : sku;
                          const product = mockProducts.find(p => p.sku === skuValue);
                          if (product) {
                            updateOrderItem(index, 'productName', product.name);
                            updateOrderItem(index, 'sku', product.sku);
                            updateOrderItem(index, 'price', product.price);
                          }
                        }}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        SKU
                      </label>
                      <input
                        type="text"
                        value={item.sku}
                        readOnly
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Quantity
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => updateOrderItem(index, 'quantity', parseInt(e.target.value) || 1)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-700 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Price
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={item.price}
                        onChange={(e) => updateOrderItem(index, 'price', parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-700 focus:border-transparent"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Total
                        </label>
                        <div className="text-lg font-semibold">${item.total.toFixed(2)}</div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeOrderItem(index)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
              {formData.items.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <ShoppingCart className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>No items added yet</p>
                  <p className="text-sm">Click "Add Item" to start building the order</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Order Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Order Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Subtotal
                </label>
                <div className="text-lg font-semibold">${formData.subtotal.toFixed(2)}</div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Shipping
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.shipping}
                  onChange={(e) => {
                    const shipping = parseFloat(e.target.value) || 0;
                    setFormData(prev => ({
                      ...prev,
                      shipping,
                      total: prev.subtotal + shipping + prev.tax
                    }));
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-700 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tax
                </label>
                <div className="text-lg font-semibold">${formData.tax.toFixed(2)}</div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Total
                </label>
                <div className="text-xl font-bold text-green-600">${formData.total.toFixed(2)}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Shipping Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Shipping Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  value={formData.shippingAddress.name}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    shippingAddress: { ...prev.shippingAddress, name: e.target.value }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-700 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={formData.shippingAddress.phone}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    shippingAddress: { ...prev.shippingAddress, phone: e.target.value }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-700 focus:border-transparent"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Street Address
              </label>
              <input
                type="text"
                value={formData.shippingAddress.street}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  shippingAddress: { ...prev.shippingAddress, street: e.target.value }
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-700 focus:border-transparent"
                required
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  City
                </label>
                <input
                  type="text"
                  value={formData.shippingAddress.city}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    shippingAddress: { ...prev.shippingAddress, city: e.target.value }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-700 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  State
                </label>
                <input
                  type="text"
                  value={formData.shippingAddress.state}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    shippingAddress: { ...prev.shippingAddress, state: e.target.value }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-700 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ZIP Code
                </label>
                <input
                  type="text"
                  value={formData.shippingAddress.zipCode}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    shippingAddress: { ...prev.shippingAddress, zipCode: e.target.value }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-700 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Country
                </label>
                <input
                  type="text"
                  value={formData.shippingAddress.country}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    shippingAddress: { ...prev.shippingAddress, country: e.target.value }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-700 focus:border-transparent"
                  required
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Shipping Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5" />
              Shipping Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Shipping Carrier
                </label>
                <Dropdown
                  id="shippingCarrier"
                  value={formData.shippingCarrier || ''}
                  options={[
                    { value: '', label: 'Select carrier...' },
                    ...shippingCarriers
                  ]}
                  onChange={(value) => {
                    const carrierValue = Array.isArray(value) ? value[0] : value;
                    setFormData(prev => ({ ...prev, shippingCarrier: carrierValue }));
                  }}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tracking Number
                </label>
                <input
                  type="text"
                  value={formData.trackingNumber || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, trackingNumber: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-700 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Estimated Delivery
                </label>
                <input
                  type="date"
                  value={formData.estimatedDelivery || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, estimatedDelivery: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-700 focus:border-transparent"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notes */}
        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Customer Notes
              </label>
              <textarea
                value={formData.customerNotes || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, customerNotes: e.target.value }))}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-700 focus:border-transparent"
                placeholder="Customer's special instructions or notes..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Admin Notes
              </label>
              <textarea
                value={formData.adminNotes || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, adminNotes: e.target.value }))}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-700 focus:border-transparent"
                placeholder="Internal notes for admin use..."
              />
            </div>
          </CardContent>
        </Card>

        {/* Form Actions */}
        <div className="flex items-center justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={loading || formData.items.length === 0}
            className="bg-gray-900 hover:bg-gray-800 text-white"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                {isEdit ? 'Update Order' : 'Create Order'}
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}