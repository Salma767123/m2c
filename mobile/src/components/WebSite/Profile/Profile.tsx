import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Alert,
  StatusBar,
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
  ShoppingCart,
  Heart,
  Package,
  ChevronRight,
  HelpCircle,
} from 'lucide-react-native';
import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import ProfileTab from './ProfileTab';
import type { UserProfile } from './types';
import { showSuccessToast, showErrorToast } from '@/lib/toast-utils';
import { userAuthService } from '@/services/userAuthService';
import { userProfileService } from '@/services/userProfileService';
import { useCart } from '@/context/CartContext';
import { useWishlist } from '@/context/WishlistContext';
import { ProfileSkeleton } from '@/components/ui/Skeleton';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Firebase push notifications — fails gracefully in Expo Go
let unregisterPushNotifications: (() => Promise<void>) | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const ns = require('@/services/notificationService');
  unregisterPushNotifications = ns.unregisterPushNotifications;
} catch {
  // Firebase not available
}

export default function Profile() {
  const { clearCart } = useCart();
  const { clearWishlist } = useWishlist();
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const [userProfile, setUserProfile] = useState<UserProfile>({
    id: '',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    gender: 'male',
    address: { addressLine1: '', city: '', state: '', zipCode: '', country: '' },
    joinDate: '',
    preferences: { newsletter: false, smsNotifications: false, emailNotifications: false },
  });
  const [editedProfile, setEditedProfile] = useState<UserProfile>(userProfile);

  useFocusEffect(
    React.useCallback(() => {
      checkAuthAndLoad();
    }, []),
  );

  const checkAuthAndLoad = async () => {
    try {
      const auth = await userAuthService.isAuthenticated();
      setIsAuthenticated(auth);
      if (auth) await loadProfile();
    } catch { /* ignore */ }
    finally { setIsLoading(false); }
  };

  const loadProfile = async () => {
    try {
      const res = await userProfileService.getProfile();
      if (res.success && res.data) {
        const d = res.data;
        const parts = (d.name || '').trim().split(' ');
        const profile: UserProfile = {
          id: d.id,
          firstName: parts[0] || '',
          lastName: parts.slice(1).join(' ') || '',
          email: d.email,
          phone: d.phoneNumber || '',
          gender: 'male',
          address: {
            addressLine1: d.address || '',
            city: d.city || '',
            state: d.state || '',
            zipCode: d.zipCode || '',
            country: d.country || '',
          },
          joinDate: d.createdAt || '',
          preferences: { newsletter: false, smsNotifications: false, emailNotifications: false },
        };
        setUserProfile(profile);
        setEditedProfile(profile);
      }
    } catch (e: any) {
      showErrorToast('Load Failed', e.message || 'Unable to load profile');
    }
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      const name = `${editedProfile.firstName} ${editedProfile.lastName}`.trim();
      if (!name) { showErrorToast('Error', 'Name is required'); return; }
      // Profile update only covers personal info. Addresses are managed
      // separately in the Saved Addresses screen.
      const res = await userProfileService.updateProfile({
        name,
        phoneNumber: editedProfile.phone,
      });
      if (res.success) {
        setUserProfile(editedProfile);
        setIsEditing(false);
        showSuccessToast('Saved', 'Profile updated successfully');
      } else {
        showErrorToast('Failed', res.error || 'Unable to update');
      }
    } catch (e: any) {
      showErrorToast('Failed', e.message || 'Unable to save');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          try { await userAuthService.logout(); } catch { /* ok */ }
          await unregisterPushNotifications?.();
          await userAuthService.clearAuthData();
          clearCart();
          clearWishlist();
          showSuccessToast('Signed Out', 'You have been signed out');
          router.replace('/(tabs)');
        },
      },
    ]);
  };

  const initials = () => {
    const f = userProfile.firstName?.charAt(0)?.toUpperCase() || '';
    const l = userProfile.lastName?.charAt(0)?.toUpperCase() || '';
    return `${f}${l}` || '?';
  };

  const joinDate = () => {
    try {
      const d = new Date(userProfile.joinDate);
      if (isNaN(d.getTime())) return 'Recently';
      return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    } catch { return 'Recently'; }
  };

  // ── Loading ─────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#f8fafc' }}>
        <ScreenHeader />
        <ProfileSkeleton />
      </View>
    );
  }

  // ── Not authenticated ───────────────────────────────────────────────────
  if (!isAuthenticated) {
    return (
      <View style={{ flex: 1, backgroundColor: '#f8fafc' }}>
        <ScreenHeader />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
          <View style={{ width: 88, height: 88, borderRadius: 44, backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
            <User size={40} color="#d1d5db" />
          </View>
          <Text style={{ fontSize: 20, fontWeight: '800', color: '#111827', marginBottom: 6 }}>Login Required</Text>
          <Text style={{ fontSize: 14, color: '#6b7280', textAlign: 'center', marginBottom: 24 }}>
            Sign in to view and manage your profile.
          </Text>
          <Pressable onPress={() => router.push('/(auth)/Login' as any)} accessibilityRole="button">
            <View style={{ backgroundColor: '#111827', paddingHorizontal: 28, height: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700' }}>Login to Continue</Text>
            </View>
          </Pressable>
        </View>
      </View>
    );
  }

  // ── Main ────────────────────────────────────────────────────────────────
  return (
    <View style={{ flex: 1, backgroundColor: '#f8fafc' }}>
      <ScreenHeader
        isEditing={isEditing}
        isSaving={isSaving}
        onEdit={() => setIsEditing(true)}
        onSave={handleSave}
        onCancel={() => { setEditedProfile(userProfile); setIsEditing(false); }}
      />

      <ScrollView
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile card */}
        <View
          style={{
            margin: 16,
            backgroundColor: '#fff',
            borderRadius: 16,
            borderWidth: 1,
            borderColor: '#e5e7eb',
            padding: 20,
            shadowColor: '#0f172a',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.05,
            shadowRadius: 8,
            elevation: 2,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View
              style={{
                width: 60,
                height: 60,
                borderRadius: 18,
                backgroundColor: '#111827',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 16,
              }}
            >
              <Text style={{ color: '#fff', fontSize: 22, fontWeight: '800' }}>{initials()}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 18, fontWeight: '700', color: '#111827' }}>
                {userProfile.firstName} {userProfile.lastName}
              </Text>
              <Text style={{ fontSize: 13, color: '#6b7280', marginTop: 2 }}>{userProfile.email}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 4 }}>
                <Calendar size={12} color="#6b7280" />
                <Text style={{ fontSize: 12, color: '#6b7280' }}>Member since {joinDate()}</Text>
              </View>
            </View>
          </View>

          {/* Quick info pills */}
          <View style={{ flexDirection: 'row', marginTop: 16, gap: 8 }}>
            <InfoPill icon={<Phone size={11} color="#6b7280" />} label={userProfile.phone || 'No phone'} />
            <InfoPill icon={<MapPin size={11} color="#6b7280" />} label={userProfile.address.city || 'No location'} />
          </View>
        </View>

        {/* Quick links */}
        <View style={{ marginHorizontal: 16, marginBottom: 14, backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#e5e7eb', overflow: 'hidden' }}>
          <MenuItem icon={<Package size={18} color="#111827" />} label="My Orders" onPress={() => router.push('/(tabs)/orders' as any)} />
          <MenuItem icon={<MapPin size={18} color="#111827" />} label="Saved Addresses" onPress={() => router.push('/(any)/saved-addresses' as any)} />
          <MenuItem icon={<Heart size={18} color="#111827" />} label="My Wishlist" onPress={() => router.push('/(tabs)/wishlist' as any)} />
          <MenuItem icon={<ShoppingCart size={18} color="#111827" />} label="My Cart" onPress={() => router.push('/(tabs)/cart' as any)} />
          <MenuItem icon={<HelpCircle size={18} color="#111827" />} label="Help & Support" onPress={() => router.push('/(any)/contact' as any)} last />
        </View>

        {/* Profile form */}
        <ProfileTab
          editedProfile={editedProfile}
          setEditedProfile={setEditedProfile}
          isEditing={isEditing}
        />

        {/* Sign out */}
        <View style={{ marginHorizontal: 16, marginTop: 14 }}>
          <Pressable onPress={handleLogout} accessibilityRole="button" accessibilityLabel="Sign out">
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#fff',
                borderRadius: 14,
                borderWidth: 1,
                borderColor: '#fecaca',
                height: 52,
                gap: 8,
              }}
            >
              <LogOut size={18} color="#dc2626" />
              <Text style={{ fontSize: 15, fontWeight: '700', color: '#dc2626' }}>Sign Out</Text>
            </View>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

// ─── Header ───────────────────────────────────────────────────────────────────
function ScreenHeader({
  isEditing,
  isSaving,
  onEdit,
  onSave,
  onCancel,
}: {
  isEditing?: boolean;
  isSaving?: boolean;
  onEdit?: () => void;
  onSave?: () => void;
  onCancel?: () => void;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={{
        backgroundColor: '#fff',
        paddingHorizontal: 16,
        paddingTop: insets.top + 12,
        paddingBottom: 14,
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
        flexDirection: 'row',
        alignItems: 'center',
      }}
    >
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 24, fontWeight: '800', color: '#111827' }}>My Profile</Text>
      </View>
      {isEditing ? (
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Pressable onPress={onSave} disabled={isSaving} accessibilityRole="button" accessibilityLabel="Save profile" accessibilityState={{ disabled: isSaving }}>
            <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: '#111827', alignItems: 'center', justifyContent: 'center', opacity: isSaving ? 0.6 : 1 }}>
              {isSaving ? <ActivityIndicator size={14} color="#fff" /> : <Save size={18} color="#fff" />}
            </View>
          </Pressable>
          <Pressable onPress={onCancel} disabled={isSaving} accessibilityRole="button" accessibilityLabel="Cancel editing">
            <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center' }}>
              <X size={18} color="#111827" />
            </View>
          </Pressable>
        </View>
      ) : onEdit ? (
        <Pressable onPress={onEdit} accessibilityRole="button" accessibilityLabel="Edit profile">
          <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center' }}>
            <Edit3 size={18} color="#111827" />
          </View>
        </Pressable>
      ) : null}
    </View>
  );
}

// ─── Menu item ────────────────────────────────────────────────────────────────
function MenuItem({ icon, label, onPress, last }: { icon: React.ReactNode; label: string; onPress: () => void; last?: boolean }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} android_ripple={{ color: 'rgba(0,0,0,0.04)' }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 16,
          paddingVertical: 14,
          borderBottomWidth: last ? 0 : 1,
          borderBottomColor: '#f3f4f6',
        }}
      >
        <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
          {icon}
        </View>
        <Text style={{ flex: 1, fontSize: 15, fontWeight: '600', color: '#111827' }}>{label}</Text>
        <ChevronRight size={16} color="#9ca3af" />
      </View>
    </Pressable>
  );
}

// ─── Info pill ────────────────────────────────────────────────────────────────
function InfoPill({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f9fafb',
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 6,
        gap: 5,
        flex: 1,
      }}
    >
      {icon}
      <Text style={{ fontSize: 12, color: '#374151', fontWeight: '500' }} numberOfLines={1}>{label}</Text>
    </View>
  );
}
