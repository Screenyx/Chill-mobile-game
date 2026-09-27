import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useSyncExternalStore } from 'react';
import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { setMusicEnabled } from '@/audio/sound';
import { useGameStore } from '@/store/gameStore';
import { colors } from '@/theme';

SplashScreen.preventAutoHideAsync().catch(() => {});

/** Attend que la sauvegarde soit rechargée depuis le stockage avant d'afficher le jeu. */
function useHydrated() {
  return useSyncExternalStore(
    (onChange) => useGameStore.persist.onFinishHydration(onChange),
    () => useGameStore.persist.hasHydrated(),
  );
}

export default function RootLayout() {
  const hydrated = useHydrated();
  const music = useGameStore((s) => s.settings.music);

  useEffect(() => {
    if (hydrated) SplashScreen.hideAsync().catch(() => {});
  }, [hydrated]);

  useEffect(() => {
    if (hydrated) setMusicEnabled(music);
  }, [hydrated, music]);

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.cream }}>
      <StatusBar style="dark" />
      {hydrated ? (
        <Stack
          screenOptions={{
            headerShown: false,
            animation: 'fade',
            contentStyle: { backgroundColor: colors.cream },
          }}
        />
      ) : (
        <View style={{ flex: 1, backgroundColor: colors.cream }} />
      )}
    </GestureHandlerRootView>
  );
}
