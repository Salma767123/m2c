'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { CheckCircle2, Clock, XCircle, AlertTriangle, Mail, Phone } from 'lucide-react';
import { Button } from '@/components/UI/Button';
import { useVendorAuth } from '@/hooks/useVendorAuth';

export default function VendorStatus() {
  const searchParams = useSearchParams();
  const status = searchParams.get('status');
  const { vendor, logout } = useVendorAuth();

  const getStatusConfig = () => {
    switch (status) {
      case 'pending':
        return {
          icon: Clock,
          title: 'Application Under Review',
          message: 'Your vendor application is being reviewed by our team.',
          description: 'We will contact you within 48 hours with an update on your application status.',
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-200'
        };
      case 'approved':
        return {
          icon: CheckCircle2,
          title: 'Application Approved!',
          message: 'Congratulations! Your vendor application has been approved.',
          description: 'You can now access your vendor dashboard and start managing your products.',
          color: 'text-green-600',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200'
        };
      case 'rejected':
        return {
          icon: XCircle,
          title: 'Application Rejected',
          message: 'Unfortunately, your vendor application has been rejected.',
          description: 'Please contact our support team for more information about reapplying.',
          color: 'text-red-600',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200'
        };
      case 'suspended':
        return {
          icon: AlertTriangle,
          title: 'Account Suspended',
          message: 'Your vendor account has been temporarily suspended.',
          description: 'Please contact our support team to resolve this issue.',
          color: 'text-orange-600',
          bgColor: 'bg-orange-50',
          borderColor: 'border-orange-200'
        };
      default:
        return {
          icon: Clock,
          title: 'Application Status',
          message: 'Please check your application status.',
          description: 'Contact support if you need assistance.',
          color: 'text-gray-600',
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200'
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-white rounded-lg shadow-lg p-8">
        <div className="text-center mb-8">
          <div className={`w-20 h-20 rounded-full ${config.bgColor} flex items-center justify-center mx-auto mb-6`}>
            <Icon className={`w-10 h-10 ${config.color}`} />
          </div>
          <h1 className="text-headline-lg text-gray-900 mb-4">{config.title}</h1>
          <p className="text-lg text-gray-700 mb-4">{config.message}</p>
          <p className="text-gray-600">{config.description}</p>
        </div>

        {vendor && (
          <div className={`${config.bgColor} ${config.borderColor} border rounded-lg p-6 mb-8`}>
            <h3 className="font-semibold text-gray-900 mb-4">Application Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Company:</span>
                <span className="ml-2 font-medium">{vendor.companyName}</span>
              </div>
              <div>
                <span className="text-gray-600">Email:</span>
                <span className="ml-2 font-medium">{vendor.email}</span>
              </div>
              <div>
                <span className="text-gray-600">Owner:</span>
                <span className="ml-2 font-medium">{vendor.ownerName}</span>
              </div>
              <div>
                <span className="text-gray-600">Status:</span>
                <span className={`ml-2 font-medium ${config.color}`}>
                  {vendor.status}
                </span>
              </div>
            </div>
          </div>
        )}

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
          <h3 className="font-semibold text-blue-900 mb-3">What happens next?</h3>
          <ul className="space-y-2 text-sm text-blue-800">
            {status === 'pending' && (
              <>
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-blue-200 text-blue-800 flex items-center justify-center text-xs shrink-0 mt-0.5">1</span>
                  Our team will verify your submitted documents and information
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-blue-200 text-blue-800 flex items-center justify-center text-xs shrink-0 mt-0.5">2</span>
                  You may receive a call for additional verification if needed
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-blue-200 text-blue-800 flex items-center justify-center text-xs shrink-0 mt-0.5">3</span>
                  Once approved, you'll receive access to your vendor dashboard
                </li>
              </>
            )}
            {status === 'approved' && (
              <>
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-blue-200 text-blue-800 flex items-center justify-center text-xs shrink-0 mt-0.5">1</span>
                  Access your vendor dashboard to manage products and orders
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-blue-200 text-blue-800 flex items-center justify-center text-xs shrink-0 mt-0.5">2</span>
                  Upload your product catalog and set pricing
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-blue-200 text-blue-800 flex items-center justify-center text-xs shrink-0 mt-0.5">3</span>
                  Start receiving and fulfilling orders
                </li>
              </>
            )}
            {(status === 'rejected' || status === 'suspended') && (
              <>
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-blue-200 text-blue-800 flex items-center justify-center text-xs shrink-0 mt-0.5">1</span>
                  Contact our support team for detailed feedback
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-blue-200 text-blue-800 flex items-center justify-center text-xs shrink-0 mt-0.5">2</span>
                  Address any issues or provide additional documentation
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-blue-200 text-blue-800 flex items-center justify-center text-xs shrink-0 mt-0.5">3</span>
                  Resubmit your application when ready
                </li>
              </>
            )}
          </ul>
        </div>

        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 mb-8">
          <h3 className="font-semibold text-gray-900 mb-3">Need Help?</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-3">
              <Mail className="w-5 h-5 text-gray-600" />
              <div>
                <p className="text-sm font-medium text-gray-900">Email Support</p>
                <p className="text-sm text-gray-600">support@company.com</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Phone className="w-5 h-5 text-gray-600" />
              <div>
                <p className="text-sm font-medium text-gray-900">Phone Support</p>
                <p className="text-sm text-gray-600">+1 (555) 123-4567</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          {status === 'approved' && (
            <Button 
              onClick={() => window.location.href = '/vendor/dashboard'}
              className="bg-success-500 hover:bg-success-700 text-white"
            >
              Go to Dashboard
            </Button>
          )}
          
          <Button 
            onClick={() => window.location.href = '/'}
            variant="outline"
            className="border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            Return to Home
          </Button>
          
          <Button 
            onClick={logout}
            variant="outline"
            className="border-red-300 text-red-700 hover:bg-red-50"
          >
            Logout
          </Button>
        </div>
      </div>
    </div>
  );
}