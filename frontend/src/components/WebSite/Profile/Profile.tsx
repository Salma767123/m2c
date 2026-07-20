'use client';

import { useState, useEffect } from 'react';
import {
  User,
  SquarePen,
  Save,
  X,
  MapPin,
  Package,
  LifeBuoy,
  LogOut
} from 'lucide-react';
import ProfileTab from '@/components/WebSite/Profile/ProfileTab';
import AddressBook from '@/components/WebSite/Profile/AddressBook';
import OrderHistory from '@/components/WebSite/Profile/OrderHistory';
import SupportTickets from '@/components/WebSite/Profile/SupportTickets';
import Reveal from '@/components/WebSite/Shared/Reveal';
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
      
      // Profile update now only covers personal info. Addresses are managed
      // separately in the Saved Addresses tab.
      const updateData = {
        name: fullName,
        phoneNumber: editedProfile.phone,
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
    { id: 'addresses', label: 'Saved Addresses', icon: MapPin },
    { id: 'orders', label: 'Order History', icon: Package },
    { id: 'support', label: 'Support', icon: LifeBuoy },
  ];

  const renderProfileTab = () => (
    <ProfileTab editedProfile={editedProfile} setEditedProfile={setEditedProfile} isEditing={isEditing} />
  );

  // const renderNotificationsTab = () => (
  //   <Notifications editedProfile={editedProfile} setEditedProfile={setEditedProfile} />
  // );

  if (isLoading) {
    /* Skeleton mirrors the profile page (header + sidebar nav + content card). */
    return (
      <div className="min-h-screen bg-slate-50 py-8 font-sans">
        <div className="max-w-420 mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8 space-y-3">
            <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
            <div className="h-4 w-72 bg-gray-100 rounded animate-pulse" />
          </div>
          <div className="flex flex-col lg:flex-row gap-8">
            <div className="lg:w-64 shrink-0 space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-12 w-full bg-gray-100 rounded-lg animate-pulse" />
              ))}
            </div>
            <div className="flex-1 bg-white rounded-xl border border-slate-200 p-4 sm:p-6 lg:p-8 space-y-4">
              <div className="h-6 w-40 bg-gray-200 rounded animate-pulse" />
              <div className="h-4 w-2/3 bg-gray-100 rounded animate-pulse" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="space-y-2">
                    <div className="h-3 w-20 bg-gray-100 rounded animate-pulse" />
                    <div className="h-10 w-full bg-gray-200 rounded animate-pulse" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-4 sm:py-6 lg:py-8 font-sans ">
      <div className="max-w-420 mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
        {/* Page Header — Order-page style with icon + count */}
        <Reveal className="mb-5 sm:mb-6 lg:mb-8">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <User className="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8 text-[#e01a1b] shrink-0" />
              <div className="min-w-0">
                <span className="inline-flex items-center gap-2 text-[11px] sm:text-xs font-semibold uppercase tracking-[0.18em] text-[#e01a1b] mb-1.5">
                  <span className="h-px w-6 bg-[#e01a1b]" />
                  Your Account
                </span>
                <h1 className="font-playfair text-2xl sm:text-3xl lg:text-4xl font-semibold text-[#1a1a1a] tracking-tight mb-1 sm:mb-2">My Account</h1>
                <p className="text-sm sm:text-base text-slate-600">Manage your profile and account settings</p>
              </div>
            </div>
          </div>
        </Reveal>

        <div className="flex flex-col lg:flex-row gap-5 sm:gap-6 lg:gap-8">
          {/* Sidebar */}
          <Reveal className="lg:w-64 shrink-0" delay={90}>
            <div className="bg-white rounded-2xl shadow-sm ring-1 ring-black/5 border border-slate-200 p-3 sm:p-4">
              {/* User Profile Card in Sidebar */}
              <div className="bg-linear-to-b from-gray-50 to-gray-100 rounded-xl p-4 mb-6 border border-gray-200">
                <div className="mb-3">
                  <h3 className="font-semibold text-slate-900 text-sm">
                    {userProfile.firstName} {userProfile.lastName}
                  </h3>
                  <p className="text-xs text-slate-600 truncate mt-1">{userProfile.email}</p>
                </div>
                {!isEditing ? (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold text-[#e01a1b] bg-white border border-[#e01a1b]/30 rounded-full hover:bg-[#e01a1b] hover:text-white transition-colors"
                  >
                    <SquarePen className="w-3.5 h-3.5" />
                    Edit Profile
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={handleSave}
                      disabled={isSaving}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-white bg-green-600 rounded-full hover:bg-green-700 transition-colors disabled:opacity-50"
                    >
                      <Save className="w-3.5 h-3.5" />
                      {isSaving ? 'Saving...' : 'Save'}
                    </button>
                    <button
                      onClick={handleCancel}
                      disabled={isSaving}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-full hover:bg-slate-50 transition-colors disabled:opacity-50"
                    >
                      <X className="w-3.5 h-3.5" />
                      Cancel
                    </button>
                  </div>
                )}
              </div>

              <nav className="space-y-2">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-left rounded-xl transition-colors ${
                        activeTab === tab.id
                          ? 'bg-[#e01a1b]/10 text-[#e01a1b] border border-[#e01a1b]/20'
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
                  className="w-full flex items-center gap-3 px-4 py-3 text-left rounded-xl text-slate-700 hover:bg-[#e01a1b]/10 hover:text-[#e01a1b] transition-colors"
                >
                  <LogOut className="w-5 h-5" />
                  <span className="font-medium">Sign Out</span>
                </button>
              </nav>
            </div>
          </Reveal>

          {/* Main Content */}
          <Reveal className="flex-1" delay={180}>
            {activeTab === 'profile' && renderProfileTab()}
            {activeTab === 'addresses' && <AddressBook />}
            {activeTab === 'orders' && <OrderHistory />}
            {activeTab === 'support' && <SupportTickets />}
          </Reveal>
        </div>
      </div>
    </div>
  );
};

export default Profile;
