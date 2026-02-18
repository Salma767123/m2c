'use client';

import { useState, useEffect } from 'react';
import { 
  User,  
  SquarePen, 
  Save, 
  X,  
  Bell, 
  Package, 
  LogOut
} from 'lucide-react';
import ProfileTab from '@/components/WebSite/Profile/ProfileTab';
import OrderHistory from '@/components/WebSite/Profile/OrderHistory';
// import Notifications from '@/components/WebSite/Profile/Notifications';
import type { UserProfile } from '@/components/WebSite/Profile/types';
import { showSuccessToast, showErrorToast } from '@/lib/toast-utils';
import { userProfileService } from '@/services/userProfileService';
import { userAuthService } from '@/services/userAuthService';
import { useRouter } from 'next/navigation';

const Profile = () => {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  // User data with placeholders
  const [userProfile, setUserProfile] = useState<UserProfile>({
    id: 'user_123',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    gender: 'male',
    address: {
      addressLine1: '',
      city: '',
      state: '',
      zipCode: '',
      country: 'United States'
    },
    joinDate: new Date().toISOString().split('T')[0],
    preferences: {
      newsletter: false,
      smsNotifications: false,
      emailNotifications: false
    }
  });

  const [editedProfile, setEditedProfile] = useState<UserProfile>(userProfile);

  // Load user profile on mount
  useEffect(() => {
    loadUserProfile();
  }, []);

  const loadUserProfile = async () => {
    try {
      setIsLoading(true);
      const response = await userProfileService.getProfile();
      
      if (response.success && response.data) {
        const userData = response.data;
        
        // Split name into first and last name
        const nameParts = userData.name?.split(' ') || ['', ''];
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || '';
        
        const profile: UserProfile = {
          id: userData.id,
          firstName,
          lastName,
          email: userData.email,
          phone: userData.phoneNumber || '',
          gender: 'male', // Default, can be enhanced later
          address: {
            addressLine1: userData.address || '',
            city: userData.city || '',
            state: userData.state || '',
            zipCode: userData.zipCode || '',
            country: userData.country || 'United States'
          },
          joinDate: new Date(userData.createdAt).toISOString().split('T')[0],
          preferences: {
            newsletter: false,
            smsNotifications: false,
            emailNotifications: false
          }
        };
        
        setUserProfile(profile);
        setEditedProfile(profile);
      }
    } catch (error: any) {
      console.error('Error loading profile:', error);
      showErrorToast('Load Failed', error.message || 'Unable to load profile data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      
      // Combine first and last name
      const fullName = `${editedProfile.firstName} ${editedProfile.lastName}`.trim();
      
      if (!fullName) {
        showErrorToast('Validation Error', 'Name is required');
        return;
      }
      
      // Prepare update data
      const updateData = {
        name: fullName,
        phoneNumber: editedProfile.phone,
        address: editedProfile.address.addressLine1,
        city: editedProfile.address.city,
        state: editedProfile.address.state,
        zipCode: editedProfile.address.zipCode,
        country: editedProfile.address.country
      };
      
      const response = await userProfileService.updateProfile(updateData);
      
      if (response.success) {
        setUserProfile(editedProfile);
        setIsEditing(false);
        showSuccessToast('Profile Updated', 'Your profile has been updated successfully');
        // Reload profile to get updated data from backend
        await loadUserProfile();
      }
    } catch (error: any) {
      console.error('Error saving profile:', error);
      showErrorToast('Save Failed', error.message || 'Unable to save profile changes');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setEditedProfile(userProfile);
    setIsEditing(false);
  };

  const handleLogout = async () => {
    try {
      await userAuthService.logout();
      userAuthService.clearAuthData(); // Clear stored auth data
      showSuccessToast('Logged Out', 'You have been logged out successfully');
      router.push('/');
    } catch (error) {
      console.error('Logout error:', error);
      // Even if API call fails, clear local data
      userAuthService.clearAuthData();
      showErrorToast('Logout Failed', 'Unable to logout. Please try again.');
      router.push('/');
    }
  };

  const tabs = [
    { id: 'profile', label: 'Profile Information', icon: User },
    { id: 'orders', label: 'Order History', icon: Package },
    // { id: 'notifications', label: 'Notifications', icon: Bell }
  ];

  const renderProfileTab = () => (
    <ProfileTab editedProfile={editedProfile} setEditedProfile={setEditedProfile} isEditing={isEditing} />
  );

  // const renderNotificationsTab = () => (
  //   <Notifications editedProfile={editedProfile} setEditedProfile={setEditedProfile} />
  // );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 py-8 font-sans flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading profile...</p>
        </div>
      </div>
    );
  }

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
                        disabled={isSaving}
                        className="p-1.5 text-green-600 hover:bg-green-100 rounded transition-colors disabled:opacity-50"
                        title="Save"
                      >
                        <Save className="w-4 h-4" />
                      </button>
                      <button
                        onClick={handleCancel}
                        disabled={isSaving}
                        className="p-1.5 text-slate-600 hover:bg-slate-100 rounded transition-colors disabled:opacity-50"
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
                
                <button 
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  <LogOut className="w-5 h-5" />
                  <span className="font-medium">Sign Out</span>
                </button>
              </nav>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            {activeTab === 'profile' && renderProfileTab()}
            {/* {activeTab === 'notifications' && renderNotificationsTab()} */}
            {activeTab === 'orders' && <OrderHistory />}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
