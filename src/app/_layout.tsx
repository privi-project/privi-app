import React, { useEffect, useState } from 'react';
import { View, AppState } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { NavigationBar } from 'expo-navigation-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { supabase } from '@/services/supabase';
import { useAuthStore } from '@/store/auth';
import { useThemeStore } from '@/store/theme';
import { useAppColorScheme } from '@/hooks/useAppColorScheme';
import { hasCompletedLocationSetup } from '@/utils/firstLaunch';
import { SplashAnimation } from '@/components/SplashAnimation';
import { COLORS } from '@/constants/colors';

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

  // Immersive mode (Android only — expo-navigation-bar no-ops elsewhere):
  // the system nav bar starts hidden via the expo-navigation-bar config
  // plugin (app.json), but Android can bring it back (swiping it up is
  // meant to be a temporary peek, but some OEM skins/scenarios don't
  // reliably auto-rehide it, e.g. after backgrounding). Re-asserting
  // hidden on mount and whenever the app returns to the foreground
  // matches how other apps keep it consistently minimised during use.
  // Re-enabled 2026-08-13 for the first EAS build that actually includes
  // this native module (was disabled for live Metro testing since the
  // dev-client on the test phone predated it and crashed on import).
  useEffect(() => {
    NavigationBar.setHidden(true);
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        NavigationBar.setHidden(true);
      }
    });
    return () => subscription.remove();
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

  const isDark = colorScheme === 'dark';

  return (
    // Without this, useSafeAreaInsets() (what Expo Router's Tabs bottom
    // bar and any other safe-area-aware component rely on) can't get real
    // values — confirmed real bug 2026-08-12: the bottom tab bar drew
    // flush against Android's gesture nav bar with zero clearance, making
    // the nav buttons unpressable. react-native-safe-area-context was
    // already an installed dependency but never actually used anywhere.
    <SafeAreaProvider>
      {/* expo-status-bar was also an installed-but-unused dependency —
          without an explicit <StatusBar>, the status bar's icon/text
          color never gets told to match the app's theme. This SDK
          version has no `backgroundColor` prop at all (removed — modern
          Android's edge-to-edge display draws content behind the status
          bar rather than painting it a solid color, so the "background"
          the status bar sits over is just whatever this root View's own
          backgroundColor is, set below). Likely cause of the
          light-mode-only "mismatched header area" report (2026-08-12). */}
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <View style={{ flex: 1, backgroundColor: isDark ? COLORS.charcoal : COLORS.ivory }}>
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
    </SafeAreaProvider>
  );
}
