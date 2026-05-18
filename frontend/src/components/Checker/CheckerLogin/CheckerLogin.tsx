"use client";

import type React from "react";
import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/UI/Card";
import { Button } from "@/components/UI/Button";
import {
  LogIn,
  Shield,
  CheckCircle,
  AlertCircle,
  Eye,
  EyeOff,
  Lock,
  Award,
  TrendingUp,
  Users,
  ChevronDown,
  ClipboardCheck,
  BarChart3,
  FileCheck,
  Search,
  Target,
} from "lucide-react";
import { qcCheckerService } from "@/services/qcCheckerService";
import { companyInfoService } from '@/services/companyInfoService';

interface LoginPageProps {
  onLogin: (checkerID: string) => void;
}

export default function LoginPage({ onLogin }: LoginPageProps) {
  const [checkerID, setCheckerID] = useState("");
  const [password, setPassword] = useState("");
  const [companyLogo, setCompanyLogo] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [checkerIDError, setCheckerIDError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showInspectionInfo, setShowInspectionInfo] = useState(false);
  const checkerIDInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    companyInfoService.getPublicCompanyInfo().then(info => {
      if (info.companyLogo) setCompanyLogo(info.companyLogo);
    }).catch(() => {});
  }, []);

  // Autofocus checker ID field on mount
  useEffect(() => {
    if (checkerIDInputRef.current) {
      checkerIDInputRef.current.focus();
    }
  }, []);

  // Checker ID validation
  const validateCheckerID = (value: string) => {
    if (!value) {
      setCheckerIDError("");
      return true;
    }
    const checkerIDRegex = /^QC-\d{3}$/;
    if (!checkerIDRegex.test(value.toUpperCase())) {
      setCheckerIDError("Invalid format. Use QC-XXX format (e.g., QC-001)");
      return false;
    }
    setCheckerIDError("");
    return true;
  };

  // Password validation
  const validatePassword = (value: string) => {
    if (!value) {
      setPasswordError("");
      return true;
    }
    if (value.length < 6) {
      setPasswordError("Password must be at least 6 characters");
      return false;
    }
    setPasswordError("");
    return true;
  };

  const handleCheckerIDChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase();
    setCheckerID(value);
    setError("");
    validateCheckerID(value);
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setPassword(value);
    setError("");
    validatePassword(value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!checkerID.trim()) {
      setCheckerIDError("Please enter your Checker ID");
      return;
    }

    if (!password.trim()) {
      setPasswordError("Please enter your password");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const result = await qcCheckerService.login({
        checkerId: checkerID.toUpperCase(),
        password,
      });

      if (result.success && result.data) {
        // Store auth data
        qcCheckerService.storeCheckerAuth(result.data.token, result.data.checker);

        // Register FCM push token (fire-and-forget)
        import('@/services/webNotificationService').then(m => m.registerWebPushToken()).catch(() => {});

        // Call onLogin callback with the checker ID
        onLogin(result.data.checker.checkerId);
      }
    } catch (error: any) {
      setError(error.message || "Invalid credentials. Please check your Checker ID and password.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-white font-sans">
      {/* Left Side - QC Branding */}
      <div className="hidden lg:flex lg:flex-1 relative bg-[#000000]">
        <div className="flex items-center justify-center w-full p-12">
          <div className="max-w-lg text-center text-white">
            {/* Logo Section */}
            <div className="mb-8">
              <div className="inline-flex items-center justify-center w-44 h-36 mb-6">
                {companyLogo ? (
                  <img src={companyLogo} alt="Company Logo" className="object-contain" style={{ width: 190, height: 150 }} />
                ) : (
                  <Image src="/assets/logo/m2c-logo.png" alt="Company Logo" width={190} height={150} className="object-contain" />
                )}
              </div>
              <h1 className="text-4xl font-bold mb-3">
                QC Portal
              </h1>
              <p className="text-xl text-gray-100 font-medium">
                Pre-Shipment Inspection System
              </p>
            </div>

            {/* Key Features */}
            <div className="space-y-6 mb-8">
              <div className="flex items-center space-x-4 bg-white/20 backdrop-blur-md rounded-xl p-4 transition-all duration-300 hover:bg-white/25 hover:shadow-lg hover:scale-[1.02] cursor-default">
                <div className="shrink-0 w-12 h-12 bg-white/30 rounded-lg flex items-center justify-center">
                  <ClipboardCheck className="w-6 h-6 text-white" />
                </div>
                <div className="text-left">
                  <h3 className="font-semibold text-lg text-white">Pre-Shipment Inspection</h3>
                  <p className="text-white/80 text-sm">Thorough quality checks before dispatch</p>
                </div>
              </div>

              <div className="flex items-center space-x-4 bg-white/20 backdrop-blur-md rounded-xl p-4 transition-all duration-300 hover:bg-white/25 hover:shadow-lg hover:scale-[1.02] cursor-default">
                <div className="shrink-0 w-12 h-12 bg-white/30 rounded-lg flex items-center justify-center">
                  <BarChart3 className="w-6 h-6 text-white" />
                </div>
                <div className="text-left">
                  <h3 className="font-semibold text-lg text-white">Defect Tracking</h3>
                  <p className="text-white/80 text-sm">Identify and categorize quality issues</p>
                </div>
              </div>

              <div className="flex items-center space-x-4 bg-white/20 backdrop-blur-md rounded-xl p-4 transition-all duration-300 hover:bg-white/25 hover:shadow-lg hover:scale-[1.02] cursor-default">
                <div className="shrink-0 w-12 h-12 bg-white/30 rounded-lg flex items-center justify-center">
                  <FileCheck className="w-6 h-6 text-white" />
                </div>
                <div className="text-left">
                  <h3 className="font-semibold text-lg text-white">Inspection Reports</h3>
                  <p className="text-white/80 text-sm">Detailed quality assessment forms</p>
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="bg-white/20 backdrop-blur-md rounded-lg p-6 h-28 flex flex-col items-center justify-center transition-all duration-300 hover:bg-white/25 hover:shadow-lg hover:scale-[1.02] cursor-default">
                <div className="text-3xl font-bold text-white mb-2">2.5K+</div>
                <div className="text-sm text-white/80 font-medium">Items Checked</div>
              </div>
              <div className="bg-white/20 backdrop-blur-md rounded-lg p-6 h-28 flex flex-col items-center justify-center transition-all duration-300 hover:bg-white/25 hover:shadow-lg hover:scale-[1.02] cursor-default">
                <div className="text-3xl font-bold text-white mb-2">98.5%</div>
                <div className="text-sm text-white/80 font-medium">Pass Rate</div>
              </div>
              <div className="bg-white/20 backdrop-blur-md rounded-lg p-6 h-28 flex flex-col items-center justify-center transition-all duration-300 hover:bg-white/25 hover:shadow-lg hover:scale-[1.02] cursor-default">
                <div className="text-3xl font-bold text-white mb-2">15min</div>
                <div className="text-sm text-white/80 font-medium">Avg Check Time</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-gray-50">
        <div className="max-w-md w-full">
          {/* Login Form Card */}
          <Card className="shadow-2xl border-0 bg-white">
            <CardHeader className="text-center pb-6 pt-8">
              <CardTitle className="text-3xl font-bold text-gray-900 mb-2">
                Welcome Back
              </CardTitle>
              <p className="text-gray-600">
                Sign in to your QC dashboard
              </p>
            </CardHeader>
            <CardContent className="px-8 pb-8">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Checker ID Field */}
                <div>
                  <label
                    htmlFor="checkerID"
                    className="block text-sm font-semibold text-gray-700 mb-2"
                  >
                    Checker ID
                  </label>
                  <input
                    ref={checkerIDInputRef}
                    id="checkerID"
                    type="text"
                    value={checkerID}
                    onChange={handleCheckerIDChange}
                    onBlur={() => validateCheckerID(checkerID)}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:border-[#455a64] transition-all duration-200 bg-white text-gray-900 placeholder-gray-500 ${checkerIDError
                        ? "border-red-500 focus:ring-red-200"
                        : "border-gray-300 focus:ring-[#455a64]"
                      }`}
                    placeholder="Enter your Checker ID (e.g., QC-001)"
                    autoFocus
                    disabled={isLoading}
                  />
                  {checkerIDError && (
                    <div className="flex items-center mt-2 text-red-600 text-sm">
                      <AlertCircle className="w-4 h-4 mr-1.5" />
                      {checkerIDError}
                    </div>
                  )}
                </div>

                {/* Password Field */}
                <div>
                  <label
                    htmlFor="password"
                    className="block text-sm font-semibold text-gray-700 mb-2"
                  >
                    Password
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={handlePasswordChange}
                      onBlur={() => validatePassword(password)}
                      className={`w-full px-4 py-3 pr-12 border rounded-lg focus:ring-2 focus:border-[#455a64] transition-all duration-200 bg-white text-gray-900 placeholder-gray-500 ${passwordError
                          ? "border-red-500 focus:ring-red-200"
                          : "border-gray-300 focus:ring-[#455a64]"
                        }`}
                      placeholder="Enter your password"
                      disabled={isLoading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                      aria-label={
                        showPassword ? "Hide password" : "Show password"
                      }
                    >
                      {showPassword ? (
                        <EyeOff className="w-5 h-5" />
                      ) : (
                        <Eye className="w-5 h-5" />
                      )}
                    </button>
                  </div>

                  {passwordError && (
                    <div className="flex items-center mt-2 text-red-600 text-sm">
                      <AlertCircle className="w-4 h-4 mr-1.5" />
                      {passwordError}
                    </div>
                  )}
                </div>

                {/* General Error Message */}
                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-center text-red-700 text-sm">
                      <AlertCircle className="w-4 h-4 mr-1.5" />
                      {error}
                    </div>
                  </div>
                )}

                {/* Remember */}
                <div className="flex items-center justify-between">
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="w-4 h-4 text-gray-700 border-gray-300 rounded focus:ring-[#455a64]"
                    />
                    <span className="ml-2 text-sm text-gray-700">
                      Remember me
                    </span>
                  </label>
                </div>

                {/* Sign In Button */}
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-gray-900 hover:bg-gray-700 disabled:bg-gray-400 text-white py-3 text-sm font-semibold rounded-lg shadow-md transition-all duration-300 transform hover:scale-[1.02] hover:shadow-lg"
                >
                  {isLoading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Signing In...
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4 mr-2" />
                      Sign In to QC Portal
                    </>
                  )}
                </Button>
              </form>

              {/* Help Section */}
              <div className="mt-8 pt-6 border-t border-gray-200">
                <div className="text-center">
                  <p className="text-sm text-gray-500">
                    Your login credentials were sent to your email by the admin.
                    If you haven&apos;t received them, please contact your administrator.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
