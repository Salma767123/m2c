'use client'

import {
  ShoppingBag,
  Heart,
  Truck,
  Shield,
  Award
} from 'lucide-react'
import CompanyLogo from '@/components/Shared/CompanyLogo'

interface LeftSideContentProps {
  isLogin: boolean
}

export default function LeftSideContent({ isLogin }: LeftSideContentProps) {
  return (
    <div className="hidden lg:flex lg:flex-1 relative overflow-hidden bg-gradient-to-br from-[#1a1a1a] via-[#a11315] to-[#e01a1b]">
      {/* Soft brand glow accents */}
      <div className="pointer-events-none absolute -top-24 -left-24 w-96 h-96 rounded-full bg-[#f24344]/25 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -right-24 w-96 h-96 rounded-full bg-[#e01a1b]/30 blur-3xl" />
      <div className="relative flex items-center justify-center w-full p-12">
        <div className="max-w-lg text-center text-white">
          {/* Logo Section */}
          <div className="mb-8">
            {/* Compact white card that hugs the logo so it stays visible on the red panel */}
            <div className="inline-flex items-center justify-center bg-white rounded-xl px-5 py-3 mb-6 shadow-lg">
              <CompanyLogo
                className="w-[240px] h-auto object-contain"
                skeletonClassName="h-[52px] w-[240px] bg-gray-100"
                fallbackWidth={240}
                fallbackHeight={52}
              />
            </div>
            <h1 className="font-playfair text-4xl font-semibold tracking-tight mb-3">
              M 2 C MarkDowns Private Limited
            </h1>
            <p className="text-xl text-gray-100 font-medium">
              {isLogin 
                ? "Welcome back! Continue your textile journey" 
                : "Join our community of textile enthusiasts"
              }
            </p>
          </div>

          {/* Dynamic Content Based on Login/Register */}
          {isLogin ? (
            /* Login Content - Returning Customer Benefits */
            <div className="space-y-6 mb-8">
              <div className="flex items-center space-x-4 bg-white/20 backdrop-blur-md rounded-xl p-4 transition-all duration-300 hover:bg-white/25 hover:shadow-lg hover:scale-[1.02] cursor-default">
                <div className="shrink-0 w-12 h-12 bg-white/30 rounded-lg flex items-center justify-center">
                  <ShoppingBag className="w-6 h-6 text-white" />
                </div>
                <div className="text-left">
                  <h3 className="font-semibold text-lg text-white">Your Orders</h3>
                  <p className="text-white/80 text-sm">Track your orders and view purchase history</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-4 bg-white/20 backdrop-blur-md rounded-xl p-4 transition-all duration-300 hover:bg-white/25 hover:shadow-lg hover:scale-[1.02] cursor-default">
                <div className="shrink-0 w-12 h-12 bg-white/30 rounded-lg flex items-center justify-center">
                  <Heart className="w-6 h-6 text-white" />
                </div>
                <div className="text-left">
                  <h3 className="font-semibold text-lg text-white">Saved Favorites</h3>
                  <p className="text-white/80 text-sm">Access your wishlist and saved items instantly</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-4 bg-white/20 backdrop-blur-md rounded-xl p-4 transition-all duration-300 hover:bg-white/25 hover:shadow-lg hover:scale-[1.02] cursor-default">
                <div className="shrink-0 w-12 h-12 bg-white/30 rounded-lg flex items-center justify-center">
                  <Award className="w-6 h-6 text-white" />
                </div>
                <div className="text-left">
                  <h3 className="font-semibold text-lg text-white">Member Benefits</h3>
                  <p className="text-white/80 text-sm">Exclusive discounts and early access to new collections</p>
                </div>
              </div>
            </div>
          ) : (
            /* Register Content - New Customer Benefits */
            <div className="space-y-6 mb-8">
              <div className="flex items-center space-x-4 bg-white/20 backdrop-blur-md rounded-xl p-4 transition-all duration-300 hover:bg-white/25 hover:shadow-lg hover:scale-[1.02] cursor-default">
                <div className="shrink-0 w-12 h-12 bg-white/30 rounded-lg flex items-center justify-center">
                  <ShoppingBag className="w-6 h-6 text-white" />
                </div>
                <div className="text-left">
                  <h3 className="font-semibold text-lg text-white">Easy Shopping</h3>
                  <p className="text-white/80 text-sm">Browse thousands of products and shop with just a few clicks</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-4 bg-white/20 backdrop-blur-md rounded-xl p-4 transition-all duration-300 hover:bg-white/25 hover:shadow-lg hover:scale-[1.02] cursor-default">
                <div className="shrink-0 w-12 h-12 bg-white/30 rounded-lg flex items-center justify-center">
                  <Truck className="w-6 h-6 text-white" />
                </div>
                <div className="text-left">
                  <h3 className="font-semibold text-lg text-white">Fast Delivery</h3>
                  <p className="text-white/80 text-sm">Quick and reliable shipping to your doorstep</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-4 bg-white/20 backdrop-blur-md rounded-xl p-4 transition-all duration-300 hover:bg-white/25 hover:shadow-lg hover:scale-[1.02] cursor-default">
                <div className="shrink-0 w-12 h-12 bg-white/30 rounded-lg flex items-center justify-center">
                  <Shield className="w-6 h-6 text-white" />
                </div>
                <div className="text-left">
                  <h3 className="font-semibold text-lg text-white">Secure Shopping</h3>
                  <p className="text-white/80 text-sm">Safe and secure transactions with buyer protection</p>
                </div>
              </div>
            </div>
          )}

          {/* Dynamic Stats Based on Login/Register */}
          {isLogin ? (
            /* Login Stats - User Focused */
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="bg-white/20 backdrop-blur-md rounded-lg p-6 h-28 flex flex-col items-center justify-center transition-all duration-300 hover:bg-white/25 hover:shadow-lg hover:scale-[1.02] cursor-default">
                <div className="text-3xl font-bold text-white mb-2">24/7</div>
                <div className="text-sm text-white/80 font-medium">Support</div>
              </div>
              <div className="bg-white/20 backdrop-blur-md rounded-lg p-6 h-28 flex flex-col items-center justify-center transition-all duration-300 hover:bg-white/25 hover:shadow-lg hover:scale-[1.02] cursor-default">
                <div className="text-3xl font-bold text-white mb-2">Fast</div>
                <div className="text-sm text-white/80 font-medium">Checkout</div>
              </div>
              <div className="bg-white/20 backdrop-blur-md rounded-lg p-6 h-28 flex flex-col items-center justify-center transition-all duration-300 hover:bg-white/25 hover:shadow-lg hover:scale-[1.02] cursor-default">
                <div className="text-3xl font-bold text-white mb-2">100%</div>
                <div className="text-sm text-white/80 font-medium">Secure</div>
              </div>
            </div>
          ) : (
            /* Register Stats - Company Focused */
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="bg-white/20 backdrop-blur-md rounded-lg p-6 h-28 flex flex-col items-center justify-center transition-all duration-300 hover:bg-white/25 hover:shadow-lg hover:scale-[1.02] cursor-default">
                <div className="text-3xl font-bold text-white mb-2">10K+</div>
                <div className="text-sm text-white/80 font-medium">Products</div>
              </div>
              <div className="bg-white/20 backdrop-blur-md rounded-lg p-6 h-28 flex flex-col items-center justify-center transition-all duration-300 hover:bg-white/25 hover:shadow-lg hover:scale-[1.02] cursor-default">
                <div className="text-3xl font-bold text-white mb-2">50K+</div>
                <div className="text-sm text-white/80 font-medium">Happy Customers</div>
              </div>
              <div className="bg-white/20 backdrop-blur-md rounded-lg p-6 h-28 flex flex-col items-center justify-center transition-all duration-300 hover:bg-white/25 hover:shadow-lg hover:scale-[1.02] cursor-default">
                <div className="text-3xl font-bold text-white mb-2">4.8★</div>
                <div className="text-sm text-white/80 font-medium">Rating</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}