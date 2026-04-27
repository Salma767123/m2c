import React, { useEffect, useRef, useCallback } from 'react';
import { View, Text, Pressable, Animated, StyleSheet } from 'react-native';
import { Bell, X } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(-140)).current;

  const dismiss = useCallback(() => {
    Animated.timing(translateY, {
      toValue: -140,
      duration: 250,
      useNativeDriver: true,
    }).start(() => onDismiss());
  }, [translateY, onDismiss]);

  useEffect(() => {
    if (visible) {
      Animated.spring(translateY, {
        toValue: 0,
        tension: 80,
        friction: 12,
        useNativeDriver: true,
      }).start();

      const timer = setTimeout(dismiss, autoDismissMs);
      return () => clearTimeout(timer);
    }
  }, [visible, translateY, dismiss, autoDismissMs]);

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        s.container,
        { transform: [{ translateY }], paddingTop: insets.top + 8 },
      ]}
    >
      <Pressable
        onPress={() => {
          onPress?.();
          dismiss();
        }}
        accessibilityRole="alert"
        accessibilityLabel={`${title}: ${body}`}
        style={s.card}
      >
        <View style={s.iconWrap}>
          <Bell size={20} color="#ffffff" />
        </View>
        <View style={s.textWrap}>
          <Text style={s.title} numberOfLines={1}>{title}</Text>
          <Text style={s.body} numberOfLines={2}>{body}</Text>
        </View>
        <Pressable
          onPress={dismiss}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Dismiss notification"
          style={s.closeBtn}
        >
          <X size={14} color="#94a3b8" />
        </Pressable>
      </Pressable>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    paddingHorizontal: 12,
  },
  card: {
    backgroundColor: '#0f172a',
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  textWrap: { flex: 1, marginRight: 8 },
  title: { color: '#ffffff', fontSize: 14, fontWeight: '800', marginBottom: 2 },
  body: { color: '#94a3b8', fontSize: 13, lineHeight: 18 },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
