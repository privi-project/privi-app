import React from 'react';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '@/constants/colors';
import { useAppColorScheme } from '@/hooks/useAppColorScheme';
import { HomeIcon, MapPinIcon, HeartIcon, AccountIcon } from '@/components/NavIcons';
import { useHomeResetStore } from '@/store/homeReset';

export default function TabsLayout() {
  const colorScheme = useAppColorScheme();
  const isDark = colorScheme === 'dark';
  const insets = useSafeAreaInsets();

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
        // Tapping the Home icon resets any active category/search/banner
        // filter back to the default feed — added 2026-08-13, member
        // report: tapping a season banner (or a category) had no way back
        // to the unfiltered homepage except manually clearing search or
        // deselecting the category. HomeScreen's own state lives inside
        // that screen, so this just signals via a tiny shared store
        // (see homeReset.ts) rather than trying to reach into it directly.
        listeners={{
          tabPress: () => {
            useHomeResetStore.getState().triggerReset();
          },
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
