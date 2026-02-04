'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/UI/Card';
import { Button } from '@/components/UI/Button';
import { Badge } from '@/components/UI/Badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/UI/Table';
import { Breadcrumb } from '@/components/AdminDashboard/Breadcrumb/Breadcrumb';
import Dropdown from '@/components/UI/Dropdown';
import { 
  Users as UsersIcon, 
  UserPlus, 
  Search, 
  Filter, 
  Eye,
  Edit,
  Trash2,
  ShieldCheck,
  Mail,
  Phone,
  Activity,
  UserCheck,
  UserX,
  Star,
  ShoppingBag
} from 'lucide-react';

interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  status: 'active' | 'inactive' | 'suspended' | 'pending';
  joinDate: string;
  lastLogin: string;
  totalOrders: number;
  totalSpent: number;
  loyaltyTier: 'Bronze' | 'Silver' | 'Gold' | 'Platinum';
  avatar?: string;
  address: {
    addressLine1: string;
    addressLine2?: string;
    landmark?: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  averageRating?: number;
  reviewsCount?: number;
}
// Mock customers data
const mockCustomers: Customer[] = [
  {
    id: '1',
    firstName: 'Sarah',
    lastName: 'Johnson',
    email: 'sarah.johnson@email.com',
    phone: '+1 (555) 123-4567',
    status: 'active',
    joinDate: '2024-01-15T10:30:00Z',
    lastLogin: '2024-02-01T14:20:00Z',
    totalOrders: 15,
    totalSpent: 2450.75,
    loyaltyTier: 'Gold',
    address: {
      addressLine1: '123 Main Street',
      addressLine2: 'Apt 4B',
      landmark: 'Near Central Park',
      city: 'New York',
      state: 'NY',
      zipCode: '10001',
      country: 'United States'
    },
    isEmailVerified: true,
    isPhoneVerified: true,
    averageRating: 4.8,
    reviewsCount: 12
  },
  {
    id: '2',
    firstName: 'Michael',
    lastName: 'Chen',
    email: 'michael.chen@email.com',
    phone: '+1 (555) 987-6543',
    status: 'active',
    joinDate: '2024-01-10T09:15:00Z',
    lastLogin: '2024-02-02T11:45:00Z',
    totalOrders: 8,
    totalSpent: 1250.30,
    loyaltyTier: 'Silver',
    address: {
      addressLine1: '456 Oak Avenue',
      addressLine2: 'Suite 200',
      landmark: 'Business District',
      city: 'Los Angeles',
      state: 'CA',
      zipCode: '90210',
      country: 'United States'
    },
    isEmailVerified: true,
    isPhoneVerified: false,
    averageRating: 4.5,
    reviewsCount: 6
  },
  {
    id: '3',
    firstName: 'Emily',
    lastName: 'Rodriguez',
    email: 'emily.rodriguez@email.com',
    phone: '+1 (555) 456-7890',
    status: 'inactive',
    joinDate: '2023-12-20T16:45:00Z',
    lastLogin: '2024-01-25T08:30:00Z',
    totalOrders: 32,
    totalSpent: 5680.25,
    loyaltyTier: 'Platinum',
    address: {
      addressLine1: '789 Pine Street',
      addressLine2: 'Unit 12',
      landmark: 'Downtown Area',
      city: 'Chicago',
      state: 'IL',
      zipCode: '60601',
      country: 'United States'
    },
    isEmailVerified: true,
    isPhoneVerified: true,
    averageRating: 4.9,
    reviewsCount: 28
  },
  {
    id: '4',
    firstName: 'David',
    lastName: 'Wilson',
    email: 'david.wilson@email.com',
    phone: '+1 (555) 321-9876',
    status: 'active',
    joinDate: '2023-11-01T12:00:00Z',
    lastLogin: '2024-02-03T09:15:00Z',
    totalOrders: 5,
    totalSpent: 890.50,
    loyaltyTier: 'Bronze',
    address: {
      addressLine1: '321 Customer Boulevard',
      city: 'Seattle',
      state: 'WA',
      zipCode: '98101',
      country: 'United States'
    },
    isEmailVerified: true,
    isPhoneVerified: true,
    averageRating: 4.2,
    reviewsCount: 4
  },
  {
    id: '5',
    firstName: 'Lisa',
    lastName: 'Thompson',
    email: 'lisa.thompson@email.com',
    phone: '+1 (555) 654-3210',
    status: 'suspended',
    joinDate: '2024-01-20T14:30:00Z',
    lastLogin: '2024-01-28T16:20:00Z',
    totalOrders: 3,
    totalSpent: 125.50,
    loyaltyTier: 'Bronze',
    address: {
      addressLine1: '654 Elm Street',
      city: 'Miami',
      state: 'FL',
      zipCode: '33101',
      country: 'United States'
    },
    isEmailVerified: false,
    isPhoneVerified: false,
    averageRating: 3.8,
    reviewsCount: 2
  },
  {
    id: '6',
    firstName: 'James',
    lastName: 'Brown',
    email: 'james.brown@email.com',
    phone: '+1 (555) 789-0123',
    status: 'pending',
    joinDate: '2024-02-01T10:00:00Z',
    lastLogin: '2024-02-01T10:00:00Z',
    totalOrders: 0,
    totalSpent: 0,
    loyaltyTier: 'Bronze',
    address: {
      addressLine1: '987 New Customer Lane',
      city: 'Phoenix',
      state: 'AZ',
      zipCode: '85001',
      country: 'United States'
    },
    isEmailVerified: false,
    isPhoneVerified: false
  }
];

