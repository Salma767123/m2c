"use client"

import { useState } from 'react'
import { Shield, Eye, EyeOff, Key, Smartphone, Clock, MapPin, AlertTriangle } from 'lucide-react'

interface SecurityProps {
  showPasswordChange: boolean
  setShowPasswordChange: (show: boolean) => void
  showCurrentPassword: boolean
  setShowCurrentPassword: (show: boolean) => void
  showNewPassword: boolean
  setShowNewPassword: (show: boolean) => void
  showConfirmPassword: boolean
  setShowConfirmPassword: (show: boolean) => void
  passwords: {
    current: string
    new: string
    confirm: string
  }
  setPasswords: (passwords: { current: string; new: string; confirm: string }) => void
  handlePasswordChange: () => void
}

export default function Security({
  showPasswordChange,
  setShowPasswordChange,
  showCurrentPassword,
  setShowCurrentPassword,
  showNewPassword,
  setShowNewPassword,
  showConfirmPassword,
  setShowConfirmPassword,
  passwords,
  setPasswords,
  handlePasswordChange
}: SecurityProps) {
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false)

  const recentActivity = [
    {
      id: '1',
      action: 'Login',
      device: 'Chrome on Windows',
      location: 'New York, NY',
      timestamp: '2024-01-15 10:30 AM',
      status: 'success'
    },
    {
      id: '2',
      action: 'Password Change',
      device: 'Safari on iPhone',
      location: 'New York, NY',
      timestamp: '2024-01-14 3:45 PM',
      status: 'success'
    },
    {
      id: '3',
      action: 'Failed Login Attempt',
      device: 'Unknown Device',
      location: 'Los Angeles, CA',
      timestamp: '2024-01-13 11:20 PM',
      status: 'failed'
    },
    {
      id: '4',
      action: 'Login',
      device: 'Chrome on MacOS',
      location: 'New York, NY',
      timestamp: '2024-01-12 9:15 AM',
      status: 'success'
    }
  ]

  const getStatusColor = (status: string) => {
    return status === 'success'
      ? 'text-green-600 bg-green-100'
      : 'text-red-600 bg-red-100'
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm ring-1 ring-black/5 border border-slate-200 p-6">
      <div className="flex items-center gap-3 mb-6">
        <Shield className="w-6 h-6 text-[#e01a1b]" />
        <h2 className="font-playfair text-xl font-semibold text-[#1a1a1a]">Security Settings</h2>
      </div>

      {/* Password Section */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Password</h3>
            <p className="text-sm text-slate-600">Keep your account secure with a strong password</p>
          </div>
          <button
            onClick={() => setShowPasswordChange(!showPasswordChange)}
            className="btn-shine inline-flex items-center justify-center bg-[#e01a1b] text-white px-4 py-2 rounded-full font-semibold hover:bg-[#c41617] shadow-[0_6px_20px_rgba(224,26,27,0.3)] hover:shadow-[0_12px_30px_rgba(224,26,27,0.45)] hover:-translate-y-0.5 transition-all duration-300"
          >
            Change Password
          </button>
        </div>

        {showPasswordChange && (
          <div className="border border-slate-200 rounded-lg p-4 bg-slate-50">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Current Password</label>
                <div className="relative">
                  <input
                    type={showCurrentPassword ? 'text' : 'password'}
                    value={passwords.current}
                    onChange={(e) => setPasswords({ ...passwords, current: e.target.value })}
                    className="w-full px-4 py-3 pr-12 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#e01a1b]/40 focus:border-[#e01a1b]"
                    placeholder="Enter current password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                  >
                    {showCurrentPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">New Password</label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={passwords.new}
                    onChange={(e) => setPasswords({ ...passwords, new: e.target.value })}
                    className="w-full px-4 py-3 pr-12 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#e01a1b]/40 focus:border-[#e01a1b]"
                    placeholder="Enter new password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                  >
                    {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Confirm New Password</label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={passwords.confirm}
                    onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })}
                    className="w-full px-4 py-3 pr-12 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#e01a1b]/40 focus:border-[#e01a1b]"
                    placeholder="Confirm new password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                  >
                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={handlePasswordChange}
                  className="btn-shine inline-flex items-center justify-center bg-[#e01a1b] text-white px-4 py-2 rounded-full font-semibold hover:bg-[#c41617] shadow-[0_6px_20px_rgba(224,26,27,0.3)] hover:shadow-[0_12px_30px_rgba(224,26,27,0.45)] hover:-translate-y-0.5 transition-all duration-300"
                >
                  Update Password
                </button>
                <button
                  onClick={() => setShowPasswordChange(false)}
                  className="bg-slate-100 text-slate-700 px-4 py-2 rounded-full hover:bg-slate-200 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Two-Factor Authentication */}
      <div className="mb-8 p-4 border border-slate-200 rounded-lg">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Smartphone className="w-5 h-5 text-green-600" />
            <div>
              <h3 className="font-semibold text-slate-900">Two-Factor Authentication</h3>
              <p className="text-sm text-slate-600">Add an extra layer of security to your account</p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={twoFactorEnabled}
              onChange={(e) => setTwoFactorEnabled(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-gray-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gray-600"></div>
          </label>
        </div>
        
        {twoFactorEnabled && (
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-800">
              Two-factor authentication is enabled. You'll receive a code via SMS when logging in from a new device.
            </p>
          </div>
        )}
      </div>

      {/* Security Recommendations */}
      <div className="mb-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
          <div>
            <h3 className="font-semibold text-yellow-900 mb-2">Security Recommendations</h3>
            <ul className="text-sm text-yellow-800 space-y-1">
              <li>• Use a unique password that you don't use anywhere else</li>
              <li>• Enable two-factor authentication for extra security</li>
              <li>• Regularly review your account activity</li>
              <li>• Log out from devices you no longer use</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div>
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Recent Account Activity</h3>
        <div className="space-y-3">
          {recentActivity.map((activity) => (
            <div key={activity.id} className="flex items-center justify-between p-4 border border-slate-200 rounded-lg">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-slate-100 rounded-lg">
                  {activity.action === 'Login' ? (
                    <Key className="w-4 h-4 text-slate-600" />
                  ) : activity.action === 'Password Change' ? (
                    <Shield className="w-4 h-4 text-slate-600" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-gray-600" />
                  )}
                </div>
                <div>
                  <h4 className="font-medium text-slate-900">{activity.action}</h4>
                  <div className="flex items-center gap-4 text-sm text-slate-600">
                    <span>{activity.device}</span>
                    <div className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      <span>{activity.location}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>{activity.timestamp}</span>
                    </div>
                  </div>
                </div>
              </div>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(activity.status)}`}>
                {activity.status === 'success' ? 'Success' : 'Failed'}
              </span>
            </div>
          ))}
        </div>
        
        <button className="mt-4 text-[#e01a1b] hover:text-[#c41617] text-sm font-semibold">
          View All Activity
        </button>
      </div>
    </div>
  )
}
