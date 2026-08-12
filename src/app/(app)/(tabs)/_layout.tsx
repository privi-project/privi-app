import React, { useEffect } from 'react';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '@/constants/colors';
import { useAppColorScheme } from '@/hooks/useAppColorScheme';
import { HomeIcon, MapPinIcon, HeartIcon, AccountIcon } from '@/components/NavIcons';

export default function TabsLayout() {
  const colorScheme = useAppColorScheme();
  const isDark = colorScheme === 'dark';
  const insets = useSafeAreaInsets();

  // TEMPORARY diagnostic (2026-08-12) — the previous fix (wrapping the
  // root layout in SafeAreaProvider) didn't visibly resolve the bottom
  // nav bar overlapping Android's gesture bar. Expo Router's own docs
  // say SafeAreaProvider is provided automatically for Router apps, so
  // that wrapper may be redundant rather than the actual fix — logging
  // the real computed inset value here to see whether it's genuinely
  // zero (a real measurement problem) or non-zero (meaning it's being
  // computed correctly but just not applied). Check via adb logcat/
  // Metro output. Remove once the real cause is confirmed.
  useEffect(() => {
    console.log('[safe-area diag] insets:', JSON.stringify(insets));
  }, [insets]);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarActiveTintColor: COLORS.teal,
        tabBarInactiveTintColor: isDark ? '#8A8983' : '#B7B5AC',
        tabBarStyle: {
          backgroundColor: isDark ? COLORS.charcoal : COLORS.ivory,
          borderTopColor: isDark ? '#3A3A42' : '#EFEDE5',
          // Explicitly consuming the real inset value directly, rather
          // than relying on React Navigation's own automatic safe-area
          // handling (which is what should already be doing this, but
          // evidently isn't taking effect) — deterministic regardless of
          // whatever's going wrong upstream.
          height: 56 + insets.bottom,
          paddingBottom: insets.bottom,
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          tabBarIcon: ({ color }) => <HomeIcon color={color as string} />,
        }}
      />
      <Tabs.Screen
        name="map"
        options={{
          tabBarIcon: ({ color }) => <MapPinIcon color={color as string} />,
        }}
      />
      <Tabs.Screen
        name="favourites"
        options={{
          tabBarIcon: ({ color }) => <HeartIcon color={color as string} />,
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          tabBarIcon: ({ color }) => <AccountIcon color={color as string} />,
        }}
      />
    </Tabs>
  );
}
