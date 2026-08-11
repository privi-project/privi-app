import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { supabase } from '@/services/supabase';
import { useAuthStore } from '@/store/auth';
import { useThemeStore } from '@/store/theme';
import { useAppColorScheme } from '@/hooks/useAppColorScheme';
import { hasCompletedLocationSetup } from '@/utils/firstLaunch';
import { SplashAnimation } from '@/components/SplashAnimation';

// Keep the native splash (static image) visible until our JS splash
// animation is ready to take over — see src/components/SplashAnimation.tsx
// for the actual branded animation shown on top.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const router = useRouter();
  const colorScheme = useAppColorScheme();
  const setSession = useAuthStore((s) => s.setSession);
  const setUser = useAuthStore((s) => s.setUser);
  const setLoading = useAuthStore((s) => s.setLoading);
  const hydrateTheme = useThemeStore((s) => s.hydrate);

  // Owned here (not inside Welcome/Home) because it needs to visually
  // persist across the actual navigation to Home — a screen-local overlay
  // would unmount along with its screen the moment router.replace fires.
  const [overlayVisible, setOverlayVisible] = useState(false);

  useEffect(() => {
    hydrateTheme();
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      SplashScreen.hideAsync();

      if (session?.user) {
        // Navigate immediately so Home starts mounting/loading right away
        // — the overlay plays on top of whatever's underneath and covers
        // the transition, then fades to reveal it once ready.
        const alreadySetUp = await hasCompletedLocationSetup(session.user.id);
        router.replace(alreadySetUp ? '/home' : '/location-setup');
        setOverlayVisible(true);
      }
    });

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  return (
    <View style={{ flex: 1 }}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(app)" />
      </Stack>

      {overlayVisible && (
        <SplashAnimation
          destination="home"
          theme={colorScheme === 'dark' ? 'dark' : 'light'}
          onComplete={() => setOverlayVisible(false)}
        />
      )}
    </View>
  );
}
