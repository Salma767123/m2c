import React, { useEffect, useRef } from 'react';
import { View, TouchableOpacity, Animated } from 'react-native';
import { Bell, X } from 'lucide-react-native';
import { AppText } from '@/components/UI/AppText';
import { brand, colors, slate, radius, space } from '@/constants/design';

interface NotificationBannerProps {
  visible: boolean;
  title: string;
  body: string;
  onPress?: () => void;
  onDismiss: () => void;
  autoDismissMs?: number;
}

export default function NotificationBanner({
  visible,
  title,
  body,
  onPress,
  onDismiss,
  autoDismissMs = 5000,
}: NotificationBannerProps) {
  const translateY = useRef(new Animated.Value(-120)).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(translateY, {
        toValue: 0,
        tension: 80,
        friction: 12,
        useNativeDriver: true,
      }).start();

      const timer = setTimeout(() => {
        dismiss();
      }, autoDismissMs);

      return () => clearTimeout(timer);
    }
  }, [visible]);

  const dismiss = () => {
    Animated.timing(translateY, {
      toValue: -120,
      duration: 250,
      useNativeDriver: true,
    }).start(() => onDismiss());
  };

  if (!visible) return null;

  return (
    <Animated.View
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        transform: [{ translateY }],
      }}
    >
      <TouchableOpacity
        activeOpacity={0.95}
        onPress={() => {
          onPress?.();
          dismiss();
        }}
        style={{
          marginHorizontal: space.md,
          marginTop: 50,
          backgroundColor: slate[900],
          borderRadius: radius.lg,
          padding: space.lg,
          flexDirection: 'row',
          alignItems: 'flex-start',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.25,
          shadowRadius: 16,
          elevation: 10,
        }}
      >
        {/* Brand-red icon chip */}
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: radius.md,
            backgroundColor: brand[500],
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: space.md,
          }}
        >
          <Bell size={20} color={colors.white} />
        </View>
        <View style={{ flex: 1, marginRight: space.sm }}>
          <AppText variant="titleMd" color={colors.white} numberOfLines={1}>
            {title}
          </AppText>
          <AppText variant="bodySm" color={slate[400]} numberOfLines={2} style={{ marginTop: 2 }}>
            {body}
          </AppText>
        </View>
        <TouchableOpacity
          onPress={dismiss}
          hitSlop={10}
          style={{
            width: 28,
            height: 28,
            borderRadius: 14,
            backgroundColor: 'rgba(255,255,255,0.1)',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <X size={14} color={slate[400]} />
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  );
}
