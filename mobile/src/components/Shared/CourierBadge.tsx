import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Image } from 'expo-image';

// Renders a courier's visual badge. If the courier has an uploaded `logo`, the image
// is shown (and the code/colour badge is ignored); otherwise it falls back to the
// short code on the brand colour. Port of frontend/src/components/Shared/CourierBadge.tsx
// so the courier picker renders identically on both clients.

interface CourierBadgeLike {
  code?: string | null;
  color?: string | null;
  logo?: string | null;
  name?: string | null;
}

export default function CourierBadge({
  courier,
  size = 36,
  codeFontSize = 10,
}: {
  courier: CourierBadgeLike;
  /** Box size in points (shared by the logo image and the code badge). */
  size?: number;
  /** Font size for the code text (ignored when a logo is shown). */
  codeFontSize?: number;
}) {
  if (courier.logo) {
    return (
      <View
        style={{
          width: size,
          height: size,
          borderRadius: Math.round(size * 0.25),
          backgroundColor: '#ffffff',
          overflow: 'hidden',
        }}
      >
        <Image
          source={{ uri: courier.logo }}
          alt={courier.name || courier.code || 'Courier'}
          style={{ width: '100%', height: '100%' }}
          contentFit="contain"
        />
      </View>
    );
  }

  return (
    <View
      style={[
        styles.codeBadge,
        {
          width: size,
          height: size,
          borderRadius: Math.round(size * 0.25),
          backgroundColor: courier.color || '#1a1a1a',
        },
      ]}
    >
      <Text style={[styles.codeText, { fontSize: codeFontSize }]} numberOfLines={1}>
        {courier.code}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  codeBadge: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  codeText: {
    color: '#ffffff',
    fontWeight: '700',
  },
});