export default function CustomerManagement() {
  const [customers] = useState<Customer[]>(mockCustomers);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [loyaltyFilter, setLoyaltyFilter] = useState<string>('all');

  // Calculate stats
  const totalCustomers = customers.length;
  const newThisMonth = customers.filter(customer => {
    const joinDate = new Date(customer.joinDate);
    const now = new Date();
    return joinDate.getMonth() === now.getMonth() && joinDate.getFullYear() === now.getFullYear();
  }).length;
  const activeToday = customers.filter(customer => {
    const lastLogin = new Date(customer.lastLogin);
    const today = new Date();
    return lastLogin.toDateString() === today.toDateString();
  }).length;
  const activeCustomers = customers.filter(customer => customer.status === 'active').length;
  const suspendedCustomers = customers.filter(customer => customer.status === 'suspended').length;
  const pendingCustomers = customers.filter(customer => customer.status === 'pending').length;

  // Filter customers
  const filteredCustomers = customers.filter(customer => {
    const matchesSearch = 
      customer.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.phone.includes(searchTerm);
    
    const matchesStatus = statusFilter === 'all' || customer.status === statusFilter;
    const matchesLoyalty = loyaltyFilter === 'all' || customer.loyaltyTier === loyaltyFilter;

    return matchesSearch && matchesStatus && matchesLoyalty;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800">Active</Badge>;
      case 'inactive':
        return <Badge className="bg-gray-100 text-gray-800">Inactive</Badge>;
      case 'suspended':
        return <Badge className="bg-red-100 text-red-800">Suspended</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800">Unknown</Badge>;
    }
  };

  const getLoyaltyBadge = (tier: string) => {
    switch (tier) {
      case 'Bronze':
        return <Badge className="bg-amber-100 text-amber-800">Bronze</Badge>;
      case 'Silver':
        return <Badge className="bg-gray-100 text-gray-800">Silver</Badge>;
      case 'Gold':
        return <Badge className="bg-yellow-100 text-yellow-800">Gold</Badge>;
      case 'Platinum':
        return <Badge className="bg-slate-100 text-slate-800">Platinum</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800">Bronze</Badge>;
    }
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`w-3 h-3 ${i < Math.floor(rating) ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
      />
    ));
  };

  const handleStatusChange = (customerId: string, newStatus: 'active' | 'inactive' | 'suspended') => {
    // This would typically make an API call to update the customer status
    console.log(`Changing customer ${customerId} status to ${newStatus}`);
    // For now, just log the action
  };

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <Breadcrumb />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Customer Management</h1>
          <p className="text-gray-600">Manage customer accounts and their status</p>
        </div>
        <div className="flex items-center gap-3">
          <Button className="bg-gray-900 hover:bg-gray-800 text-white">
            <UserPlus className="h-4 w-4 mr-2" />
            Add Customer
          </Button>
        </div>
      </div>
      {/* Stats Cards */}
      <div className="grid gap-6 lg:grid-cols-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
            <UsersIcon className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCustomers}</div>
            <p className="text-xs text-gray-600">Registered customers</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">New This Month</CardTitle>
            <UserPlus className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{newThisMonth}</div>
            <p className="text-xs text-gray-600">+15% from last month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Today</CardTitle>
            <Activity className="h-4 w-4 text-indigo-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-indigo-600">{activeToday}</div>
            <p className="text-xs text-gray-600">Currently shopping</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Customers</CardTitle>
            <UserCheck className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{activeCustomers}</div>
            <p className="text-xs text-gray-600">Verified accounts</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Suspended</CardTitle>
            <UserX className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{suspendedCustomers}</div>
            <p className="text-xs text-gray-600">Restricted access</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <ShoppingBag className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{pendingCustomers}</div>
            <p className="text-xs text-gray-600">Awaiting verification</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="bg-white rounded-xl shadow-sm border border-slate-200">
        <CardContent className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <Filter className="w-5 h-5 text-gray-600" />
            <h3 className="text-lg font-semibold text-slate-900">Filter Customers</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                <Search className="w-4 h-4 inline mr-2" />
                Search Customers
              </label>
              <input
                type="text"
                placeholder="Search by name, email, or phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-gray-500 placeholder:text-slate-400"
              />
            </div>
            
            <div>
              <Dropdown
                label="Customer Status"
                id="statusFilter"
                value={statusFilter}
                options={[
                  { value: 'all', label: 'All Status' },
                  { value: 'active', label: 'Active' },
                  { value: 'inactive', label: 'Inactive' },
                  { value: 'suspended', label: 'Suspended' },
                  { value: 'pending', label: 'Pending' }
                ]}
                onChange={(value) => setStatusFilter(value as string)}
                placeholder="Select status"
              />
            </div>
            
            <div>
              <Dropdown
                label="Loyalty Tier"
                id="loyaltyFilter"
                value={loyaltyFilter}
                options={[
                  { value: 'all', label: 'All Tiers' },
                  { value: 'Bronze', label: 'Bronze' },
                  { value: 'Silver', label: 'Silver' },
                  { value: 'Gold', label: 'Gold' },
                  { value: 'Platinum', label: 'Platinum' }
                ]}
                onChange={(value) => setLoyaltyFilter(value as string)}
                placeholder="Select loyalty tier"
              />
            </div>
          </div>
        </CardContent>
      </Card>
      {/* Customers Table */}
      <Card>
        <CardHeader>
          <CardTitle>Platform Customers</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Loyalty Tier</TableHead>
                <TableHead>Orders & Spending</TableHead>
                <TableHead>Rating</TableHead>
                <TableHead>Last Login</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCustomers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12">
                    <div className="text-gray-500">
                      <p className="text-lg font-medium">No customers found</p>
                      <p className="text-sm">Try adjusting your search or filter criteria</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredCustomers.map((customer) => (
                  <TableRow key={customer.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                          {customer.avatar ? (
                            <img
                              src={customer.avatar}
                              alt={`${customer.firstName} ${customer.lastName}`}
                              className="w-full h-full object-cover rounded-full"
                            />
                          ) : (
                            <span className="text-sm font-medium text-gray-600">
                              {customer.firstName.charAt(0)}{customer.lastName.charAt(0)}
                            </span>
                          )}
                        </div>
                        <div>
                          <div className="font-medium">{customer.firstName} {customer.lastName}</div>
                          <div className="text-sm text-gray-500">ID: {customer.id}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center gap-1 text-sm">
                          <Mail className="h-3 w-3 text-gray-400" />
                          <span className={customer.isEmailVerified ? 'text-green-600' : 'text-gray-600'}>
                            {customer.email}
                          </span>
                          {customer.isEmailVerified && <ShieldCheck className="h-3 w-3 text-green-500" />}
                        </div>
                        <div className="flex items-center gap-1 text-sm">
                          <Phone className="h-3 w-3 text-gray-400" />
                          <span className={customer.isPhoneVerified ? 'text-green-600' : 'text-gray-600'}>
                            {customer.phone}
                          </span>
                          {customer.isPhoneVerified && <ShieldCheck className="h-3 w-3 text-green-500" />}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(customer.status)}</TableCell>
                    <TableCell>{getLoyaltyBadge(customer.loyaltyTier)}</TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div className="font-medium">{customer.totalOrders} orders</div>
                        <div className="text-gray-500">${customer.totalSpent.toFixed(2)}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {customer.averageRating ? (
                        <div className="flex items-center gap-1">
                          <div className="flex">
                            {renderStars(customer.averageRating)}
                          </div>
                          <span className="text-sm text-gray-600">
                            {customer.averageRating.toFixed(1)} ({customer.reviewsCount})
                          </span>
                        </div>
                      ) : (
                        <span className="text-gray-400 text-sm">No reviews</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-gray-600">
                        {new Date(customer.lastLogin).toLocaleDateString()}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="hover:bg-gray-100"
                          title="View Customer Details"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="hover:bg-gray-100"
                          title="Edit Customer"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        {customer.status === 'active' ? (
                          <Button 
                            variant="ghost" 
                            size="sm"
                            className="hover:bg-yellow-100 text-yellow-600"
                            title="Suspend Customer"
                            onClick={() => handleStatusChange(customer.id, 'suspended')}
                          >
                            <UserX className="h-4 w-4" />
                          </Button>
                        ) : customer.status === 'suspended' ? (
                          <Button 
                            variant="ghost" 
                            size="sm"
                            className="hover:bg-green-100 text-green-600"
                            title="Activate Customer"
                            onClick={() => handleStatusChange(customer.id, 'active')}
                          >
                            <UserCheck className="h-4 w-4" />
                          </Button>
                        ) : (
                          <Button 
                            variant="ghost" 
                            size="sm"
                            className="hover:bg-red-100 text-red-600"
                            title="Delete Customer"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}