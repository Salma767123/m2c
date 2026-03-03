import React, { useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { 
  ArrowLeft, 
  Factory, 
  MapPin, 
  Calendar,
  Clock,
  Phone,
  Mail,
  TrendingUp,
  BarChart3,
  CheckCircle,
  Play,
  Package
} from 'lucide-react-native';

export type MobileVendor = {
  id: string;
  name: string;
  location: string;
  category: string;
  openPos: number;
  status: 'active' | 'pending' | 'review';
  recentPO?: string;
  performance?: {
    totalInspections: number;
    passRate: number;
    averageScore: number;
    onTimeDelivery: number;
  };
  contactPerson?: {
    name: string;
    designation: string;
    phone: string;
    email: string;
  };
  factory?: {
    name: string;
    address: string;
    workingHours: string;
  };
};

type VendorDetailProps = {
  vendor: MobileVendor;
  onBack: () => void;
  onStartInspection: (vendor: MobileVendor) => void;
};

export function VendorDetail({ vendor, onBack, onStartInspection }: VendorDetailProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'history' | 'upcoming' | 'performance'>('overview');

  // Mock detailed vendor data
  const vendorDetails = {
    ...vendor,
    fullName: vendor.name,
    establishedYear: "1995",
    certifications: ["ISO 9001:2015", "OEKO-TEX Standard 100", "GOTS Certified"],
    specialization: "Premium Cotton Textiles & Sustainable Fabrics",
    capacity: "50,000 units/month",
    recentPO: vendor.recentPO || "PO-2024-001",
    performance: vendor.performance || {
      totalInspections: 45,
      passRate: 92,
      averageScore: 8.5,
      onTimeDelivery: 88
    },
    contactPerson: vendor.contactPerson || {
      name: "John Smith",
      designation: "Quality Manager",
      phone: "+91 98765 43210",
      email: "john.smith@vendor.com"
    },
    factory: vendor.factory || {
      name: "Main Production Unit",
      address: "Industrial Area, Bangalore, Karnataka 560001",
      workingHours: "8:00 AM - 6:00 PM"
    },
    recentOrders: [
      {
        id: 1,
        po: "PO-2024-001",
        items: "Cotton T-Shirts",
        quantity: 5000,
        status: "completed",
        date: "2024-01-08",
        result: "passed"
      },
      {
        id: 2,
        po: "PO-2023-089",
        items: "Denim Jeans",
        quantity: 3000,
        status: "completed",
        date: "2023-12-15",
        result: "passed"
      },
      {
        id: 3,
        po: "PO-2023-078",
        items: "Polo Shirts",
        quantity: 2500,
        status: "completed",
        date: "2023-11-20",
        result: "failed"
      }
    ],
    upcomingInspections: [
      {
        id: 1,
        po: "PO-2024-006",
        scheduledDate: "2024-01-15",
        scheduledTime: "09:00 AM",
        items: "Premium Cotton T-Shirts",
        priority: "high"
      },
      {
        id: 2,
        po: "PO-2024-012",
        scheduledDate: "2024-01-20",
        scheduledTime: "02:00 PM",
        items: "Organic Cotton Hoodies",
        priority: "medium"
      }
    ]
  };

  const getStatusColor = (status: string) => {
    const colors = {
      active: "bg-emerald-100 text-emerald-800 border-emerald-200",
      pending: "bg-amber-100 text-amber-800 border-amber-200",
      review: "bg-blue-100 text-blue-800 border-blue-200",
      completed: "bg-gray-100 text-gray-800 border-gray-200",
      passed: "bg-emerald-100 text-emerald-800 border-emerald-200",
      failed: "bg-red-100 text-red-800 border-red-200"
    };
    return colors[status as keyof typeof colors] || colors.active;
  };

  const getPriorityColor = (priority: string) => {
    const colors = {
      high: "bg-red-100 text-red-800 border-red-200",
      medium: "bg-amber-100 text-amber-800 border-amber-200",
      low: "bg-emerald-100 text-emerald-800 border-emerald-200"
    };
    return colors[priority as keyof typeof colors] || colors.medium;
  };

  const tabs = [
    { id: 'overview' as const, label: 'Overview' },
    { id: 'history' as const, label: 'History' },
    { id: 'upcoming' as const, label: 'Upcoming' },
    { id: 'performance' as const, label: 'Performance' }
  ];

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-white border-b border-gray-200 px-4 py-4">
        <View className="flex-row items-center justify-between mb-3">
          <View className="flex-row items-center flex-1">
            <TouchableOpacity onPress={onBack} className="mr-3 rounded-full bg-gray-100 p-2">
              <ArrowLeft size={20} color="#374151" />
            </TouchableOpacity>
            <View className="flex-1">
              <Text className="text-lg font-bold text-gray-900">Vendor Details</Text>
              <Text className="text-xs text-gray-500">Comprehensive information</Text>
            </View>
          </View>
          <View className={`px-3 py-1 rounded-full border ${getStatusColor(vendor.status)}`}>
            <Text className="text-xs font-bold">{vendor.status.toUpperCase()}</Text>
          </View>
        </View>
        
        <TouchableOpacity
          onPress={() => onStartInspection(vendor)}
          className="flex-row items-center justify-center gap-2 bg-gray-900 rounded-xl py-3 shadow-sm"
        >
          <Play size={16} color="#ffffff" />
          <Text className="text-sm font-bold text-white">Start New Inspection</Text>
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 24 }}>
        {/* Vendor Summary Card */}
        <View className="bg-gray-900 mx-4 mt-4 rounded-2xl p-4 shadow-sm">
          <View className="flex-row flex-wrap">
            <View className="w-1/2 mb-3">
              <View className="flex-row items-center gap-2">
                <View className="bg-white/20 rounded-lg p-1.5">
                  <Factory size={16} color="#ffffff" />
                </View>
                <View className="flex-1">
                  <Text className="text-blue-100 text-[10px]">Vendor</Text>
                  <Text className="text-white font-semibold text-xs" numberOfLines={1}>{vendorDetails.fullName}</Text>
                </View>
              </View>
            </View>
            
            <View className="w-1/2 mb-3">
              <View className="flex-row items-center gap-2">
                <View className="bg-white/20 rounded-lg p-1.5">
                  <MapPin size={16} color="#ffffff" />
                </View>
                <View className="flex-1">
                  <Text className="text-blue-100 text-[10px]">Location</Text>
                  <Text className="text-white font-semibold text-xs" numberOfLines={1}>{vendor.location}</Text>
                </View>
              </View>
            </View>
            
            <View className="w-1/2">
              <View className="flex-row items-center gap-2">
                <View className="bg-white/20 rounded-lg p-1.5">
                  <Calendar size={16} color="#ffffff" />
                </View>
                <View className="flex-1">
                  <Text className="text-blue-100 text-[10px]">Recent PO</Text>
                  <Text className="text-white font-semibold text-xs">{vendorDetails.recentPO}</Text>
                </View>
              </View>
            </View>
            
            <View className="w-1/2">
              <View className="flex-row items-center gap-2">
                <View className="bg-white/20 rounded-lg p-1.5">
                  <TrendingUp size={16} color="#ffffff" />
                </View>
                <View className="flex-1">
                  <Text className="text-blue-100 text-[10px]">Pass Rate</Text>
                  <Text className="text-white font-semibold text-xs">{vendorDetails.performance.passRate}%</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Tabs */}
        <View className="mx-4 mt-4">
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="border-b border-gray-200">
            {tabs.map((tab) => (
              <TouchableOpacity
                key={tab.id}
                onPress={() => setActiveTab(tab.id)}
                className={`px-4 py-3 border-b-2 ${
                  activeTab === tab.id
                    ? 'border-gray-900'
                    : 'border-transparent'
                }`}
              >
                <Text className={`text-sm font-semibold ${
                  activeTab === tab.id ? 'text-white bg-gray-900 p-2 rounded-t-md' : 'text-gray-500'
                }`}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Tab Content */}
        <View className="mx-4 mt-4">
          {activeTab === 'overview' && (
            <View>
              {/* Company Information */}
              <View className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-4">
                <Text className="text-base font-bold text-gray-900 mb-4">Company Information</Text>
                <View className="space-y-3">
                  <View className="mb-3">
                    <Text className="text-xs font-semibold text-gray-600 mb-1">Company Name</Text>
                    <Text className="text-sm text-gray-900 font-semibold">{vendorDetails.fullName}</Text>
                  </View>
                  <View className="mb-3">
                    <Text className="text-xs font-semibold text-gray-600 mb-1">Established</Text>
                    <Text className="text-sm text-gray-900">{vendorDetails.establishedYear}</Text>
                  </View>
                  <View className="mb-3">
                    <Text className="text-xs font-semibold text-gray-600 mb-1">Specialization</Text>
                    <Text className="text-sm text-gray-900">{vendorDetails.specialization}</Text>
                  </View>
                  <View className="mb-3">
                    <Text className="text-xs font-semibold text-gray-600 mb-1">Production Capacity</Text>
                    <Text className="text-sm text-gray-900 font-semibold">{vendorDetails.capacity}</Text>
                  </View>
                  <View>
                    <Text className="text-xs font-semibold text-gray-600 mb-2">Certifications</Text>
                    <View className="flex-row flex-wrap gap-2">
                      {vendorDetails.certifications.map((cert, index) => (
                        <View key={index} className="bg-emerald-100 border border-emerald-200 px-2 py-1 rounded-full">
                          <Text className="text-[10px] text-emerald-800 font-semibold">{cert}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                </View>
              </View>

              {/* Contact Information */}
              <View className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
                <Text className="text-base font-bold text-gray-900 mb-4">Contact Information</Text>
                <View className="space-y-3">
                  <View className="mb-3">
                    <Text className="text-xs font-semibold text-gray-600 mb-1">Primary Contact</Text>
                    <Text className="text-sm text-gray-900 font-semibold">{vendorDetails.contactPerson.name}</Text>
                    <Text className="text-xs text-gray-600">{vendorDetails.contactPerson.designation}</Text>
                    <View className="flex-row items-center gap-3 mt-2">
                      <View className="flex-row items-center gap-1">
                        <Phone size={12} color="#6b7280" />
                        <Text className="text-xs text-gray-600">{vendorDetails.contactPerson.phone}</Text>
                      </View>
                    </View>
                    <View className="flex-row items-center gap-1 mt-1">
                      <Mail size={12} color="#6b7280" />
                      <Text className="text-xs text-gray-600">{vendorDetails.contactPerson.email}</Text>
                    </View>
                  </View>
                  
                  <View>
                    <Text className="text-xs font-semibold text-gray-600 mb-1">Factory Details</Text>
                    <Text className="text-sm text-gray-900 font-semibold">{vendorDetails.factory.name}</Text>
                    <Text className="text-xs text-gray-700 mt-1">{vendorDetails.factory.address}</Text>
                    <Text className="text-xs text-gray-600 mt-1">Working Hours: {vendorDetails.factory.workingHours}</Text>
                  </View>
                </View>
              </View>
            </View>
          )}

          {activeTab === 'history' && (
            <View className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
              <Text className="text-base font-bold text-gray-900 mb-4">Recent Inspection History</Text>
              {vendorDetails.recentOrders.map((order) => (
                <View key={order.id} className="border border-gray-200 rounded-xl p-3 mb-3">
                  <View className="flex-row items-center justify-between mb-2">
                    <View className="flex-row items-center gap-2 flex-1">
                      <View className="bg-blue-50 border border-blue-200 px-2 py-1 rounded">
                        <Text className="text-xs font-bold text-blue-600">{order.po}</Text>
                      </View>
                      <Text className="text-sm font-semibold text-gray-900 flex-1" numberOfLines={1}>{order.items}</Text>
                    </View>
                    <View className={`px-2 py-1 rounded-full border ${getStatusColor(order.result)}`}>
                      <Text className="text-[10px] font-bold">{order.result.toUpperCase()}</Text>
                    </View>
                  </View>
                  <View className="flex-row flex-wrap gap-x-4 gap-y-1">
                    <Text className="text-xs text-gray-600">Qty: {order.quantity.toLocaleString()} pcs</Text>
                    <Text className="text-xs text-gray-600">Date: {order.date}</Text>
                    <Text className="text-xs text-gray-600">Status: {order.status}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}

          {activeTab === 'upcoming' && (
            <View className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
              <Text className="text-base font-bold text-gray-900 mb-4">Upcoming Inspections</Text>
              {vendorDetails.upcomingInspections.map((inspection) => (
                <View key={inspection.id} className="border border-gray-200 rounded-xl p-3 mb-3">
                  <View className="flex-row items-center justify-between mb-2">
                    <View className="flex-row items-center gap-2 flex-1">
                      <View className="bg-blue-50 border border-blue-200 px-2 py-1 rounded">
                        <Text className="text-xs font-bold text-blue-600">{inspection.po}</Text>
                      </View>
                      <Text className="text-sm font-semibold text-gray-900 flex-1" numberOfLines={1}>{inspection.items}</Text>
                    </View>
                    <View className={`px-2 py-1 rounded-full border ${getPriorityColor(inspection.priority)}`}>
                      <Text className="text-[10px] font-bold">{inspection.priority.toUpperCase()}</Text>
                    </View>
                  </View>
                  <View className="flex-row items-center gap-4">
                    <View className="flex-row items-center gap-1">
                      <Calendar size={12} color="#6b7280" />
                      <Text className="text-xs text-gray-600">{inspection.scheduledDate}</Text>
                    </View>
                    <View className="flex-row items-center gap-1">
                      <Clock size={12} color="#6b7280" />
                      <Text className="text-xs text-gray-600">{inspection.scheduledTime}</Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}

          {activeTab === 'performance' && (
            <View className="flex-row flex-wrap -mx-1.5">
              <View className="w-1/2 px-1.5 mb-3">
                <View className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 items-center">
                  <View className="bg-blue-100 rounded-xl p-3 mb-2">
                    <BarChart3 size={24} color="#2563eb" />
                  </View>
                  <Text className="text-2xl font-bold text-gray-900">{vendorDetails.performance.totalInspections}</Text>
                  <Text className="text-xs text-gray-600 text-center">Total Inspections</Text>
                </View>
              </View>
              
              <View className="w-1/2 px-1.5 mb-3">
                <View className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 items-center">
                  <View className="bg-emerald-100 rounded-xl p-3 mb-2">
                    <CheckCircle size={24} color="#059669" />
                  </View>
                  <Text className="text-2xl font-bold text-gray-900">{vendorDetails.performance.passRate}%</Text>
                  <Text className="text-xs text-gray-600 text-center">Pass Rate</Text>
                </View>
              </View>
              
              <View className="w-1/2 px-1.5 mb-3">
                <View className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 items-center">
                  <View className="bg-amber-100 rounded-xl p-3 mb-2">
                    <TrendingUp size={24} color="#d97706" />
                  </View>
                  <Text className="text-2xl font-bold text-gray-900">{vendorDetails.performance.averageScore}/10</Text>
                  <Text className="text-xs text-gray-600 text-center">Average Score</Text>
                </View>
              </View>
              
              <View className="w-1/2 px-1.5 mb-3">
                <View className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 items-center">
                  <View className="bg-purple-100 rounded-xl p-3 mb-2">
                    <Package size={24} color="#9333ea" />
                  </View>
                  <Text className="text-2xl font-bold text-gray-900">{vendorDetails.performance.onTimeDelivery}%</Text>
                  <Text className="text-xs text-gray-600 text-center">On-Time Delivery</Text>
                </View>
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

