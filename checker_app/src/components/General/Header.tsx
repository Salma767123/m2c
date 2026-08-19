import { View, Image, TouchableOpacity, Modal, StyleSheet } from "react-native";
import { useState, useEffect } from "react";
import { Bell, User, LogOut, UserCircle, ChevronDown } from "lucide-react-native";
import { router } from 'expo-router';
import { ViewProfile } from './ViewProfile';
import {
  unregisterPushNotifications,
  fetchUnreadCount,
  onNotificationReceived,
} from '@/services/notificationService';
import qcCheckerService from '../../services/qcCheckerService';
import NotificationsModal from './NotificationsModal';
import { AppText } from '@/components/UI/AppText';
import { formatCheckerName } from '@/components/Vendor/Steps/fieldHelpers';
import { brand, colors, radius, space, elevation, danger } from '@/constants/design';

const UNREAD_POLL_MS = 30000;

export default function Header() {
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  // Falls back to the role until the cached login payload is read — the menu
  // should never open with an empty name where the identity is meant to be.
  const [checkerName, setCheckerName] = useState('Quality Inspector');

  useEffect(() => {
    let active = true;
    const refresh = async () => {
      const count = await fetchUnreadCount();
      if (active) setUnreadCount(count);
    };
    refresh();
    const timer = setInterval(refresh, UNREAD_POLL_MS);
    const unsub = onNotificationReceived(refresh);
    return () => {
      active = false;
      clearInterval(timer);
      unsub();
    };
  }, []);

  // Identity for the avatar + menu. The cached login payload paints immediately;
  // the profile fetch then overwrites it, so an admin's edit to the name, title
  // or photo shows up without the checker having to sign out and back in.
  useEffect(() => {
    let active = true;
    const loadIdentity = async () => {
      try {
        const cached = await qcCheckerService.getCheckerData();
        if (active && cached) {
          const cachedName = formatCheckerName(cached);
          if (cachedName) setCheckerName(cachedName);
          if (cached.profilePhoto) setProfilePhoto(cached.profilePhoto);
        }

        const res = await qcCheckerService.getCheckerProfile();
        if (!active || !res.success || !res.data) return;
        const fresh = res.data;
        const freshName = formatCheckerName(fresh);
        if (freshName) setCheckerName(freshName);
        if (fresh.profilePhoto) setProfilePhoto(fresh.profilePhoto);
      } catch (error) {
        console.error('Error loading checker profile:', error);
      }
    };
    loadIdentity();
    return () => {
      active = false;
    };
  }, []);

  const handleSignOut = async () => {
    try {
      await unregisterPushNotifications();
      // Clear the token and cached checker record too, not just the ID — the
      // menu now shows the cached name and photo, and leaving them behind means
      // the next person to sign in on this device sees the previous checker.
      await qcCheckerService.clearCheckerAuth();
      setShowProfileMenu(false);
      router.replace('/Login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleViewProfile = () => {
    setShowProfileMenu(false);
    setShowProfileModal(true);
  };

  return (
    <>
      <View style={{ backgroundColor: brand[500], zIndex: 100 }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: space.lg,
            paddingVertical: space.md,
          }}
        >
          {/* Logo + title */}
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
            <View
              style={{
                width: 44,
                height: 44,
                backgroundColor: colors.white,
                borderRadius: radius.full,
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                marginRight: space.md,
              }}
            >
              <Image
                source={require('../../../assets/images/m2c-logo.png')}
                style={{ width: 36, height: 36 }}
                resizeMode="contain"
              />
            </View>
            <View>
              <AppText variant="headlineSm" color={colors.white}>QC Checker</AppText>
              <AppText variant="labelSm" color={brand[100]} style={{ textTransform: 'uppercase' }}>
                Quality Control Portal
              </AppText>
            </View>
          </View>

          {/* Right actions */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
            {/* Notification bell */}
            <TouchableOpacity
              onPress={() => setShowNotifications(true)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'}
              style={styles.iconBtn}
            >
              <Bell size={20} color={colors.white} strokeWidth={2.2} />
              {unreadCount > 0 && (
                <View style={styles.badge}>
                  <AppText variant="labelSm" color={colors.white} style={{ fontSize: 10, lineHeight: 12 }}>
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </AppText>
                </View>
              )}
            </TouchableOpacity>

            {/* Profile */}
            <TouchableOpacity
              onPress={() => setShowProfileMenu(!showProfileMenu)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Account menu"
              style={styles.profileBtn}
            >
              <View style={styles.avatar}>
  {profilePhoto ? (
    <Image
      source={{ uri: profilePhoto }}
      style={{ width: '100%', height: '100%' }}
      resizeMode="cover"
    />
  ) : (
    <User size={20} color={colors.white} strokeWidth={2.5} />
  )}
</View>
              <ChevronDown size={14} color={colors.white} strokeWidth={2} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Profile dropdown */}
      {showProfileMenu && (
        <>
          <TouchableOpacity
            activeOpacity={1}
            onPress={() => setShowProfileMenu(false)}
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 999 }}
          />
          <View
            style={[
              {
                position: 'absolute',
                right: space.lg,
                top: 66,
                width: 224,
                backgroundColor: colors.surface,
                borderRadius: radius.lg,
                borderWidth: 1,
                borderColor: colors.border,
                zIndex: 1000,
                overflow: 'hidden',
              },
              elevation.dropdown,
            ]}
          >
            {/* Who is signed in — the menu opens on the account it belongs to,
                the way web does, instead of a generic "View Profile" label.
                Still the way into the profile screen. */}
            <TouchableOpacity
              onPress={handleViewProfile}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={`View profile for ${checkerName}`}
              style={styles.identityRow}
            >
              <View style={styles.identityAvatar}>
                {profilePhoto ? (
                  <Image
                    source={{ uri: profilePhoto }}
                    style={{ width: '100%', height: '100%' }}
                    resizeMode="cover"
                  />
                ) : (
                  <UserCircle size={20} color={colors.textMuted} />
                )}
              </View>
              <View style={{ flex: 1 }}>
                <AppText variant="titleMd" numberOfLines={1}>{checkerName}</AppText>
                <AppText variant="bodySm" color={colors.textMuted}>QC Checker</AppText>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleSignOut}
              activeOpacity={0.7}
              accessibilityRole="button"
              style={styles.signOutRow}
            >
              <LogOut size={16} color={colors.textMuted} />
              <AppText variant="titleMd">Sign out</AppText>
            </TouchableOpacity>
          </View>
        </>
      )}

      {/* Profile modal */}
      <Modal
        visible={showProfileModal}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setShowProfileModal(false)}
      >
        <ViewProfile onClose={() => setShowProfileModal(false)} />
      </Modal>

      {/* Notifications modal */}
      <NotificationsModal
        visible={showNotifications}
        onClose={() => setShowNotifications(false)}
        onUnreadChange={setUnreadCount}
      />
    </>
  );
}

const styles = StyleSheet.create({
iconBtn: {
  width: 48,
  height: 48,
  borderRadius: radius.full,
  backgroundColor: 'rgba(255,255,255,0.16)',
  alignItems: 'center',
  justifyContent: 'center',
},
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: radius.full,
    backgroundColor: danger[500],
    borderWidth: 2,
    borderColor: brand[500],
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileBtn: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 6,
  height: 48,
  paddingLeft: 6,
  paddingRight: 10,
  borderRadius: radius.full,
  backgroundColor: 'rgba(255,255,255,0.16)',
},
avatar: {
  width: 36,
  height: 36,
  borderRadius: radius.full,
  overflow: 'hidden',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: 'rgba(255,255,255,0.2)',
},
  // Identity block sits on a tinted strip so it reads as a header for the menu
  // rather than as another action (mirrors web's bg-slate-50/50 row).
  identityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: space.md,
    paddingVertical: space.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surfaceMuted,
  },
  identityAvatar: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#f1f5f9',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  signOutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: space.md,
    paddingVertical: space.md,
  },
});