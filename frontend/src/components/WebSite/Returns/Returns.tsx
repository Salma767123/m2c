import { RotateCcw, Clock, Package, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

const Returns = () => {
  return (
    <div className="min-h-screen bg-gray-50 py-8 sm:py-10 lg:py-12">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6 lg:p-8">
          <div className="text-center mb-6 sm:mb-8">
            <RotateCcw className="mx-auto h-10 w-10 sm:h-12 sm:w-12 text-blue-600 mb-3 sm:mb-4" />
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Returns & Exchanges</h1>
            <p className="text-sm sm:text-base text-gray-600 mt-2">Easy returns within 30 days</p>
          </div>

          <div className="space-y-8">
            <section>
              <div className="flex items-center mb-4">
                <Clock className="h-6 w-6 text-blue-600 mr-3" />
                <h2 className="text-xl font-semibold text-gray-900">Return Policy</h2>
              </div>
              <p className="text-gray-700 mb-4">
                We want you to be completely satisfied with your purchase. If you're not happy 
                with your order, you can return it within 30 days of delivery for a full refund.
              </p>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-blue-800 font-medium">30-Day Return Window</p>
                <p className="text-blue-700 text-sm mt-1">
                  Returns must be initiated within 30 days of delivery date
                </p>
              </div>
            </section>

            <section>
              <div className="flex items-center mb-4">
                <CheckCircle className="h-6 w-6 text-green-600 mr-3" />
                <h2 className="text-xl font-semibold text-gray-900">Eligible Items</h2>
              </div>
              <ul className="list-disc list-inside text-gray-700 space-y-2">
                <li>Items in original condition with tags attached</li>
                <li>Unworn and unwashed clothing</li>
                <li>Electronics in original packaging</li>
                <li>Books in sellable condition</li>
                <li>Home goods without damage</li>
              </ul>
            </section>

            <section>
              <div className="flex items-center mb-4">
                <XCircle className="h-6 w-6 text-gray-600 mr-3" />
                <h2 className="text-xl font-semibold text-gray-900">Non-Returnable Items</h2>
              </div>
              <ul className="list-disc list-inside text-gray-700 space-y-2">
                <li>Personalized or customized items</li>
                <li>Perishable goods</li>
                <li>Intimate apparel and swimwear</li>
                <li>Items damaged by misuse</li>
                <li>Digital downloads</li>
              </ul>
            </section>

            <section>
              <div className="flex items-center mb-4">
                <Package className="h-6 w-6 text-blue-600 mr-3" />
                <h2 className="text-xl font-semibold text-gray-900">How to Return</h2>
              </div>
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <div className="shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-medium">
                    1
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">Start Your Return</h3>
                    <p className="text-gray-700 text-sm">
                      Contact our customer service or use our online return portal
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-medium">
                    2
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">Package Your Items</h3>
                    <p className="text-gray-700 text-sm">
                      Include all original packaging, tags, and accessories
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-medium">
                    3
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">Ship It Back</h3>
                    <p className="text-gray-700 text-sm">
                      Use the prepaid return label we provide
                    </p>
                  </div>
                </div>
              </div>
            </section>

            <section>
              <div className="flex items-center mb-4">
                <AlertCircle className="h-6 w-6 text-blue-600 mr-3" />
                <h2 className="text-xl font-semibold text-gray-900">Refund Information</h2>
              </div>
              <div className="space-y-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-medium text-gray-900 mb-2">Processing Time</h3>
                  <p className="text-gray-700 text-sm">
                    Refunds are processed within 5-7 business days after we receive your return
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-medium text-gray-900 mb-2">Refund Method</h3>
                  <p className="text-gray-700 text-sm">
                    Refunds are issued to the original payment method used for purchase
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-medium text-gray-900 mb-2">Return Shipping</h3>
                  <p className="text-gray-700 text-sm">
                    We provide free return shipping labels for all eligible returns
                  </p>
                </div>
              </div>
            </section>

            <section className="bg-blue-50 border border-blue-200 rounded-lg p-4 sm:p-5 lg:p-6">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3 sm:mb-4">Need Help?</h2>
              <p className="text-sm sm:text-base text-gray-700 mb-3 sm:mb-4">
                Our customer service team is here to help with your return.
              </p>
              <div className="space-y-1.5 sm:space-y-2 text-sm sm:text-base">
                <p className="text-gray-700 break-all">Email: returns@yourstore.com</p>
                <p className="text-gray-700">Phone: (555) 123-4567</p>
                <p className="text-gray-700">Hours: Monday-Friday, 9 AM - 6 PM EST</p>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Returns;
