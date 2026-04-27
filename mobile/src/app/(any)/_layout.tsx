import { Stack } from 'expo-router';

export default function AnyLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    />
  );
}
