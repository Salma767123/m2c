import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

export default function AnyLayout() {
  return (
    <SafeAreaView
      style={{ flex: 1 }}
    >
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    />
    </SafeAreaView>
  );
}
