"use client";
import { Shield, Eye, Lock, Users, Mail } from 'lucide-react';
import Reveal from '@/components/WebSite/Shared/Reveal';

function Privacy() {
  return (
    <div className="min-h-screen bg-[#f7f7f5] py-8 sm:py-10 lg:py-12">
      <div className="max-w-[95%] sm:max-w-[92%] lg:max-w-[89%] mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
        <div className="bg-white rounded-2xl ring-1 ring-black/5 shadow-[0_10px_40px_rgba(0,0,0,0.06)] p-4 sm:p-6 lg:p-8">
          <Reveal className="text-center mb-6 sm:mb-8">
            <Shield className="mx-auto h-10 w-10 sm:h-12 sm:w-12 text-[#e01a1b] mb-3 sm:mb-4" />
            <span className="inline-flex items-center gap-2 text-[11px] sm:text-xs font-semibold uppercase tracking-[0.18em] text-[#e01a1b] mb-3">
              <span className="h-px w-6 bg-[#e01a1b]" />
              Your Privacy
            </span>
            <h1 className="font-playfair text-2xl sm:text-3xl md:text-4xl font-semibold text-[#1a1a1a] tracking-tight">Privacy Policy</h1>
            <p className="text-sm sm:text-base text-gray-600 mt-2">Last updated: December 2024</p>
          </Reveal>

          <div className="space-y-8">
            <section>
              <div className="flex items-center mb-4">
                <Eye className="h-6 w-6 text-[#e01a1b] mr-3" />
                <h2 className="text-xl font-semibold text-[#1a1a1a]">Information We Collect</h2>
              </div>
              <p className="text-gray-700 mb-4">
                We collect information you provide directly to us, such as when you create an account, 
                make a purchase, or contact us for support.
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-2">
                <li>Personal information (name, email, phone number)</li>
                <li>Payment information (processed securely through third-party providers)</li>
                <li>Shipping and billing addresses</li>
                <li>Purchase history and preferences</li>
              </ul>
            </section>

            <section>
              <div className="flex items-center mb-4">
                <Lock className="h-6 w-6 text-[#e01a1b] mr-3" />
                <h2 className="text-xl font-semibold text-[#1a1a1a]">How We Use Your Information</h2>
              </div>
              <ul className="list-disc list-inside text-gray-700 space-y-2">
                <li>Process and fulfill your orders</li>
                <li>Communicate with you about your purchases</li>
                <li>Provide customer support</li>
                <li>Send promotional emails (with your consent)</li>
                <li>Improve our services and user experience</li>
              </ul>
            </section>

            <section>
              <div className="flex items-center mb-4">
                <Users className="h-6 w-6 text-[#e01a1b] mr-3" />
                <h2 className="text-xl font-semibold text-[#1a1a1a]">Information Sharing</h2>
              </div>
              <p className="text-gray-700 mb-4">
                We do not sell, trade, or rent your personal information to third parties. We may share 
                your information only in the following circumstances:
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-2">
                <li>With service providers who help us operate our business</li>
                <li>When required by law or to protect our rights</li>
                <li>In connection with a business transfer or merger</li>
              </ul>
            </section>

            <section>
              <div className="flex items-center mb-4">
                <Mail className="h-6 w-6 text-[#e01a1b] mr-3" />
                <h2 className="text-xl font-semibold text-[#1a1a1a]">Contact Us</h2>
              </div>
              <p className="text-gray-700">
                If you have any questions about this Privacy Policy, please contact us at:
              </p>
              <div className="mt-4 p-4 bg-[#f7f7f5] rounded-xl ring-1 ring-black/5 border-l-2 border-[#e01a1b]">
                <p className="text-gray-700">Email: privacy@yourstore.com</p>
                <p className="text-gray-700">Phone: (555) 123-4567</p>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Privacy;
