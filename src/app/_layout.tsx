import { DarkTheme, Stack, ThemeProvider } from 'expo-router';
import { enableAppSwitcherProtectionAsync, usePreventScreenCapture } from 'expo-screen-capture';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { Platform } from 'react-native';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  // Android: bloquea capturas/grabaciones y oculta el contenido en el
  // selector de apps recientes (FLAG_SECURE). Ver plan.md, Fase 5.
  usePreventScreenCapture();

  useEffect(() => {
    SplashScreen.hideAsync();
    // iOS no tiene FLAG_SECURE; esto pone un blur sobre el contenido al
    // pasar a background o al selector de apps.
    if (Platform.OS === 'ios') {
      void enableAppSwitcherProtectionAsync();
    }
  }, []);

  return (
    <ThemeProvider value={DarkTheme}>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(vault)" />
      </Stack>
    </ThemeProvider>
  );
}
