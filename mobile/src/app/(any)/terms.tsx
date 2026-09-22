import React from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import ScreenHeader from '@/components/WebSite/Shared/ScreenHeader';
import Terms from '@/components/WebSite/Terms/Terms';

export default function TermsPage() {
  return (
    /* No ScrollView here: Terms is one itself, and a vertical scroller
       nested in another fights itself. The route only supplies the header. */
    <View style={{ flex: 1, backgroundColor: '#faf7f3' }}>
      <ScreenHeader
        onBack={() => (router.canGoBack() ? router.back() : router.push('/(tabs)'))}
        title="Terms of Service"
      />
      <Terms />
    </View>
  );
}
