"use client"

import { User } from "lucide-react"

export default function SettingsPage() {
  return (
    <div className="min-h-screen font-sans bg-linear-to-br from-slate-50 to-blue-50/30">
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">QC Settings</h1>
          <p className="text-slate-600 text-lg">Manage your personal details and account information</p>
        </div>

        <div className="max-w-7xl mx-auto">
          {/* Profile Information - Top Section */}
          <div className="mb-8">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden">
              <div className="px-6 py-5 border-b border-slate-200/60 bg-linear-to-r from-slate-50 to-white">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-100 rounded-lg">
                    <User className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">Profile Information</h2>
                    <p className="text-sm text-slate-600">Update your personal details and account information</p>
                  </div>
                </div>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-slate-700 font-semibold mb-3 text-sm">Checker ID:</label>
                    <input
                      type="text"
                      defaultValue="CHECKER_001"
                      className="w-full px-4 py-3 border border-slate-300 rounded-xl bg-slate-50 text-slate-500 cursor-not-allowed"
                      disabled
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-semibold mb-3 text-sm">Full Name:</label>
                    <input
                      type="text"
                      placeholder="Enter your full name"
                      className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-semibold mb-3 text-sm">Email Address:</label>
                    <input
                      type="email"
                      placeholder="your@email.com"
                      className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                    />
                  </div>
                </div>
                <div className="mt-6 pt-6 border-t border-slate-200 flex justify-between items-center">
                  <div className="text-sm text-slate-600">
                    <p>Last updated: <span className="font-medium">January 15, 2024</span></p>
                  </div>
                  <button className="bg-linear-to-r from-blue-600 to-blue-700 text-white font-semibold py-3 px-6 rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-sm hover:shadow-md">
                    Save Changes
                  </button>
                </div>
              </div>
            </div>
          </div>


        </div>
      </div>
    </div>
  )
}
