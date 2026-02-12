'use client';

import { useState } from 'react';
import { 
  User,  
  SquarePen, 
  Save, 
  X,  
  Bell, 
  Package, 
  Heart, 
  LogOut
} from 'lucide-react';
import ProfileTab from '@/components/WebSite/Profile/ProfileTab';
import OrderHistory from '@/components/WebSite/Profile/OrderHistory';
import Wishlist from '@/components/WebSite/Profile/Wishlist';
import Notifications from '@/components/WebSite/Profile/Notifications';
import type { UserProfile } from '@/components/WebSite/Profile/types';
import { showSuccessToast, showErrorToast } from '@/lib/toast-utils';

const Profile = () => {
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');
  
  // User data with placeholders
  const [userProfile, setUserProfile] = useState<UserProfile>({
    id: 'user_123',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    gender: 'male',
    address: {
      addressLine1: '',
      addressLine2: '',
      landmark: '',
      city: '',
      state: '',
      zipCode: '',
      country: 'United States'
    },
    avatar: '',
    joinDate: new Date().toISOString().split('T')[0],
    preferences: {
      newsletter: false,
      smsNotifications: false,
      emailNotifications: false
    }
  });

  const [editedProfile, setEditedProfile] = useState<UserProfile>(userProfile);

  const handleSave = () => {
    setUserProfile(editedProfile);
    setIsEditing(false);
    // Here you would typically make an API call to save the profile
  };

  const handleCancel = () => {
    setEditedProfile(userProfile);
    setIsEditing(false);
  };

  const tabs = [
    { id: 'profile', label: 'Profile Information', icon: User },
    { id: 'orders', label: 'Order History', icon: Package },
    { id: 'wishlist', label: 'Wishlist', icon: Heart },
    { id: 'notifications', label: 'Notifications', icon: Bell }
  ];

  const renderProfileTab = () => (
    <ProfileTab editedProfile={editedProfile} setEditedProfile={setEditedProfile} isEditing={isEditing} />
  );

  const renderNotificationsTab = () => (
    <Notifications editedProfile={editedProfile} setEditedProfile={setEditedProfile} />
  );

  return (
    <div className="min-h-screen bg-slate-50 py-8 font-sans ">
      <div className="max-w-420 mx-auto px-4 sm:px-6 lg:px-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">My Account</h1>
          <p className="text-slate-600 mt-2">Manage your profile and account settings</p>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar */}
          <div className="lg:w-64 shrink-0">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
              {/* User Profile Card in Sidebar */}
              <div className="bg-linear-to-b from-gray-50 to-gray-100 rounded-lg p-4 mb-6 border border-gray-200">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="font-semibold text-slate-900 text-sm">
                      {userProfile.firstName} {userProfile.lastName}
                    </h3>
                    <p className="text-xs text-slate-600 truncate mt-1">{userProfile.email}</p>
                  </div>
                  {!isEditing ? (
                    <button
                      onClick={() => setIsEditing(true)}
                      className="ml-2 p-1.5 text-gray-600 hover:bg-gray-200 rounded transition-colors"
                      title="Edit Profile"
                    >
                      <SquarePen className="w-4 h-4" />
                    </button>
                  ) : (
                    <div className="flex gap-1 ml-2">
                      <button
                        onClick={handleSave}
                        className="p-1.5 text-green-600 hover:bg-green-100 rounded transition-colors"
                        title="Save"
                      >
                        <Save className="w-4 h-4" />
                      </button>
                      <button
                        onClick={handleCancel}
                        className="p-1.5 text-slate-600 hover:bg-slate-100 rounded transition-colors"
                        title="Cancel"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <nav className="space-y-2">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-left rounded-lg transition-colors ${
                        activeTab === tab.id
                          ? 'bg-gray-50 text-gray-600 border border-gray-200'
                          : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="font-medium">{tab.label}</span>
                    </button>
                  );
                })}
                
                <hr className="my-4 border-slate-200" />
                
                <button className="w-full flex items-center gap-3 px-4 py-3 text-left rounded-lg text-gray-600 hover:bg-gray-50 transition-colors">
                  <LogOut className="w-5 h-5" />
                  <span className="font-medium">Sign Out</span>
                </button>
              </nav>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            {activeTab === 'profile' && renderProfileTab()}
            {activeTab === 'notifications' && renderNotificationsTab()}
            {activeTab === 'orders' && <OrderHistory />}
            {activeTab === 'wishlist' && <Wishlist />}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
