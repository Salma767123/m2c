import { View, Image, TouchableOpacity, Modal, StyleSheet } from "react-native";
import { useState, useEffect } from "react";
import { Bell, User, LogOut, UserCircle, ChevronDown } from "lucide-react-native";
import AsyncStorage from '@react-native-async-storage/async-storage';
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
import { brand, colors, radius, space, elevation, danger, info } from '@/constants/design';

const UNREAD_POLL_MS = 30000;

export default function Header() {
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);

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

  // Profile photo for the avatar — fetched once on mount.
  useEffect(() => {
    let active = true;
    const loadPhoto = async () => {
      try {
        const res = await qcCheckerService.getCheckerProfile();
        if (active && res.success && res.data?.profilePhoto) {
          setProfilePhoto(res.data.profilePhoto);
        }
      } catch (error) {
        console.error('Error loading profile photo:', error);
      }
    };
    loadPhoto();
    return () => {
      active = false;
    };
  }, []);

  const handleSignOut = async () => {
    try {
      await unregisterPushNotifications();
      await AsyncStorage.removeItem('checkerID');
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
            <TouchableOpacity
              onPress={handleViewProfile}
              activeOpacity={0.7}
              style={styles.menuRow}
            >
              <View style={[styles.menuIcon, { backgroundColor: info[100], overflow: 'hidden' }]}>
                {profilePhoto ? (
                  <Image
                    source={{ uri: profilePhoto }}
                    style={{ width: '100%', height: '100%' }}
                    resizeMode="cover"
                  />
                ) : (
                  <UserCircle size={20} color={info[500]} />
                )}
              </View>
              <View style={{ flex: 1 }}>
                <AppText variant="titleMd">View Profile</AppText>
                <AppText variant="bodySm" color={colors.textMuted}>Account settings</AppText>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleSignOut}
              activeOpacity={0.7}
              style={[styles.menuRow, { borderBottomWidth: 0 }]}
            >
              <View style={[styles.menuIcon, { backgroundColor: danger[50] }]}>
                <LogOut size={20} color={danger[500]} />
              </View>
              <View style={{ flex: 1 }}>
                <AppText variant="titleMd" color={danger[500]}>Sign Out</AppText>
                <AppText variant="bodySm" color={colors.textMuted}>Logout from account</AppText>
              </View>
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
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  menuIcon: {
    width: 38,
    height: 38,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
});