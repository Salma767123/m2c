import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  User,
  LogOut,
  Camera,
  Package,
  MapPin,
  LifeBuoy,
  ChevronRight,
  RotateCcw,
  Wallet,
} from 'lucide-react-native';
import { useConfirm } from '@/components/WebSite/Shared/ConfirmDialog';
import EmptyState from '@/components/WebSite/Shared/EmptyState';
import ScreenHeader from '@/components/WebSite/Shared/ScreenHeader';
import { useFocusEffect, useRouter } from 'expo-router';
import AccountDiscovery from './AccountDiscovery';
import ProfileTab from './ProfileTab';
import type { UserProfile } from './types';
import { showSuccessToast, showErrorToast } from '@/lib/toast-utils';
import { userAuthService } from '@/services/userAuthService';
import { userProfileService } from '@/services/userProfileService';
import { useCart } from '@/context/CartContext';
import { useWishlist } from '@/context/WishlistContext';
import { ProfileSkeleton } from '@/components/ui/Skeleton';
import { Palette, Fonts } from '@/constants/theme';
import { getRegion } from '@/lib/currency';

// Warm palette — 1:1 with the web storefront so the two clients read as the
// same product. The mobile theme's neutral ramp is cooler (slate); these warm
// grays come straight from the web Profile.tsx.
const WARM = {
  pageGround: '#faf7f3',
  cardBorder: '#efe4d8',
  rule: '#f2e9df',
  textMuted: '#5f5550',
  textSubtle: '#a89a8d',
  red: '#e01a1b',
  redDark: '#7a0f10',
  activeBg: '#fdf3f0',
  activeText: '#7a0f10',
  disabledBg: '#faf7f3',
  disabledBorder: '#eee6dc',
  disabledText: '#5f5550',
} as const;

// Firebase push notifications — fails gracefully in Expo Go
let unregisterPushNotifications: (() => Promise<void>) | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const ns = require('@/services/notificationService');
  unregisterPushNotifications = ns.unregisterPushNotifications;
} catch {
  // Firebase not available
}

// ── Phone code helpers (mirror the web's splitPhone / joinPhone) ──────────────
// Stored value is "+<code> <number>" — split for the UI, joined on save.
const splitPhone = (v?: string): { code: string; num: string } => {
  const s = (v || '').trim();
  if (s.startsWith('+')) {
    const sp = s.indexOf(' ');
    if (sp > 0) return { code: s.slice(0, sp), num: s.slice(sp + 1).trim() };
  }
  return { code: '+91', num: s };
};

const joinPhone = (code?: string, num?: string) => {
  const n = (num || '').trim();
  return n ? `${(code || '+91').trim()} ${n}` : '';
};

