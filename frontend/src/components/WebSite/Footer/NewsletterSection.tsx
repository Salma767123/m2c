"use client";

import { useState } from "react";

const NewsletterSection = () => {
  const [email, setEmail] = useState("");

  const handleNewsletterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle newsletter subscription
    console.log("Newsletter subscription:", email);
    setEmail("");
  };

  return (
    <div className="bg-[#222222] text-white border-b border-gray-800">
      <div className="max-w-7xl 2xl:max-w-420 mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-6 sm:py-8 md:py-10 lg:py-12">
        <div className="text-center">
          <h3 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold mb-2 sm:mb-3 md:mb-4">
            Join the M2C MarkDowns Family
          </h3>
          <p className="text-gray-300 text-xs sm:text-sm md:text-base mb-4 sm:mb-6 md:mb-8 max-w-2xl mx-auto px-2">
            Subscribe for exclusive offers, styling tips, and 10% off your first order.
          </p>
          
          {/* Desktop Layout */}
          <div className="hidden md:block max-w-4xl mx-auto mb-4 sm:mb-6 md:mb-8">
            <div className="flex items-center gap-3 lg:gap-4">
              <h3 className="text-white font-medium whitespace-nowrap text-sm lg:text-base">
                Subscribe Newsletters
              </h3>
              <form onSubmit={handleNewsletterSubmit} className="flex gap-2 lg:gap-3 flex-1">
                <input 
                  type="email" 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                  placeholder="Write your email here" 
                  className="flex-1 px-3 lg:px-4 py-2.5 lg:py-3 bg-transparent border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-white transition-colors text-sm lg:text-base"
                  required
                />
                <button 
                  type="submit" 
                  className="px-4 lg:px-6 py-2.5 lg:py-3 bg-white text-black font-medium rounded-lg hover:bg-gray-100 transition-colors text-sm lg:text-base whitespace-nowrap"
                >
                  Submit
                </button>
              </form>
            </div>
          </div>

          {/* Mobile Layout */}
          <div className="md:hidden max-w-md mx-auto mb-4 sm:mb-6">
            <h3 className="text-white font-medium mb-3 text-sm sm:text-base">
              Subscribe Newsletters
            </h3>
            <form onSubmit={handleNewsletterSubmit} className="space-y-3">
              <input 
                type="email" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                placeholder="Write your email here" 
                className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-transparent border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-white transition-colors text-sm sm:text-base"
                required
              />
              <button 
                type="submit" 
                className="w-full px-4 py-2.5 sm:py-3 bg-white text-black font-medium rounded-lg hover:bg-gray-100 transition-colors text-sm sm:text-base"
              >
                Submit
              </button>
            </form>
          </div>

          <p className="text-gray-300 text-xs sm:text-sm md:text-base max-w-xl mx-auto px-2">
            By subscribing, you agree to our Privacy Policy and consent to receive updates.
          </p>
        </div>
      </div>
    </div>
  );
};

export default NewsletterSection;