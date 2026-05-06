'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import {
  ShoppingBag,
  Heart,
  Truck,
  Shield,
  Users,
  Award
} from 'lucide-react'
import { companyInfoService } from '@/services/companyInfoService'

interface LeftSideContentProps {
  isLogin: boolean
}

export default function LeftSideContent({ isLogin }: LeftSideContentProps) {
  const [companyLogo, setCompanyLogo] = useState<string | null>(() => companyInfoService.getCachedCompanyInfo().companyLogo)

  useEffect(() => {
    companyInfoService.getPublicCompanyInfo().then(info => {
      if (info.companyLogo) setCompanyLogo(info.companyLogo)
    }).catch(() => {})
  }, [])
  return (
    <div className="hidden lg:flex lg:flex-1 relative bg-[#000000]">
      <div className="flex items-center justify-center w-full p-12">
        <div className="max-w-lg text-center text-white">
          {/* Logo Section */}
          <div className="mb-8">
            <div className="inline-flex items-center justify-center w-44 h-36 bg-white rounded-2xl mb-6 shadow-xl">
              {companyLogo ? (
                <img
                  src={companyLogo}
                  alt="Company Logo"
                  className="object-contain w-[190px] h-[150px]"
                />
              ) : (
                <Image
                  src="/assets/logo/m2c-logo.png"
                  alt="Company Logo"
                  width={190}
                  height={150}
                  className="object-contain"
                />
              )}
            </div>
            <h1 className="text-4xl font-bold mb-3">
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