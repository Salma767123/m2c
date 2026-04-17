import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { LogBox } from 'react-native';
import 'react-native-reanimated';
import '../../global.css';

import { useColorScheme } from '@/hooks/use-color-scheme';

// Library-side deprecation warnings we can't fix in app code
LogBox.ignoreLogs([
  'SafeAreaView has been deprecated',
]);

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="vendors/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="vendors/[id]/inspection" options={{ headerShown: false }} />
      </Stack>
      <StatusBar style="light" backgroundColor="#000000" translucent={false} />
    </ThemeProvider>
  );
}
