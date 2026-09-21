import { Redirect, Stack } from 'expo-router';
import { View } from 'react-native';

import { touch, useIsUnlocked } from '@/auth/session';

export default function VaultLayout() {
  const isUnlocked = useIsUnlocked();

  if (!isUnlocked) {
    return <Redirect href="/(auth)/unlock" />;
  }

  return (
    <View style={{ flex: 1 }} onTouchStart={touch}>
      <Stack screenOptions={{ headerShown: false }} />
    </View>
  );
}
