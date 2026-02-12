"use client";

import { useState } from "react";
import { User, Mail, Phone, MapPin, Building2, Shield, Save, Camera, Globe, Users, FileText, CreditCard, Upload, Image as ImageIcon, DollarSign, Key } from "lucide-react";
import { Card, CardContent } from "../../UI/Card";
import { Breadcrumb } from "../Breadcrumb/Breadcrumb";
import { showSuccessToast, showErrorToast } from "@/lib/toast-utils";

type UserRole = "super_admin" | "admin" | "employee";

interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  department: string;
  avatar: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
}

export default function Settings() {
  // Simulate getting current user role - replace with actual auth
  const [currentUser] = useState<UserProfile>({
    id: "1",
    name: "John Admin",
    email: "john.admin@company.com",
    phone: "+1 234-567-8900",
    role: "super_admin", // Change to "admin" or "employee" to test different views
    department: "Administration",
    avatar: "",
    address: "123 Admin Street",
    city: "New York",
    state: "NY",
    zipCode: "10001",
  });

  const [activeTab, setActiveTab] = useState<"profile" | "company" | "payment" | "admin">("profile");

  // Profile form state
  const [profileData, setProfileData] = useState({
    name: currentUser.name,
    email: currentUser.email,
    phone: currentUser.phone,
    department: currentUser.department,
    address: currentUser.address,
    city: currentUser.city,
    state: currentUser.state,
    zipCode: currentUser.zipCode,
  });

  // Admin settings state (only for super_admin and admin)
  const [adminSettings, setAdminSettings] = useState({
    platformName: "M2C Marketplace",
    platformEmail: "support@m2c.com",
    platformPhone: "+1 800-123-4567",
    allowVendorRegistration: true,
    requireProductApproval: true,
    enableNotifications: true,
    maintenanceMode: false,
  });

  // Company info state (only for super_admin and admin)
  const [companyInfo, setCompanyInfo] = useState({
    companyName: "M2C Marketplace Pvt Ltd",
    companyLogo: "",
    gstNumber: "29ABCDE1234F1Z5",
    panNumber: "ABCDE1234F",
    cinNumber: "U74999KA2020PTC123456",
    businessRegistrationNumber: "BRN123456789",
    taxId: "TAX123456",
    companyEmail: "info@m2c.com",
    companyPhone: "+91 80-1234-5678",
    companyWebsite: "https://www.m2c.com",
    registeredAddress: "123 Business Park, Tech City",
    city: "Bangalore",
    state: "Karnataka",
    country: "India",
    zipCode: "560001",
    bankName: "HDFC Bank",
    bankAccountNumber: "1234567890",
    bankIfscCode: "HDFC0001234",
    bankBranch: "MG Road Branch",
  });

  // Razorpay settings state (only for super_admin)
  const [razorpaySettings, setRazorpaySettings] = useState({
    enabled: true,
    keyId: "rzp_test_1234567890",
    keySecret: "••••••••••••••••••••",
    webhookSecret: "••••••••••••••••••••",
    accountId: "acc_1234567890",
    testMode: true,
    autoCapture: true,
    paymentMethods: {
      card: true,
      netbanking: true,
      upi: true,
      wallet: true,
      emi: false,
    },
  });

  // Stripe settings state (only for super_admin)
  const [stripeSettings, setStripeSettings] = useState({
    enabled: false,
    publishableKey: "pk_test_1234567890",
    secretKey: "••••••••••••••••••••",
    webhookSecret: "••••••••••••••••••••",
    testMode: true,
    autoCapture: true,
    paymentMethods: {
      card: true,
      applePay: false,
      googlePay: false,
      link: false,
      cashApp: false,
    },
  });

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 500));
      showSuccessToast("Profile Updated", "Your profile has been updated successfully.");
    } catch (error) {
      showErrorToast("Update Failed", "Failed to update profile. Please try again.");
    }
  };

  const handleAdminSettingsUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 500));
      showSuccessToast("Settings Updated", "Admin settings have been updated successfully.");
    } catch (error) {
      showErrorToast("Update Failed", "Failed to update settings. Please try again.");
    }
  };

  const handleCompanyInfoUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 500));
      showSuccessToast("Company Info Updated", "Company information has been updated successfully.");
    } catch (error) {
      showErrorToast("Update Failed", "Failed to update company information. Please try again.");
    }
  };

  const handleRazorpaySettingsUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 500));
      showSuccessToast("Razorpay Settings Updated", "Payment gateway settings have been updated successfully.");
    } catch (error) {
      showErrorToast("Update Failed", "Failed to update Razorpay settings. Please try again.");
    }
  };

  const handleStripeSettingsUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 500));
      showSuccessToast("Stripe Settings Updated", "Stripe payment gateway settings have been updated successfully.");
    } catch (error) {
      showErrorToast("Update Failed", "Failed to update Stripe settings. Please try again.");
    }
  };

  const canAccessAdminSettings = currentUser.role === "super_admin" || currentUser.role === "admin";
  const isReadOnly = currentUser.role === "employee";

  return (
    <div className="p-6">
      <Breadcrumb />

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600 mt-1">Manage your profile and system settings</p>
      </div>

      {/* Tabs */}
      <div className="mb-6 border-b border-gray-200">
        <div className="flex gap-4">
          <button
            onClick={() => setActiveTab("profile")}
            className={`pb-3 px-1 font-medium text-sm border-b-2 transition-colors ${
              activeTab === "profile"
                ? "border-gray-900 text-gray-900"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            <User className="h-4 w-4 inline mr-2" />
            Profile Settings
          </button>
          {canAccessAdminSettings && (
            <>
              <button
                onClick={() => setActiveTab("company")}
                className={`pb-3 px-1 font-medium text-sm border-b-2 transition-colors ${
                  activeTab === "company"
                    ? "border-gray-900 text-gray-900"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                <Building2 className="h-4 w-4 inline mr-2" />
                Company Info
              </button>
              <button
                onClick={() => setActiveTab("payment")}
                className={`pb-3 px-1 font-medium text-sm border-b-2 transition-colors ${
                  activeTab === "payment"
                    ? "border-gray-900 text-gray-900"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                <DollarSign className="h-4 w-4 inline mr-2" />
                Payment Settings
              </button>
              <button
                onClick={() => setActiveTab("admin")}
                className={`pb-3 px-1 font-medium text-sm border-b-2 transition-colors ${
                  activeTab === "admin"
                    ? "border-gray-900 text-gray-900"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                <Shield className="h-4 w-4 inline mr-2" />
                Admin Settings
              </button>
            </>
          )}
        </div>
      </div>

      {/* Profile Tab */}
      {activeTab === "profile" && (
        <div className="space-y-6">
          {/* Role Badge */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center">
                    {currentUser.avatar ? (
                      <img src={currentUser.avatar} alt="Avatar" className="w-full h-full rounded-full object-cover" />
                    ) : (
                      <User className="h-10 w-10 text-gray-400" />
                    )}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">{currentUser.name}</h2>
                    <p className="text-gray-600">{currentUser.email}</p>
                    <div className="mt-2">
                      <span
                        className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                          currentUser.role === "super_admin"
                            ? "bg-purple-100 text-purple-800"
                            : currentUser.role === "admin"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-green-100 text-green-800"
                        }`}
                      >
                        <Shield className="h-3 w-3 mr-1" />
                        {currentUser.role === "super_admin"
                          ? "Super Admin"
                          : currentUser.role === "admin"
                          ? "Admin"
                          : "Employee"}
                      </span>
                    </div>
                  </div>
                </div>
                {!isReadOnly && (
                  <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
                    <Camera className="h-4 w-4" />
                    Change Photo
                  </button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Personal Information */}
          <Card>
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Personal Information</h3>
              <form onSubmit={handleProfileUpdate}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Full Name <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type="text"
                        value={profileData.name}
                        onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                        disabled={isReadOnly}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent disabled:bg-gray-100"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email Address <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type="email"
                        value={profileData.email}
                        onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                        disabled={isReadOnly}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent disabled:bg-gray-100"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Phone Number <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type="tel"
                        value={profileData.phone}
                        onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                        disabled={isReadOnly}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent disabled:bg-gray-100"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Department</label>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type="text"
                        value={profileData.department}
                        onChange={(e) => setProfileData({ ...profileData, department: e.target.value })}
                        disabled={isReadOnly}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent disabled:bg-gray-100"
                      />
                    </div>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <input
                        type="text"
                        value={profileData.address}
                        onChange={(e) => setProfileData({ ...profileData, address: e.target.value })}
                        disabled={isReadOnly}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent disabled:bg-gray-100"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">City</label>
                    <input
                      type="text"
                      value={profileData.city}
                      onChange={(e) => setProfileData({ ...profileData, city: e.target.value })}
                      disabled={isReadOnly}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent disabled:bg-gray-100"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">State</label>
                    <input
                      type="text"
                      value={profileData.state}
                      onChange={(e) => setProfileData({ ...profileData, state: e.target.value })}
                      disabled={isReadOnly}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent disabled:bg-gray-100"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">ZIP Code</label>
                    <input
                      type="text"
                      value={profileData.zipCode}
                      onChange={(e) => setProfileData({ ...profileData, zipCode: e.target.value })}
                      disabled={isReadOnly}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent disabled:bg-gray-100"
                    />
                  </div>
                </div>

                {!isReadOnly && (
                  <div className="mt-6">
                    <button
                      type="submit"
                      className="flex items-center gap-2 bg-gray-900 hover:bg-gray-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors"
                    >
                      <Save className="h-4 w-4" />
                      Save Changes
                    </button>
                  </div>
                )}
              </form>
            </CardContent>
          </Card>

          {isReadOnly && (
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                <strong>Note:</strong> As an employee, you have read-only access to your profile. Contact your administrator to make changes.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Company Info Tab */}
      {activeTab === "company" && canAccessAdminSettings && (
        <div className="space-y-6">
          {/* Company Logo */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <ImageIcon className="w-5 h-5 text-blue-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Company Logo</h3>
              </div>
              <div className="flex items-center gap-6">
                <div className="w-32 h-32 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-gray-50">
                  {companyInfo.companyLogo ? (
                    <img src={companyInfo.companyLogo} alt="Company Logo" className="w-full h-full object-contain rounded-lg" />
                  ) : (
                    <div className="text-center">
                      <ImageIcon className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                      <p className="text-xs text-gray-500">No logo</p>
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-3">Upload your company logo. Recommended size: 512x512px</p>
                  <button
                    disabled={currentUser.role !== "super_admin"}
                    className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Upload className="h-4 w-4" />
                    Upload Logo
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Basic Company Information */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Building2 className="w-5 h-5 text-green-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Basic Information</h3>
              </div>
              <form onSubmit={handleCompanyInfoUpdate}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Company Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={companyInfo.companyName}
                      onChange={(e) => setCompanyInfo({ ...companyInfo, companyName: e.target.value })}
                      disabled={currentUser.role !== "super_admin"}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent disabled:bg-gray-100"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Company Email</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type="email"
                        value={companyInfo.companyEmail}
                        onChange={(e) => setCompanyInfo({ ...companyInfo, companyEmail: e.target.value })}
                        disabled={currentUser.role !== "super_admin"}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent disabled:bg-gray-100"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Company Phone</label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type="tel"
                        value={companyInfo.companyPhone}
                        onChange={(e) => setCompanyInfo({ ...companyInfo, companyPhone: e.target.value })}
                        disabled={currentUser.role !== "super_admin"}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent disabled:bg-gray-100"
                      />
                    </div>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Company Website</label>
                    <input
                      type="url"
                      value={companyInfo.companyWebsite}
                      onChange={(e) => setCompanyInfo({ ...companyInfo, companyWebsite: e.target.value })}
                      disabled={currentUser.role !== "super_admin"}
                      placeholder="https://www.example.com"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent disabled:bg-gray-100"
                    />
                  </div>
                </div>

                {currentUser.role === "super_admin" && (
                  <div className="mt-6">
                    <button
                      type="submit"
                      className="flex items-center gap-2 bg-gray-900 hover:bg-gray-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors"
                    >
                      <Save className="h-4 w-4" />
                      Save Basic Information
                    </button>
                  </div>
                )}
              </form>
            </CardContent>
          </Card>

          {/* Legal & Tax Information */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <FileText className="w-5 h-5 text-purple-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Legal & Tax Information</h3>
              </div>
              <form onSubmit={handleCompanyInfoUpdate}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      GST Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={companyInfo.gstNumber}
                      onChange={(e) => setCompanyInfo({ ...companyInfo, gstNumber: e.target.value })}
                      disabled={currentUser.role !== "super_admin"}
                      placeholder="29ABCDE1234F1Z5"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent disabled:bg-gray-100"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      PAN Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={companyInfo.panNumber}
                      onChange={(e) => setCompanyInfo({ ...companyInfo, panNumber: e.target.value })}
                      disabled={currentUser.role !== "super_admin"}
                      placeholder="ABCDE1234F"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent disabled:bg-gray-100"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">CIN Number</label>
                    <input
                      type="text"
                      value={companyInfo.cinNumber}
                      onChange={(e) => setCompanyInfo({ ...companyInfo, cinNumber: e.target.value })}
                      disabled={currentUser.role !== "super_admin"}
                      placeholder="U74999KA2020PTC123456"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent disabled:bg-gray-100"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Business Registration Number</label>
                    <input
                      type="text"
                      value={companyInfo.businessRegistrationNumber}
                      onChange={(e) => setCompanyInfo({ ...companyInfo, businessRegistrationNumber: e.target.value })}
                      disabled={currentUser.role !== "super_admin"}
                      placeholder="BRN123456789"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent disabled:bg-gray-100"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Tax ID</label>
                    <input
                      type="text"
                      value={companyInfo.taxId}
                      onChange={(e) => setCompanyInfo({ ...companyInfo, taxId: e.target.value })}
                      disabled={currentUser.role !== "super_admin"}
                      placeholder="TAX123456"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent disabled:bg-gray-100"
                    />
                  </div>
                </div>

                {currentUser.role === "super_admin" && (
                  <div className="mt-6">
                    <button
                      type="submit"
                      className="flex items-center gap-2 bg-gray-900 hover:bg-gray-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors"
                    >
                      <Save className="h-4 w-4" />
                      Save Legal Information
                    </button>
                  </div>
                )}
              </form>
            </CardContent>
          </Card>

          {/* Registered Address */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <MapPin className="w-5 h-5 text-orange-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Registered Address</h3>
              </div>
              <form onSubmit={handleCompanyInfoUpdate}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Street Address <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={companyInfo.registeredAddress}
                      onChange={(e) => setCompanyInfo({ ...companyInfo, registeredAddress: e.target.value })}
                      disabled={currentUser.role !== "super_admin"}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent disabled:bg-gray-100"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">City</label>
                    <input
                      type="text"
                      value={companyInfo.city}
                      onChange={(e) => setCompanyInfo({ ...companyInfo, city: e.target.value })}
                      disabled={currentUser.role !== "super_admin"}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent disabled:bg-gray-100"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">State</label>
                    <input
                      type="text"
                      value={companyInfo.state}
                      onChange={(e) => setCompanyInfo({ ...companyInfo, state: e.target.value })}
                      disabled={currentUser.role !== "super_admin"}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent disabled:bg-gray-100"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Country</label>
                    <input
                      type="text"
                      value={companyInfo.country}
                      onChange={(e) => setCompanyInfo({ ...companyInfo, country: e.target.value })}
                      disabled={currentUser.role !== "super_admin"}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent disabled:bg-gray-100"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">ZIP Code</label>
                    <input
                      type="text"
                      value={companyInfo.zipCode}
                      onChange={(e) => setCompanyInfo({ ...companyInfo, zipCode: e.target.value })}
                      disabled={currentUser.role !== "super_admin"}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent disabled:bg-gray-100"
                    />
                  </div>
                </div>

                {currentUser.role === "super_admin" && (
                  <div className="mt-6">
                    <button
                      type="submit"
                      className="flex items-center gap-2 bg-gray-900 hover:bg-gray-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors"
                    >
                      <Save className="h-4 w-4" />
                      Save Address
                    </button>
                  </div>
                )}
              </form>
            </CardContent>
          </Card>

          {/* Bank Details */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-indigo-100 rounded-lg">
                  <CreditCard className="w-5 h-5 text-indigo-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Bank Details</h3>
              </div>
              <form onSubmit={handleCompanyInfoUpdate}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Bank Name</label>
                    <input
                      type="text"
                      value={companyInfo.bankName}
                      onChange={(e) => setCompanyInfo({ ...companyInfo, bankName: e.target.value })}
                      disabled={currentUser.role !== "super_admin"}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent disabled:bg-gray-100"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Account Number</label>
                    <input
                      type="text"
                      value={companyInfo.bankAccountNumber}
                      onChange={(e) => setCompanyInfo({ ...companyInfo, bankAccountNumber: e.target.value })}
                      disabled={currentUser.role !== "super_admin"}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent disabled:bg-gray-100"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">IFSC Code</label>
                    <input
                      type="text"
                      value={companyInfo.bankIfscCode}
                      onChange={(e) => setCompanyInfo({ ...companyInfo, bankIfscCode: e.target.value })}
                      disabled={currentUser.role !== "super_admin"}
                      placeholder="HDFC0001234"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent disabled:bg-gray-100"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Branch</label>
                    <input
                      type="text"
                      value={companyInfo.bankBranch}
                      onChange={(e) => setCompanyInfo({ ...companyInfo, bankBranch: e.target.value })}
                      disabled={currentUser.role !== "super_admin"}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent disabled:bg-gray-100"
                    />
                  </div>
                </div>

                {currentUser.role === "super_admin" && (
                  <div className="mt-6">
                    <button
                      type="submit"
                      className="flex items-center gap-2 bg-gray-900 hover:bg-gray-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors"
                    >
                      <Save className="h-4 w-4" />
                      Save Bank Details
                    </button>
                  </div>
                )}
              </form>
            </CardContent>
          </Card>

          {currentUser.role === "admin" && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Note:</strong> Company information can only be edited by Super Admin. Contact your Super Admin to make changes.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Payment Settings Tab */}
      {activeTab === "payment" && canAccessAdminSettings && (
        <div className="space-y-6">
          {/* Razorpay Payment Gateway */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <DollarSign className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900">Razorpay Payment Gateway</h3>
                    <p className="text-sm text-gray-600 mt-1">Configure payment settings for customer transactions</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">Status:</span>
                  <span
                    className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium ${
                      razorpaySettings.enabled
                        ? "bg-green-100 text-green-800"
                        : "bg-red-100 text-red-800"
                    }`}
                  >
                    {razorpaySettings.enabled ? "● Active" : "● Inactive"}
                  </span>
                </div>
              </div>

              <form onSubmit={handleRazorpaySettingsUpdate}>
                {/* Enable/Disable Toggle */}
                <div className="mb-6 p-4 border border-gray-200 rounded-lg bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">Enable Razorpay Payments</p>
                      <p className="text-sm text-gray-600">Allow customers to pay using Razorpay gateway</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={razorpaySettings.enabled}
                      onChange={(e) => setRazorpaySettings({ ...razorpaySettings, enabled: e.target.checked })}
                      disabled={currentUser.role !== "super_admin"}
                      className="h-5 w-5 text-blue-600 border-gray-300 rounded focus:ring-blue-600 disabled:opacity-50"
                    />
                  </div>
                </div>

                {/* API Credentials */}
                <div className="space-y-4 mb-6">
                  <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                    <Key className="h-4 w-4" />
                    API Credentials
                  </h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Key ID <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={razorpaySettings.keyId}
                        onChange={(e) => setRazorpaySettings({ ...razorpaySettings, keyId: e.target.value })}
                        disabled={currentUser.role !== "super_admin"}
                        placeholder="rzp_test_1234567890"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent disabled:bg-gray-100 font-mono text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Key Secret <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="password"
                        value={razorpaySettings.keySecret}
                        onChange={(e) => setRazorpaySettings({ ...razorpaySettings, keySecret: e.target.value })}
                        disabled={currentUser.role !== "super_admin"}
                        placeholder="Enter key secret"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent disabled:bg-gray-100 font-mono text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Webhook Secret</label>
                      <input
                        type="password"
                        value={razorpaySettings.webhookSecret}
                        onChange={(e) => setRazorpaySettings({ ...razorpaySettings, webhookSecret: e.target.value })}
                        disabled={currentUser.role !== "super_admin"}
                        placeholder="Enter webhook secret"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent disabled:bg-gray-100 font-mono text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Account ID</label>
                      <input
                        type="text"
                        value={razorpaySettings.accountId}
                        onChange={(e) => setRazorpaySettings({ ...razorpaySettings, accountId: e.target.value })}
                        disabled={currentUser.role !== "super_admin"}
                        placeholder="acc_1234567890"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent disabled:bg-gray-100 font-mono text-sm"
                      />
                    </div>
                  </div>
                </div>

                {/* Payment Settings */}
                <div className="space-y-4 mb-6">
                  <h4 className="font-semibold text-gray-900">Payment Settings</h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900">Test Mode</p>
                        <p className="text-sm text-gray-600">Use test credentials for testing</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={razorpaySettings.testMode}
                        onChange={(e) => setRazorpaySettings({ ...razorpaySettings, testMode: e.target.checked })}
                        disabled={currentUser.role !== "super_admin"}
                        className="h-5 w-5 text-gray-900 border-gray-300 rounded focus:ring-gray-900 disabled:opacity-50"
                      />
                    </div>

                    <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900">Auto Capture</p>
                        <p className="text-sm text-gray-600">Automatically capture payments</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={razorpaySettings.autoCapture}
                        onChange={(e) => setRazorpaySettings({ ...razorpaySettings, autoCapture: e.target.checked })}
                        disabled={currentUser.role !== "super_admin"}
                        className="h-5 w-5 text-gray-900 border-gray-300 rounded focus:ring-gray-900 disabled:opacity-50"
                      />
                    </div>
                  </div>
                </div>

                {/* Payment Methods */}
                <div className="space-y-4">
                  <h4 className="font-semibold text-gray-900">Enabled Payment Methods</h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
                      <div className="flex items-center gap-3">
                        <CreditCard className="h-5 w-5 text-gray-600" />
                        <div>
                          <p className="font-medium text-gray-900 text-sm">Credit/Debit Cards</p>
                          <p className="text-xs text-gray-600">Visa, Mastercard, Amex, Rupay</p>
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={razorpaySettings.paymentMethods.card}
                        onChange={(e) =>
                          setRazorpaySettings({
                            ...razorpaySettings,
                            paymentMethods: { ...razorpaySettings.paymentMethods, card: e.target.checked },
                          })
                        }
                        disabled={currentUser.role !== "super_admin"}
                        className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-600 disabled:opacity-50"
                      />
                    </div>

                    <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
                      <div className="flex items-center gap-3">
                        <Building2 className="h-5 w-5 text-gray-600" />
                        <div>
                          <p className="font-medium text-gray-900 text-sm">Net Banking</p>
                          <p className="text-xs text-gray-600">All major banks</p>
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={razorpaySettings.paymentMethods.netbanking}
                        onChange={(e) =>
                          setRazorpaySettings({
                            ...razorpaySettings,
                            paymentMethods: { ...razorpaySettings.paymentMethods, netbanking: e.target.checked },
                          })
                        }
                        disabled={currentUser.role !== "super_admin"}
                        className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-600 disabled:opacity-50"
                      />
                    </div>

                    <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
                      <div className="flex items-center gap-3">
                        <Phone className="h-5 w-5 text-gray-600" />
                        <div>
                          <p className="font-medium text-gray-900 text-sm">UPI</p>
                          <p className="text-xs text-gray-600">Google Pay, PhonePe, Paytm</p>
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={razorpaySettings.paymentMethods.upi}
                        onChange={(e) =>
                          setRazorpaySettings({
                            ...razorpaySettings,
                            paymentMethods: { ...razorpaySettings.paymentMethods, upi: e.target.checked },
                          })
                        }
                        disabled={currentUser.role !== "super_admin"}
                        className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-600 disabled:opacity-50"
                      />
                    </div>

                    <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
                      <div className="flex items-center gap-3">
                        <DollarSign className="h-5 w-5 text-gray-600" />
                        <div>
                          <p className="font-medium text-gray-900 text-sm">Wallets</p>
                          <p className="text-xs text-gray-600">Paytm, PhonePe, Amazon Pay</p>
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={razorpaySettings.paymentMethods.wallet}
                        onChange={(e) =>
                          setRazorpaySettings({
                            ...razorpaySettings,
                            paymentMethods: { ...razorpaySettings.paymentMethods, wallet: e.target.checked },
                          })
                        }
                        disabled={currentUser.role !== "super_admin"}
                        className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-600 disabled:opacity-50"
                      />
                    </div>

                    <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
                      <div className="flex items-center gap-3">
                        <CreditCard className="h-5 w-5 text-gray-600" />
                        <div>
                          <p className="font-medium text-gray-900 text-sm">EMI</p>
                          <p className="text-xs text-gray-600">Easy monthly installments</p>
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={razorpaySettings.paymentMethods.emi}
                        onChange={(e) =>
                          setRazorpaySettings({
                            ...razorpaySettings,
                            paymentMethods: { ...razorpaySettings.paymentMethods, emi: e.target.checked },
                          })
                        }
                        disabled={currentUser.role !== "super_admin"}
                        className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-600 disabled:opacity-50"
                      />
                    </div>
                  </div>
                </div>

                {currentUser.role === "super_admin" && (
                  <div className="mt-6 flex items-center gap-3">
                    <button
                      type="submit"
                      className="flex items-center gap-2 bg-gray-900 hover:bg-gray-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors"
                    >
                      <Save className="h-4 w-4" />
                      Save Payment Settings
                    </button>
                    <a
                      href="https://dashboard.razorpay.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:text-blue-800 underline"
                    >
                      Open Razorpay Dashboard →
                    </a>
                  </div>
                )}
              </form>

              {razorpaySettings.testMode && (
                <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-sm text-amber-800">
                    <strong>⚠ Test Mode Active:</strong> All transactions will use test credentials. Switch to live mode for production.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Stripe Payment Gateway */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <CreditCard className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900">Stripe Payment Gateway</h3>
                    <p className="text-sm text-gray-600 mt-1">Configure Stripe for international payments</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">Status:</span>
                  <span
                    className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium ${
                      stripeSettings.enabled
                        ? "bg-green-100 text-green-800"
                        : "bg-red-100 text-red-800"
                    }`}
                  >
                    {stripeSettings.enabled ? "● Active" : "● Inactive"}
                  </span>
                </div>
              </div>

              <form onSubmit={handleStripeSettingsUpdate}>
                {/* Enable/Disable Toggle */}
                <div className="mb-6 p-4 border border-gray-200 rounded-lg bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">Enable Stripe Payments</p>
                      <p className="text-sm text-gray-600">Allow customers to pay using Stripe gateway</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={stripeSettings.enabled}
                      onChange={(e) => setStripeSettings({ ...stripeSettings, enabled: e.target.checked })}
                      disabled={currentUser.role !== "super_admin"}
                      className="h-5 w-5 text-purple-600 border-gray-300 rounded focus:ring-purple-600 disabled:opacity-50"
                    />
                  </div>
                </div>

                {/* API Credentials */}
                <div className="space-y-4 mb-6">
                  <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                    <Key className="h-4 w-4" />
                    API Credentials
                  </h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Publishable Key <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={stripeSettings.publishableKey}
                        onChange={(e) => setStripeSettings({ ...stripeSettings, publishableKey: e.target.value })}
                        disabled={currentUser.role !== "super_admin"}
                        placeholder="pk_test_1234567890"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent disabled:bg-gray-100 font-mono text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Secret Key <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="password"
                        value={stripeSettings.secretKey}
                        onChange={(e) => setStripeSettings({ ...stripeSettings, secretKey: e.target.value })}
                        disabled={currentUser.role !== "super_admin"}
                        placeholder="Enter secret key"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent disabled:bg-gray-100 font-mono text-sm"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Webhook Secret</label>
                      <input
                        type="password"
                        value={stripeSettings.webhookSecret}
                        onChange={(e) => setStripeSettings({ ...stripeSettings, webhookSecret: e.target.value })}
                        disabled={currentUser.role !== "super_admin"}
                        placeholder="Enter webhook secret"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent disabled:bg-gray-100 font-mono text-sm"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Configure webhook endpoint: https://your-domain.com/api/webhooks/stripe
                      </p>
                    </div>
                  </div>
                </div>

                {/* Payment Settings */}
                <div className="space-y-4 mb-6">
                  <h4 className="font-semibold text-gray-900">Payment Settings</h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900">Test Mode</p>
                        <p className="text-sm text-gray-600">Use test credentials for testing</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={stripeSettings.testMode}
                        onChange={(e) => setStripeSettings({ ...stripeSettings, testMode: e.target.checked })}
                        disabled={currentUser.role !== "super_admin"}
                        className="h-5 w-5 text-gray-900 border-gray-300 rounded focus:ring-gray-900 disabled:opacity-50"
                      />
                    </div>

                    <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900">Auto Capture</p>
                        <p className="text-sm text-gray-600">Automatically capture payments</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={stripeSettings.autoCapture}
                        onChange={(e) => setStripeSettings({ ...stripeSettings, autoCapture: e.target.checked })}
                        disabled={currentUser.role !== "super_admin"}
                        className="h-5 w-5 text-gray-900 border-gray-300 rounded focus:ring-gray-900 disabled:opacity-50"
                      />
                    </div>
                  </div>
                </div>

                {/* Payment Methods */}
                <div className="space-y-4">
                  <h4 className="font-semibold text-gray-900">Enabled Payment Methods</h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
                      <div className="flex items-center gap-3">
                        <CreditCard className="h-5 w-5 text-gray-600" />
                        <div>
                          <p className="font-medium text-gray-900 text-sm">Credit/Debit Cards</p>
                          <p className="text-xs text-gray-600">Visa, Mastercard, Amex, Discover</p>
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={stripeSettings.paymentMethods.card}
                        onChange={(e) =>
                          setStripeSettings({
                            ...stripeSettings,
                            paymentMethods: { ...stripeSettings.paymentMethods, card: e.target.checked },
                          })
                        }
                        disabled={currentUser.role !== "super_admin"}
                        className="h-4 w-4 text-purple-600 border-gray-300 rounded focus:ring-purple-600 disabled:opacity-50"
                      />
                    </div>

                    <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
                      <div className="flex items-center gap-3">
                        <Phone className="h-5 w-5 text-gray-600" />
                        <div>
                          <p className="font-medium text-gray-900 text-sm">Apple Pay</p>
                          <p className="text-xs text-gray-600">Apple devices</p>
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={stripeSettings.paymentMethods.applePay}
                        onChange={(e) =>
                          setStripeSettings({
                            ...stripeSettings,
                            paymentMethods: { ...stripeSettings.paymentMethods, applePay: e.target.checked },
                          })
                        }
                        disabled={currentUser.role !== "super_admin"}
                        className="h-4 w-4 text-purple-600 border-gray-300 rounded focus:ring-purple-600 disabled:opacity-50"
                      />
                    </div>

                    <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
                      <div className="flex items-center gap-3">
                        <Phone className="h-5 w-5 text-gray-600" />
                        <div>
                          <p className="font-medium text-gray-900 text-sm">Google Pay</p>
                          <p className="text-xs text-gray-600">Android devices</p>
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={stripeSettings.paymentMethods.googlePay}
                        onChange={(e) =>
                          setStripeSettings({
                            ...stripeSettings,
                            paymentMethods: { ...stripeSettings.paymentMethods, googlePay: e.target.checked },
                          })
                        }
                        disabled={currentUser.role !== "super_admin"}
                        className="h-4 w-4 text-purple-600 border-gray-300 rounded focus:ring-purple-600 disabled:opacity-50"
                      />
                    </div>

                    <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
                      <div className="flex items-center gap-3">
                        <Globe className="h-5 w-5 text-gray-600" />
                        <div>
                          <p className="font-medium text-gray-900 text-sm">Link</p>
                          <p className="text-xs text-gray-600">One-click checkout</p>
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={stripeSettings.paymentMethods.link}
                        onChange={(e) =>
                          setStripeSettings({
                            ...stripeSettings,
                            paymentMethods: { ...stripeSettings.paymentMethods, link: e.target.checked },
                          })
                        }
                        disabled={currentUser.role !== "super_admin"}
                        className="h-4 w-4 text-purple-600 border-gray-300 rounded focus:ring-purple-600 disabled:opacity-50"
                      />
                    </div>

                    <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
                      <div className="flex items-center gap-3">
                        <DollarSign className="h-5 w-5 text-gray-600" />
                        <div>
                          <p className="font-medium text-gray-900 text-sm">Cash App Pay</p>
                          <p className="text-xs text-gray-600">Cash App users</p>
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={stripeSettings.paymentMethods.cashApp}
                        onChange={(e) =>
                          setStripeSettings({
                            ...stripeSettings,
                            paymentMethods: { ...stripeSettings.paymentMethods, cashApp: e.target.checked },
                          })
                        }
                        disabled={currentUser.role !== "super_admin"}
                        className="h-4 w-4 text-purple-600 border-gray-300 rounded focus:ring-purple-600 disabled:opacity-50"
                      />
                    </div>
                  </div>
                </div>

                {currentUser.role === "super_admin" && (
                  <div className="mt-6 flex items-center gap-3">
                    <button
                      type="submit"
                      className="flex items-center gap-2 bg-gray-900 hover:bg-gray-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors"
                    >
                      <Save className="h-4 w-4" />
                      Save Stripe Settings
                    </button>
                    <a
                      href="https://dashboard.stripe.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-purple-600 hover:text-purple-800 underline"
                    >
                      Open Stripe Dashboard →
                    </a>
                  </div>
                )}
              </form>

              {stripeSettings.testMode && (
                <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-sm text-amber-800">
                    <strong>⚠ Test Mode Active:</strong> All transactions will use test credentials. Switch to live mode for production.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {currentUser.role === "admin" && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Note:</strong> Payment gateway settings can only be modified by Super Admin. Contact your Super Admin to make changes.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Admin Tab */}
      {activeTab === "admin" && canAccessAdminSettings && (
        <div className="space-y-6">
          {/* Platform Settings */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Globe className="w-5 h-5 text-blue-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Platform Settings</h3>
              </div>
              <form onSubmit={handleAdminSettingsUpdate}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Platform Name</label>
                    <input
                      type="text"
                      value={adminSettings.platformName}
                      onChange={(e) => setAdminSettings({ ...adminSettings, platformName: e.target.value })}
                      disabled={currentUser.role !== "super_admin"}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent disabled:bg-gray-100"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Support Email</label>
                    <input
                      type="email"
                      value={adminSettings.platformEmail}
                      onChange={(e) => setAdminSettings({ ...adminSettings, platformEmail: e.target.value })}
                      disabled={currentUser.role !== "super_admin"}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent disabled:bg-gray-100"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Support Phone</label>
                    <input
                      type="tel"
                      value={adminSettings.platformPhone}
                      onChange={(e) => setAdminSettings({ ...adminSettings, platformPhone: e.target.value })}
                      disabled={currentUser.role !== "super_admin"}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent disabled:bg-gray-100"
                    />
                  </div>
                </div>

                {currentUser.role === "super_admin" && (
                  <div className="mt-6">
                    <button
                      type="submit"
                      className="flex items-center gap-2 bg-gray-900 hover:bg-gray-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors"
                    >
                      <Save className="h-4 w-4" />
                      Save Platform Settings
                    </button>
                  </div>
                )}
              </form>
            </CardContent>
          </Card>

          {/* System Preferences */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Users className="w-5 h-5 text-purple-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">System Preferences</h3>
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">Allow Vendor Registration</p>
                    <p className="text-sm text-gray-600">Enable new vendors to register on the platform</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={adminSettings.allowVendorRegistration}
                    onChange={(e) =>
                      setAdminSettings({ ...adminSettings, allowVendorRegistration: e.target.checked })
                    }
                    disabled={currentUser.role !== "super_admin"}
                    className="h-5 w-5 text-gray-900 border-gray-300 rounded focus:ring-gray-900 disabled:opacity-50"
                  />
                </div>

                <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">Require Product Approval</p>
                    <p className="text-sm text-gray-600">All new products must be approved before listing</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={adminSettings.requireProductApproval}
                    onChange={(e) =>
                      setAdminSettings({ ...adminSettings, requireProductApproval: e.target.checked })
                    }
                    disabled={currentUser.role !== "super_admin"}
                    className="h-5 w-5 text-gray-900 border-gray-300 rounded focus:ring-gray-900 disabled:opacity-50"
                  />
                </div>

                <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">Enable Notifications</p>
                    <p className="text-sm text-gray-600">Send email notifications for important events</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={adminSettings.enableNotifications}
                    onChange={(e) => setAdminSettings({ ...adminSettings, enableNotifications: e.target.checked })}
                    className="h-5 w-5 text-gray-900 border-gray-300 rounded focus:ring-gray-900"
                  />
                </div>

                {currentUser.role === "super_admin" && (
                  <div className="flex items-center justify-between p-4 border border-red-200 bg-red-50 rounded-lg">
                    <div>
                      <p className="font-medium text-red-900">Maintenance Mode</p>
                      <p className="text-sm text-red-700">Temporarily disable the platform for maintenance</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={adminSettings.maintenanceMode}
                      onChange={(e) => setAdminSettings({ ...adminSettings, maintenanceMode: e.target.checked })}
                      className="h-5 w-5 text-red-600 border-red-300 rounded focus:ring-red-600"
                    />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {currentUser.role === "admin" && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Note:</strong> Some settings are restricted to Super Admin only. Contact your Super Admin for full access.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