export default function Profile() {
  const confirm = useConfirm();
  const { clearCart } = useCart();
  const { clearWishlist } = useWishlist();
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  const [userProfile, setUserProfile] = useState<UserProfile>({
    id: '',
    title: '',
    firstName: '',
    middleName: '',
    lastName: '',
    email: '',
    phone: '',
    phoneCode: '+91',
    whatsapp: '',
    whatsappCode: '+91',
    image: '',
    gender: 'male',
    address: { addressLine1: '', city: '', state: '', zipCode: '', country: '' },
    joinDate: '',
    preferences: { newsletter: false, smsNotifications: false, emailNotifications: false },
  });
  const [editedProfile, setEditedProfile] = useState<UserProfile>(userProfile);
  const [errors, setErrors] = useState<Partial<Record<'firstName' | 'phone', string>>>({});

  const scrollRef = useRef<ScrollView>(null);
  const formYRef = useRef(0);

  const scrollToForm = () => {
    scrollRef.current?.scrollTo({ y: Math.max(0, formYRef.current - 12), animated: true });
  };

  const loadProfile = async () => {
    try {
      const res = await userProfileService.getProfile(true);
      if (res.success && res.data) {
        const d = res.data;
        const parts = (d.name || '').trim().split(' ');
        const ph = splitPhone(d.phoneNumber);
        const wa = splitPhone(d.whatsappNumber);

        const profile: UserProfile = {
          id: d.id,
          title: d.title || '',
          firstName: parts[0] || '',
          middleName: d.middleName || '',
          lastName: parts.slice(1).join(' ') || '',
          email: d.email,
          phone: ph.num,
          phoneCode: ph.code,
          whatsapp: wa.num,
          whatsappCode: wa.code,
          // Gender was hardcoded to 'male'; now read from stored value.
          gender: (d.gender as UserProfile['gender']) || 'male',
          image: d.image || '',
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

  const checkAuthAndLoad = async () => {
    try {
      const auth = await userAuthService.isAuthenticated();
      setIsAuthenticated(auth);
      if (auth) await loadProfile();
    } catch { /* ignore */ }
    finally { setIsLoading(false); }
  };

  useFocusEffect(
    React.useCallback(() => {
      checkAuthAndLoad();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []),
  );

  const router = useRouter();

  // Inline validation — returns a map of field → error message
  const validate = (): Partial<Record<'firstName' | 'phone', string>> => {
    const e: Partial<Record<'firstName' | 'phone', string>> = {};
    if (!editedProfile.firstName.trim()) {
      e.firstName = 'First name is required';
    }
    const phoneDigits = editedProfile.phone.replace(/\D/g, '');
    if (phoneDigits && phoneDigits.length < 7) {
      e.phone = 'Enter a valid phone number';
    }
    return e;
  };

  const handleEdit = () => {
    setErrors({});
    setIsEditing(true);
    // Bring the form into view so the user isn't left staring at the header
    setTimeout(scrollToForm, 220);
  };

  const handleCancel = async () => {
    const isDirty = JSON.stringify(editedProfile) !== JSON.stringify(userProfile);
    const discard = () => {
      setEditedProfile(userProfile);
      setErrors({});
      setIsEditing(false);
    };
    if (!isDirty) { discard(); return; }
    const ok = await confirm({
      title: 'Discard changes?',
      message: 'Your unsaved changes will be lost.',
      confirmLabel: 'Discard',
      cancelLabel: 'Keep Editing',
    });
    if (ok) discard();
  };

  const handleSave = async () => {
    const v = validate();
    if (Object.keys(v).length > 0) {
      setErrors(v);
      scrollToForm();
      showErrorToast('Check the form', 'Please fix the highlighted fields');
      return;
    }
    setErrors({});
    try {
      setIsSaving(true);
      const fullName = `${editedProfile.firstName} ${editedProfile.lastName}`.trim();
      // Profile update only covers personal info. Addresses are managed
      // separately in the Saved Addresses screen. Phone/WhatsApp are stored
      // with their country code prefix — join now to match the web.
      const updateData = {
        name: fullName,
        title: editedProfile.title || undefined,
        middleName: editedProfile.middleName.trim() || undefined,
        gender: editedProfile.gender,
        phoneNumber: joinPhone(editedProfile.phoneCode, editedProfile.phone),
        whatsappNumber: joinPhone(editedProfile.whatsappCode, editedProfile.whatsapp) || undefined,
      };

      const res = await userProfileService.updateProfile(updateData);

      if (res.success) {
        setUserProfile(editedProfile);
        setIsEditing(false);
        showSuccessToast('Profile Updated', 'Your profile has been updated successfully');
      } else {
        showErrorToast('Failed', res.error || 'Unable to update');
      }
    } catch (e: any) {
      showErrorToast('Failed', e.message || 'Unable to save profile');
    } finally {
      setIsSaving(false);
    }
  };

  // Mirror the new photo into the stored auth session so the sidebar avatar
  // updates instantly (same mechanism login uses on the web).
  const syncStoredImage = async (image: string) => {
    try {
      const raw = await userAuthService.getUserData();
      if (raw) {
        raw.image = image;
        await AsyncStorage.setItem('userData', JSON.stringify(raw));
      }
    } catch {
      // non-fatal — avatar will refresh on next reload
    }
  };

  const handleAvatarChange = async () => {
    if (!isEditing) return;
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        showErrorToast('Permission needed', 'We need photo access to change your profile picture.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: true,
      });

      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];

      setIsUploadingPhoto(true);
      // Build a data URL the same way the web does — the backend accepts
      // base64 image data on PUT /auth/profile.
      const dataUrl = `data:image/jpeg;base64,${asset.base64}`;
      const fullName = `${userProfile.firstName} ${userProfile.lastName}`.trim() || userProfile.email;
      const response = await userProfileService.updateProfile({ name: fullName, image: dataUrl });

      if (response.success) {
        const newImg = response.data?.image || '';
        setUserProfile((p) => ({ ...p, image: newImg }));
        setEditedProfile((p) => ({ ...p, image: newImg }));
        await syncStoredImage(newImg);
        showSuccessToast('Photo updated', 'Your profile photo has been updated successfully.');
      }
    } catch {
      showErrorToast('Upload failed', 'Unable to update your photo.');
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleLogout = async () => {
    const ok = await confirm({
      title: 'Sign out?',
      message: 'Your cart and saved items stay with your account. Sign back in any time.',
      confirmLabel: 'Sign Out',
      icon: LogOut,
    });
    if (!ok) return;

    try { await userAuthService.logout(); } catch { /* ok */ }
    await unregisterPushNotifications?.();
    await userAuthService.clearAuthData();
    clearCart();
    clearWishlist();
    showSuccessToast('Signed Out', 'You have been signed out');
    router.replace('/(tabs)');
  };

  const initials = () => {
    const f = userProfile.firstName?.charAt(0)?.toUpperCase() || '';
    const l = userProfile.lastName?.charAt(0)?.toUpperCase() || '';
    return `${f}${l}` || '?';
  };

  const memberSince = () => {
    try {
      const d = new Date(userProfile.joinDate);
      if (isNaN(d.getTime())) return 'Recently';
      return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    } catch { return 'Recently'; }
  };

  // ── Loading ─────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: WARM.pageGround }}>
        <ScreenHeader icon={User} title="My Profile" subtitle="Manage your profile and account settings" />
        <ProfileSkeleton />
      </View>
    );
  }

  // ── Not authenticated ─────────────────────────────────────────────────────
  if (!isAuthenticated) {
    return (
      <View style={{ flex: 1, backgroundColor: WARM.pageGround }}>
        <ScreenHeader icon={User} title="My Profile" subtitle="Manage your profile and account settings" />
        {/* Hand-rolled, and so missed when the app's empty states were unified:
            a grey disc instead of the brand one, and a title at weight 800 over
            the 700 file that is actually loaded. */}
        <EmptyState
          icon={User}
          title="Login Required"
          subtitle="Sign in to view and manage your profile."
          ctaLabel="Login to Continue"
          onPress={() => router.push('/(auth)/Login' as any)}
        />
      </View>
    );
  }

  // ── Main ────────────────────────────────────────────────────────────────
  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: WARM.pageGround }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScreenHeader icon={User} title="My Profile" subtitle="Manage your profile and account settings" />

      <ScrollView
        ref={scrollRef}
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        {/* Profile card — mirrors the web sidebar identity card: centred stack,
            avatar with camera overlay, name, member since. */}
        <View
          style={{
            margin: 16,
            backgroundColor: Palette.surface,
            borderRadius: 24,
            borderWidth: 1,
            borderColor: WARM.cardBorder,
            padding: 20,
            shadowColor: WARM.redDark,
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.05,
            shadowRadius: 30,
            elevation: 2,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {/* Avatar — photo when available, initials fallback like the web. */}
            <View
              style={{
                width: 72,
                height: 72,
                borderRadius: 36,
                backgroundColor: Palette.primary,
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 16,
                overflow: 'hidden',
              }}
            >
              {userProfile.image ? (
                <Image
                  source={{ uri: userProfile.image }}
                  style={{ width: '100%', height: '100%' }}
                  contentFit="cover"
                  transition={150}
                />
              ) : (
                <Text style={{ fontFamily: Fonts.heading, color: Palette.onPrimary, fontSize: 23, fontWeight: '600' }}>{initials()}</Text>
              )}
            </View>

            <View style={{ flex: 1 }}>
              {/* The web sets this name as its page h1 — `font-playfair
                  font-semibold tracking-tight text-[#1a1a1a]`. It was Outfit
                  Bold in Palette.ink (#111827), the blue-tinted neutral. */}
              <Text
                style={{
                  fontFamily: Fonts.sansSemibold,
                  // `text-[15px] font-semibold text-[#1a1a1a]`.
                  fontSize: 15,
                  fontWeight: '600',
                  color: '#1a1a1a',
                }}
              >
                {[userProfile.title, userProfile.firstName, userProfile.middleName, userProfile.lastName]
                  .map((p) => (p || '').trim())
                  .filter(Boolean)
                  .join(' ') || 'My Account'}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 4 }}>
                {/* `text-[11px] font-medium uppercase tracking-[0.1em] text-[#a89a8d]` */}
                <Text style={{ fontFamily: Fonts.sansMedium, fontSize: 11, color: '#a89a8d', textTransform: 'uppercase', letterSpacing: 1.1, fontWeight: '500', marginTop: 4 }}>
                  Member since {memberSince()}
                </Text>
              </View>
            </View>

            {/* Camera button — only visible when editing, like the web's avatar
                button that opens the pick → crop → upload flow. */}
            {isEditing && (
              <Pressable
                onPress={handleAvatarChange}
                disabled={isUploadingPhoto}
                accessibilityRole="button"
                accessibilityLabel={userProfile.image ? 'Change profile picture' : 'Add a profile picture'}
                style={{
                  position: 'absolute',
                  bottom: -4,
                  right: -4,
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  backgroundColor: Palette.primary,
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: isUploadingPhoto ? 0.6 : 1,
                }}
              >
                {isUploadingPhoto ? (
                  <ActivityIndicator size={14} color={Palette.onPrimary} />
                ) : (
                  <Camera size={16} color={Palette.onPrimary} />
                )}
              </Pressable>
            )}
          </View>
        </View>

        {/* Quick links — mirrors the web sidebar nav tabs: Orders, Addresses,
            Wishlist, Cart, Support, Contact. */}
        <View style={{ marginHorizontal: 16, marginBottom: 14, backgroundColor: Palette.surface, borderRadius: 16, borderWidth: 1, borderColor: WARM.cardBorder, overflow: 'hidden' }}>
          <MenuItem
            icon={<MapPin size={18} color={Palette.primary} />}
            label="Saved Addresses"
            onPress={() => router.push('/(any)/saved-addresses' as any)}
          />
          <MenuItem
            icon={<Package size={18} color={Palette.primary} />}
            label="Order History"
            onPress={() => router.push('/(tabs)/orders' as any)}
          />
          {/* Returns & Replacements is an INR-region feature: the web gates the
              whole tab behind `getRegion() === 'IN'` and hides it on .com. */}
          {getRegion() === 'IN' ? (
            <MenuItem
              icon={<RotateCcw size={18} color={Palette.primary} />}
              label="Returns & Replacements"
              onPress={() => router.push('/(any)/returns-replacements' as any)}
            />
          ) : null}
          <MenuItem
            icon={<Wallet size={18} color={Palette.primary} />}
            label="My Wallet"
            onPress={() => router.push('/(any)/wallet' as any)}
          />
          <MenuItem
            icon={<LifeBuoy size={18} color={Palette.primary} />}
            label="Support"
            onPress={() => router.push('/(any)/support' as any)}
            last
          />
        </View>

        {/* Profile form — Edit/Save/Cancel now live on the card header, matching
            the web ProfileTab. */}
        <View onLayout={(e) => { formYRef.current = e.nativeEvent.layout.y; }}>
          <ProfileTab
            editedProfile={editedProfile}
            setEditedProfile={(p) => {
              setEditedProfile(p);
              if (Object.keys(errors).length > 0) setErrors({});
            }}
            isEditing={isEditing}
            isSaving={isSaving}
            errors={errors}
            onEdit={handleEdit}
            onSave={handleSave}
            onCancel={handleCancel}
            onGoToAddresses={() => router.push('/(any)/saved-addresses' as any)}
          />

          {/* Two discovery rails the web shows under Profile Information:
              orders awaiting a review, and this shopper's recently viewed. */}
          <AccountDiscovery />
        </View>

        {/* Sign out */}
        <View style={{ marginHorizontal: 16, marginTop: 14 }}>
          <Pressable onPress={handleLogout} accessibilityRole="button" accessibilityLabel="Sign out">
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: Palette.surface,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: Palette.primary,
                height: 52,
                gap: 8,
              }}
            >
              <LogOut size={18} color={Palette.primary} />
              <Text style={{ fontFamily: Fonts.sansBold, fontSize: 15, fontWeight: '700', color: Palette.primary }}>Sign Out</Text>
            </View>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ─── Header ───────────────────────────────────────────────────────────────────
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
          borderBottomColor: WARM.cardBorder,
        }}
      >
        <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: Palette.primaryContainer, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
          {icon}
        </View>
        <Text style={{ fontFamily: Fonts.sansSemibold, flex: 1, fontSize: 15, fontWeight: '600', color: Palette.ink }}>{label}</Text>
        <ChevronRight size={16} color={Palette.textSubtle} />
      </View>
    </Pressable>
  );
}
