import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { COLORS } from '@/constants/colors';
import { HomeIcon, MapPinIcon, HeartIcon, AccountIcon } from '@/components/NavIcons';
import { useAppColorScheme } from '@/hooks/useAppColorScheme';

// Business/Offer are stack screens pushed on top of a tab, not tabs
// themselves, so they don't get the Tabs navigator's bar for free — this
// replicates its look for screens the mockups show it on. Tapping jumps
// straight to that tab (replace, not push, so it behaves like a real tab
// switch rather than stacking a detail screen underneath).
export function BottomNavBar() {
  const router = useRouter();
  const colorScheme = useAppColorScheme();
  const isDark = colorScheme === 'dark';
  const iconColor = isDark ? '#8A8983' : '#B7B5AC';

  const items: { key: string; path: '/home' | '/map' | '/favourites' | '/account'; Icon: typeof HomeIcon }[] = [
    { key: 'home', path: '/home', Icon: HomeIcon },
    { key: 'map', path: '/map', Icon: MapPinIcon },
    { key: 'favourites', path: '/favourites', Icon: HeartIcon },
    { key: 'account', path: '/account', Icon: AccountIcon },
  ];

  return (
    <View
      style={[
        styles.bar,
        {
          backgroundColor: isDark ? COLORS.charcoal : COLORS.ivory,
          borderTopColor: isDark ? '#3A3A42' : '#EFEDE5',
        },
      ]}
    >
      {items.map(({ key, path, Icon }) => (
        <Pressable key={key} style={styles.item} onPress={() => router.replace(path)} hitSlop={8}>
          <Icon color={iconColor} />
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 10,
    paddingBottom: 24,
  },
  item: {
    flex: 1,
    alignItems: 'center',
  },
});
