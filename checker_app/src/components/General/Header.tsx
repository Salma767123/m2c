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
import NotificationsModal from './NotificationsModal';
import { AppText } from '@/components/UI/AppText';
import { brand, colors, radius, space, elevation, danger, info } from '@/constants/design';

const UNREAD_POLL_MS = 30000;

export default function Header() {
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

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
                backgroundColor: colors.white,
                borderRadius: radius.md,
                padding: 6,
                marginRight: space.md,
              }}
            >
              <Image
                source={require('../../../assets/images/logo2.png')}
                style={{ width: 56, height: 40 }}
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
              <User size={16} color={colors.white} strokeWidth={2.5} />
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
              <View style={[styles.menuIcon, { backgroundColor: info[100] }]}>
                <UserCircle size={20} color={info[500]} />
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
    width: 42,
    height: 42,
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
    gap: 4,
    height: 42,
    paddingHorizontal: 12,
    borderRadius: radius.full,
    backgroundColor: 'rgba(255,255,255,0.16)',
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
