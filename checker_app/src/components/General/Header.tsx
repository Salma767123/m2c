import { View, Text, Image, TouchableOpacity, Modal } from "react-native";
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

const UNREAD_POLL_MS = 15000;

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
    // Refresh instantly when a push arrives in the foreground
    const unsub = onNotificationReceived(refresh);
    return () => {
      active = false;
      clearInterval(timer);
      unsub();
    };
  }, []);

  const handleSignOut = async () => {
    try {
      // Stop this device from receiving the checker's pushes before clearing auth
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
      <View className="bg-black border-b border-gray-800 shadow-sm" style={{ zIndex: 100 }}>
        <View className="flex-row items-center justify-between px-4 py-3">
          {/* Logo Section */}
          <View className="flex-row items-center flex-1">
            <View className="bg-white rounded-xl p-2 mr-3 border border-gray-700">
              <Image 
                source={require('../../../assets/images/logo2.png')}
                className="w-16 h-12"
                resizeMode="contain"
              />
            </View>
            <View>
              <Text className="text-xl font-bold text-white">QC Checker</Text>
              <Text className="text-xs text-gray-400">Quality Control Portal</Text>
            </View>
          </View>

          {/* Right Actions */}
          <View className="flex-row items-center gap-2">
            {/* Notification Bell */}
            <TouchableOpacity
              onPress={() => setShowNotifications(true)}
              accessibilityRole="button"
              accessibilityLabel={
                unreadCount > 0
                  ? `Notifications, ${unreadCount} unread`
                  : 'Notifications'
              }
              className="bg-white rounded-full w-10 h-10 items-center justify-center border border-gray-300"
            >
              <Bell size={18} color="#111827" strokeWidth={2.2} />
              {unreadCount > 0 && (
                <View
                  className="absolute -top-1 -right-1 bg-red-500 rounded-full min-w-[18px] h-[18px] items-center justify-center px-1 border-2 border-black"
                >
                  <Text className="text-white text-[10px] font-bold">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            {/* Profile Menu */}
            <TouchableOpacity
              onPress={() => setShowProfileMenu(!showProfileMenu)}
              className="flex-row items-center bg-white rounded-full pl-2 pr-3 py-2 border border-gray-300"
            >
              <View className="bg-black rounded-full p-1 mr-2">
                <User size={16} color="#ffffff" strokeWidth={2.5} />
              </View>
              <ChevronDown size={14} color="#111827" strokeWidth={2} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Profile Dropdown Menu - Rendered outside header */}
      {showProfileMenu && (
        <View 
          className="absolute right-4 bg-white rounded-2xl shadow-2xl border border-gray-200 w-56"
          style={{ 
            top: 70,
            zIndex: 1000,
            elevation: 10
          }}
        >
          <TouchableOpacity
            onPress={handleViewProfile}
            className="flex-row items-center px-4 py-3 border-b border-gray-100"
          >
            <View className="bg-blue-100 rounded-full p-2 mr-3">
              <UserCircle size={20} color="#2563eb" />
            </View>
            <View className="flex-1">
              <Text className="text-sm font-bold text-gray-900">View Profile</Text>
              <Text className="text-xs text-gray-500">Account settings</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleSignOut}
            className="flex-row items-center px-4 py-3"
          >
            <View className="bg-red-100 rounded-full p-2 mr-3">
              <LogOut size={20} color="#dc2626" />
            </View>
            <View className="flex-1">
              <Text className="text-sm font-bold text-red-600">Sign Out</Text>
              <Text className="text-xs text-gray-500">Logout from account</Text>
            </View>
          </TouchableOpacity>
        </View>
      )}

      {/* Overlay to close dropdown */}
      {showProfileMenu && (
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setShowProfileMenu(false)}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 999
          }}
        />
      )}

      {/* Profile Modal */}
      <Modal
        visible={showProfileModal}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setShowProfileModal(false)}
      >
        <ViewProfile onClose={() => setShowProfileModal(false)} />
      </Modal>

      {/* Notifications Modal */}
      <NotificationsModal
        visible={showNotifications}
        onClose={() => setShowNotifications(false)}
        onUnreadChange={setUnreadCount}
      />
    </>
  );
}