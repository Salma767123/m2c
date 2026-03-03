import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Animated,
} from 'react-native';
import {
  User,
  LogOut,
  Save,
  X,
  Edit3,
  Mail,
  Phone,
  MapPin,
  Calendar,
} from 'lucide-react-native';
import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import ProfileTab from './ProfileTab';
import type { UserProfile } from './types';
import { showSuccessToast, showErrorToast } from '@/lib/toast-utils';
import { userAuthService } from '@/services/userAuthService';
import { userProfileService } from '@/services/userProfileService';

export default function Profile() {
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  const [userProfile, setUserProfile] = useState<UserProfile>({
    id: '',
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
      country: '',
    },
    joinDate: '',
    preferences: {
      newsletter: false,
      smsNotifications: false,
      emailNotifications: false,
    },
  });

  const [editedProfile, setEditedProfile] = useState<UserProfile>(userProfile);

  useFocusEffect(
    React.useCallback(() => {
      checkAuthAndLoadProfile();
    }, [])
  );

  useEffect(() => {
    if (!isLoading) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isLoading]);

  const checkAuthAndLoadProfile = async () => {
    try {
      const authenticated = await userAuthService.isAuthenticated();
      setIsAuthenticated(authenticated);

      if (authenticated) {
        await loadUserProfile();
      }
    } catch (error) {
      console.error('Error checking auth:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadUserProfile = async () => {
    try {
      const response = await userProfileService.getProfile();

      if (response.success && response.data) {
        const userData = response.data;

        // Split the full name into first and last name
        const nameParts = (userData.name || '').trim().split(' ');
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || '';

        const profile: UserProfile = {
          id: userData.id,
          firstName,
          lastName,
          email: userData.email,
          phone: userData.phoneNumber || '',
          gender: 'male',
          address: {
            addressLine1: userData.address || '',
            city: userData.city || '',
            state: userData.state || '',
            zipCode: userData.zipCode || '',
            country: userData.country || '',
          },
          joinDate: userData.createdAt || '',
          preferences: {
            newsletter: false,
            smsNotifications: false,
            emailNotifications: false,
          },
        };

        setUserProfile(profile);
        setEditedProfile(profile);
      }
    } catch (error: any) {
      console.error('Error loading profile:', error);
      showErrorToast('Load Failed', error.message || 'Unable to load profile data');
    }
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);

      const fullName = `${editedProfile.firstName} ${editedProfile.lastName}`.trim();

      if (!fullName) {
        showErrorToast('Validation Error', 'Name is required');
        return;
      }

      const updateData = {
        name: fullName,
        phoneNumber: editedProfile.phone,
        address: editedProfile.address.addressLine1,
        city: editedProfile.address.city,
        state: editedProfile.address.state,
        zipCode: editedProfile.address.zipCode,
        country: editedProfile.address.country,
      };

      const response = await userProfileService.updateProfile(updateData);

      if (response.success) {
        setUserProfile(editedProfile);
        setIsEditing(false);
        showSuccessToast('Profile Updated', 'Your profile has been updated successfully');
      } else {
        showErrorToast('Update Failed', response.error || 'Unable to update profile');
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

  const handleLogout = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out of your account?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              try {
                await userAuthService.logout();
              } catch (error) {
                console.log('API logout failed, clearing local data');
              }

              await userAuthService.clearAuthData();
              showSuccessToast('Signed Out', 'You have been signed out successfully');
              router.replace('/(tabs)');
            } catch (error) {
              console.error('Logout error:', error);
              await userAuthService.clearAuthData();
              router.replace('/(tabs)');
            }
          },
        },
      ]
    );
  };

  // Get user initials for avatar
  const getInitials = () => {
    const first = userProfile.firstName?.charAt(0)?.toUpperCase() || '';
    const last = userProfile.lastName?.charAt(0)?.toUpperCase() || '';
    return `${first}${last}` || '?';
  };

  // Format join date
  const formatJoinDate = () => {
    try {
      const date = new Date(userProfile.joinDate);
      if (isNaN(date.getTime())) return 'Recently';
      return date.toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric',
      });
    } catch {
      return 'Recently';
    }
  };

  // ── Loading State ──
  if (isLoading) {
    return (
      <View className="flex-1 bg-gray-50 items-center justify-center">
        <ActivityIndicator size="large" color="#1f2937" />
        <Text className="mt-4 text-gray-500 text-sm">Loading profile...</Text>
      </View>
    );
  }

  // ── Not Authenticated State ──
  if (!isAuthenticated) {
    return (
      <View className="flex-1 bg-gray-50">
        <View
          className="bg-white px-5 pt-4 pb-5"
          style={{
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.04,
            shadowRadius: 8,
            elevation: 2,
          }}
        >
          <Text className="text-2xl font-bold text-gray-900">Profile</Text>
          <Text className="text-sm text-gray-500 mt-1">Manage your account</Text>
        </View>

        <View className="flex-1 items-center justify-center px-8">
          <View
            style={{
              width: 100,
              height: 100,
              borderRadius: 50,
              backgroundColor: '#f1f5f9',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 24,
            }}
          >
            <User size={40} color="#94a3b8" />
          </View>
          <Text className="text-2xl font-bold text-gray-900 mb-2">Login Required</Text>
          <Text className="text-gray-500 text-center text-base mb-8 leading-6">
            Sign in to view and manage your profile settings
          </Text>
          <TouchableOpacity
            onPress={() => router.push('/(auth)/Login' as any)}
            activeOpacity={0.85}
            className="bg-gray-900 rounded-2xl px-10 py-4"
            style={{
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.15,
              shadowRadius: 12,
              elevation: 6,
            }}
          >
            <Text className="text-white font-bold text-base">Login Now</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50">
      {/* ── Premium Header ── */}
      <View
        className="bg-white px-5 pt-4 pb-5"
        style={{
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.04,
          shadowRadius: 8,
          elevation: 2,
        }}
      >
        <View className="flex-row items-center justify-between">
          <View>
            <Text className="text-2xl font-bold text-gray-900">My Account</Text>
            <Text className="text-sm text-gray-500 mt-0.5">Manage your profile settings</Text>
          </View>

          {/* Edit / Save-Cancel Buttons */}
          {!isEditing ? (
            <TouchableOpacity
              onPress={() => setIsEditing(true)}
              activeOpacity={0.7}
              style={{
                width: 42,
                height: 42,
                borderRadius: 14,
                backgroundColor: '#f1f5f9',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Edit3 size={18} color="#64748b" />
            </TouchableOpacity>
          ) : (
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity
                onPress={handleSave}
                disabled={isSaving}
                activeOpacity={0.7}
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 14,
                  backgroundColor: '#ecfdf5',
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: isSaving ? 0.5 : 1,
                }}
              >
                {isSaving ? (
                  <ActivityIndicator size="small" color="#10b981" />
                ) : (
                  <Save size={18} color="#10b981" />
                )}
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleCancel}
                disabled={isSaving}
                activeOpacity={0.7}
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 14,
                  backgroundColor: '#f1f5f9',
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: isSaving ? 0.5 : 1,
                }}
              >
                <X size={18} color="#64748b" />
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Profile Hero Card ── */}
        <Animated.View
          style={{
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          }}
        >
          <View
            style={{
              marginHorizontal: 16,
              marginTop: 16,
              backgroundColor: '#ffffff',
              borderRadius: 20,
              padding: 20,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.05,
              shadowRadius: 12,
              elevation: 3,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              {/* Avatar */}
              <View
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 20,
                  backgroundColor: '#111827',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: 16,
                }}
              >
                <Text
                  style={{
                    color: '#ffffff',
                    fontSize: 22,
                    fontWeight: '800',
                    letterSpacing: 1,
                  }}
                >
                  {getInitials()}
                </Text>
              </View>

              {/* User Info */}
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontSize: 18,
                    fontWeight: '700',
                    color: '#1e293b',
                    marginBottom: 4,
                  }}
                >
                  {userProfile.firstName} {userProfile.lastName}
                </Text>
                <Text style={{ fontSize: 13, color: '#64748b', marginBottom: 2 }}>
                  {userProfile.email}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                  <Calendar size={12} color="#94a3b8" />
                  <Text style={{ fontSize: 11, color: '#94a3b8', marginLeft: 4 }}>
                    Member since {formatJoinDate()}
                  </Text>
                </View>
              </View>
            </View>

            {/* Quick Stats */}
            <View
              style={{
                flexDirection: 'row',
                marginTop: 16,
                backgroundColor: '#f8fafc',
                borderRadius: 14,
                padding: 12,
                gap: 1,
              }}
            >
              <View style={{ flex: 1, alignItems: 'center' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                  <Mail size={12} color="#64748b" />
                  <Text style={{ fontSize: 10, color: '#94a3b8', marginLeft: 4, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    Email
                  </Text>
                </View>
                <Text style={{ fontSize: 12, color: '#1e293b', fontWeight: '600' }} numberOfLines={1}>
                  {userProfile.email ? 'Verified' : 'Not Set'}
                </Text>
              </View>
              <View style={{ width: 1, backgroundColor: '#e2e8f0' }} />
              <View style={{ flex: 1, alignItems: 'center' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                  <Phone size={12} color="#64748b" />
                  <Text style={{ fontSize: 10, color: '#94a3b8', marginLeft: 4, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    Phone
                  </Text>
                </View>
                <Text style={{ fontSize: 12, color: '#1e293b', fontWeight: '600' }} numberOfLines={1}>
                  {userProfile.phone ? 'Added' : 'Not Set'}
                </Text>
              </View>
              <View style={{ width: 1, backgroundColor: '#e2e8f0' }} />
              <View style={{ flex: 1, alignItems: 'center' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                  <MapPin size={12} color="#64748b" />
                  <Text style={{ fontSize: 10, color: '#94a3b8', marginLeft: 4, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    Address
                  </Text>
                </View>
                <Text style={{ fontSize: 12, color: '#1e293b', fontWeight: '600' }} numberOfLines={1}>
                  {userProfile.address.city || 'Not Set'}
                </Text>
              </View>
            </View>
          </View>
        </Animated.View>

        {/* ── Profile Form ── */}
        <ProfileTab
          editedProfile={editedProfile}
          setEditedProfile={setEditedProfile}
          isEditing={isEditing}
        />

        {/* ── Sign Out Button ── */}
        <TouchableOpacity
          onPress={handleLogout}
          activeOpacity={0.7}
          style={{
            marginHorizontal: 16,
            marginTop: 16,
            backgroundColor: '#ffffff',
            borderRadius: 20,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            paddingVertical: 16,
            borderWidth: 1,
            borderColor: '#fee2e2',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.03,
            shadowRadius: 8,
            elevation: 2,
          }}
        >
          <View
            style={{
              width: 34,
              height: 34,
              borderRadius: 10,
              backgroundColor: '#fef2f2',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 10,
            }}
          >
            <LogOut size={16} color="#ef4444" />
          </View>
          <Text style={{ fontSize: 15, fontWeight: '600', color: '#ef4444' }}>
            Sign Out
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}
