import React from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import ScreenHeader from '@/components/WebSite/Shared/ScreenHeader';
import Returns from '@/components/WebSite/Returns/Returns';

export default function ReturnsPage() {
  return (
    /* No ScrollView here: Returns is one itself, and a vertical scroller
       nested in another fights itself. The route only supplies the header. */
    <View style={{ flex: 1, backgroundColor: '#faf7f3' }}>
      <ScreenHeader
        onBack={() => (router.canGoBack() ? router.back() : router.push('/(tabs)'))}
        title="Returns & Exchanges"
      />
      <Returns />
    </View>
  );
}
