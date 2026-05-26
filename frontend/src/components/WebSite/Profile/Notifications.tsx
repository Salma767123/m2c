"use client"

import { Bell, Mail, MessageSquare, Package, Heart, Tag, Shield } from 'lucide-react'
import type { UserProfile } from './types'

interface NotificationsProps {
  editedProfile: UserProfile
  setEditedProfile: (profile: UserProfile) => void
}

export default function Notifications({ editedProfile, setEditedProfile }: NotificationsProps) {
  const handlePreferenceChange = (key: keyof UserProfile['preferences'], value: boolean) => {
    setEditedProfile({
      ...editedProfile,
      preferences: {
        ...editedProfile.preferences,
        [key]: value
      }
    })
  }

  const notificationCategories = [
    {
      id: 'orders',
      title: 'Order Updates',
      description: 'Get notified about order confirmations, shipping updates, and delivery status',
      icon: Package,
      email: true,
      push: true
    },
    {
      id: 'promotions',
      title: 'Promotions & Deals',
      description: 'Receive exclusive offers, discounts, and promotional campaigns',
      icon: Tag,
      email: editedProfile.preferences.newsletter,
      push: true
    },
    {
      id: 'wishlist',
      title: 'Wishlist Updates',
      description: 'Get alerts when wishlist items go on sale or are back in stock',
      icon: Heart,
      email: true,
      push: true
    },
    {
      id: 'account',
      title: 'Account Security',
      description: 'Important security alerts and account activity notifications',
      icon: Shield,
      email: true,
      push: true
    },
    {
      id: 'newsletter',
      title: 'Newsletter',
      description: 'Weekly updates about new products, trends, and company news',
      icon: Mail,
      email: editedProfile.preferences.newsletter,
      push: false
    }
  ]

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 sm:p-5 lg:p-6">
      <div className="flex items-center gap-2 sm:gap-3 mb-5 sm:mb-6">
        <Bell className="w-5 h-5 sm:w-6 sm:h-6 text-gray-600" />
        <h2 className="text-lg sm:text-xl font-bold text-slate-900">Notification Preferences</h2>
      </div>

      {/* Global Settings */}
      {/* <div className="mb-8 p-4 bg-slate-50 rounded-lg">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Global Settings</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Mail className="w-5 h-5 text-gray-600" />
              <div>
                <h4 className="font-medium text-slate-900">Email Notifications</h4>
                <p className="text-sm text-slate-600">Receive notifications via email</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={editedProfile.preferences.emailNotifications}
                onChange={(e) => handlePreferenceChange('emailNotifications', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-gray-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gray-600"></div>
            </label>
          </div>
        </div>
      </div> */}

      {/* Notification Categories */}
      <div className="space-y-6">
        <h3 className="text-lg font-semibold text-slate-900">Notification Categories</h3>
        
        {notificationCategories.map((category) => {
          const Icon = category.icon
          return (
            <div key={category.id} className="border border-slate-200 rounded-lg p-4">
              <div className="flex items-start gap-4">
                <div className="p-2 bg-gray-100 rounded-lg">
                  <Icon className="w-5 h-5 text-gray-600" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-slate-900 mb-1">{category.title}</h4>
                  <p className="text-sm text-slate-600 mb-4">{category.description}</p>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-slate-400" />
                        <span className="text-sm text-slate-700">Email</span>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={category.email}
                          onChange={() => {}}
                          disabled={!editedProfile.preferences.emailNotifications}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-gray-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-gray-600 peer-disabled:opacity-50"></div>
                      </label>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Bell className="w-4 h-4 text-slate-400" />
                        <span className="text-sm text-slate-700">Push</span>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={category.push}
                          onChange={() => {}}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-gray-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-gray-600"></div>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Frequency Settings */}
      {/* <div className="mt-8 p-4 bg-gray-50 border border-gray-200 rounded-lg">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Email Frequency</h3>
        <div className="space-y-3">
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="radio" name="frequency" value="immediate" defaultChecked className="text-gray-600" />
            <div>
              <span className="font-medium text-slate-900">Immediate</span>
              <p className="text-sm text-slate-600">Get notified as soon as something happens</p>
            </div>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="radio" name="frequency" value="daily" className="text-gray-600" />
            <div>
              <span className="font-medium text-slate-900">Daily Digest</span>
              <p className="text-sm text-slate-600">Receive a summary of all notifications once per day</p>
            </div>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="radio" name="frequency" value="weekly" className="text-gray-600" />
            <div>
              <span className="font-medium text-slate-900">Weekly Summary</span>
              <p className="text-sm text-slate-600">Get a weekly roundup of all your notifications</p>
            </div>
          </label>
        </div>
      </div> */}

      {/* Save Button */}
      <div className="mt-6 pt-6 border-t border-slate-200">
        <button className="bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 transition-colors">
          Save Notification Preferences
        </button>
      </div>
    </div>
  )
}
