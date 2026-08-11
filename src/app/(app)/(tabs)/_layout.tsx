import React from 'react';
import { Tabs } from 'expo-router';
import { COLORS } from '@/constants/colors';
import { useAppColorScheme } from '@/hooks/useAppColorScheme';
import { HomeIcon, MapPinIcon, HeartIcon, AccountIcon } from '@/components/NavIcons';

export default function TabsLayout() {
  const colorScheme = useAppColorScheme();
  const isDark = colorScheme === 'dark';

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
