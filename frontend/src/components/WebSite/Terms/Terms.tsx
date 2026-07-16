import { FileText, Scale, AlertTriangle, CreditCard, Truck, RefreshCw } from 'lucide-react';
import Reveal from '@/components/WebSite/Shared/Reveal';

const Terms = () => {
  return (
    <div className="min-h-screen bg-[#f7f7f5] py-8 sm:py-10 lg:py-12">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
        <div className="bg-white rounded-2xl ring-1 ring-black/5 shadow-[0_10px_40px_rgba(0,0,0,0.06)] p-4 sm:p-6 lg:p-8">
          <Reveal className="text-center mb-6 sm:mb-8">
            <Scale className="mx-auto h-10 w-10 sm:h-12 sm:w-12 text-[#e01a1b] mb-3 sm:mb-4" />
            <span className="inline-flex items-center gap-2 text-[11px] sm:text-xs font-semibold uppercase tracking-[0.18em] text-[#e01a1b] mb-3">
              <span className="h-px w-6 bg-[#e01a1b]" />
              Our Agreement
            </span>
            <h1 className="font-playfair text-2xl sm:text-3xl md:text-4xl font-semibold text-[#1a1a1a] tracking-tight">Terms of Service</h1>
            <p className="text-sm sm:text-base text-gray-600 mt-2">Last updated: December 2024</p>
          </Reveal>

          <div className="space-y-8">
            <section>
              <div className="flex items-center mb-4">
                <FileText className="h-6 w-6 text-[#e01a1b] mr-3" />
                <h2 className="text-xl font-semibold text-[#1a1a1a]">Acceptance of Terms</h2>
              </div>
              <p className="text-gray-700">
                By accessing and using this website, you accept and agree to be bound by the terms 
                and provision of this agreement. If you do not agree to abide by the above, please 
                do not use this service.
              </p>
            </section>

            <section>
              <div className="flex items-center mb-4">
                <CreditCard className="h-6 w-6 text-[#e01a1b] mr-3" />
                <h2 className="text-xl font-semibold text-[#1a1a1a]">Payment Terms</h2>
              </div>
              <ul className="list-disc list-inside text-gray-700 space-y-2">
                <li>All prices are listed in USD and are subject to change without notice</li>
                <li>Payment is due at the time of purchase</li>
                <li>We accept major credit cards and PayPal</li>
                <li>All transactions are processed securely</li>
              </ul>
            </section>

            <section>
              <div className="flex items-center mb-4">
                <Truck className="h-6 w-6 text-[#e01a1b] mr-3" />
                <h2 className="text-xl font-semibold text-[#1a1a1a]">Shipping and Delivery</h2>
              </div>
              <ul className="list-disc list-inside text-gray-700 space-y-2">
                <li>We ship to addresses within the United States</li>
                <li>Delivery times vary by location and shipping method selected</li>
                <li>Risk of loss passes to you upon delivery to the carrier</li>
                <li>We are not responsible for delays caused by shipping carriers</li>
              </ul>
            </section>

            <section>
              <div className="flex items-center mb-4">
                <RefreshCw className="h-6 w-6 text-[#e01a1b] mr-3" />
                <h2 className="text-xl font-semibold text-[#1a1a1a]">Returns and Refunds</h2>
              </div>
              <p className="text-gray-700 mb-4">
                Please refer to our Returns Policy for detailed information about returns, 
                exchanges, and refunds.
              </p>
            </section>

            <section>
              <div className="flex items-center mb-4">
                <AlertTriangle className="h-6 w-6 text-[#e01a1b] mr-3" />
                <h2 className="text-xl font-semibold text-[#1a1a1a]">Limitation of Liability</h2>
              </div>
              <p className="text-gray-700">
                In no event shall our company be liable for any direct, indirect, punitive, 
                incidental, special, consequential damages or any damages whatsoever including, 
                without limitation, damages for loss of use, data or profits, arising out of or 
                in any way connected with the use or performance of the website.
              </p>
            </section>

            <section>
              <div className="flex items-center mb-4">
                <Scale className="h-6 w-6 text-[#e01a1b] mr-3" />
                <h2 className="text-xl font-semibold text-[#1a1a1a]">Governing Law</h2>
              </div>
              <p className="text-gray-700">
                These terms and conditions are governed by and construed in accordance with the 
                laws of the United States and you irrevocably submit to the exclusive jurisdiction 
                of the courts in that State or location.
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Terms;
