import React from 'react';
import { View } from 'react-native';
import { Stack } from 'expo-router';
import Checkout from '@/components/WebSite/CheckOut/Checkout';

export default function CheckoutPage() {
  return (
    <>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />
      <View className="flex-1">
        <Checkout />
      </View>
    </>
  );
}
