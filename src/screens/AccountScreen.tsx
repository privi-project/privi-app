import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { COLORS } from '@/constants/colors';
import { useAppColorScheme } from '@/hooks/useAppColorScheme';
import { Wordmark } from '@/components/BrandMark';
import { GoldGradientText, GoldGradientBorder } from '@/components/GoldGradient';
import { BellIcon, AccountIcon, SettingsIcon, ChevronRightIcon, GiftIcon } from '@/components/NavIcons';
import { NotificationPanel } from '@/components/NotificationPanel';
import { SignOutModal } from '@/components/SignOutModal';
import { useNotificationDot } from '@/hooks/useNotificationDot';

export default function AccountScreen() {
  const router = useRouter();
  const colorScheme = useAppColorScheme();
  const isDark = colorScheme === 'dark';

  const [notificationsVisible, setNotificationsVisible] = useState(false);
  const { hasNotifications, refresh: refreshNotificationDot } = useNotificationDot();
  const [signOutVisible, setSignOutVisible] = useState(false);

  const backgroundColor = isDark ? COLORS.charcoal : COLORS.ivory;

  return (
    <View style={[styles.container, { backgroundColor }]}>
      <View style={styles.header}>
        {/* 2026-08-21: header icon removed (see SplashAnimation.tsx /
            HomeScreen.tsx for why) — plain 3-way flex balance instead of
            the absolute-overlay trick. */}
        <View style={styles.headerSpacer} />
        <View style={styles.headerWordmark}>
          <Wordmark size="sm" on={isDark ? 'dark' : 'light'} />
        </View>
        <Pressable
          style={styles.bellButton}
          onPress={() => setNotificationsVisible(true)}
          hitSlop={12}
        >
          <BellIcon color={COLORS.gold} />
          {hasNotifications && <View style={styles.notificationDot} />}
        </Pressable>
      </View>

      <View style={styles.cards}>
        <Pressable onPress={() => router.push('/personal-information')}>
          <GoldGradientBorder borderWidth={1.5} borderRadius={14} backgroundColor={COLORS.teal} style={styles.cardBorder}>
            <View style={styles.card}>
              <AccountIcon color={COLORS.gold} size={26} />
              <View style={styles.cardText}>
                <Text style={styles.cardTitle}>Personal Information</Text>
                <Text style={styles.cardSubtitle}>Manage your account details</Text>
              </View>
              <ChevronRightIcon color={COLORS.gold} size={20} />
            </View>
          </GoldGradientBorder>
        </Pressable>

        <Pressable onPress={() => router.push('/referrals')}>
          <GoldGradientBorder borderWidth={1.5} borderRadius={14} backgroundColor={COLORS.teal} style={styles.cardBorder}>
            <View style={styles.card}>
              <GiftIcon color={COLORS.gold} size={26} />
              <View style={styles.cardText}>
                <Text style={styles.cardTitle}>Referrals</Text>
                <Text style={styles.cardSubtitle}>Give a friend their second month free</Text>
              </View>
              <ChevronRightIcon color={COLORS.gold} size={20} />
            </View>
          </GoldGradientBorder>
        </Pressable>

        <Pressable onPress={() => router.push('/support-settings')}>
          <GoldGradientBorder borderWidth={1.5} borderRadius={14} backgroundColor={COLORS.teal} style={styles.cardBorder}>
            <View style={styles.card}>
              <SettingsIcon color={COLORS.gold} size={26} />
              <View style={styles.cardText}>
                <Text style={styles.cardTitle}>Support &amp; Settings</Text>
                <Text style={styles.cardSubtitle}>Notifications, FAQs and app settings</Text>
              </View>
              <ChevronRightIcon color={COLORS.gold} size={20} />
            </View>
          </GoldGradientBorder>
        </Pressable>
      </View>

      <View style={styles.divider} />

      <Pressable onPress={() => setSignOutVisible(true)} style={styles.signOutButton}>
        <GoldGradientText style={styles.signOutText}>Sign Out</GoldGradientText>
      </Pressable>

      <NotificationPanel
        visible={notificationsVisible}
        onClose={() => {
          setNotificationsVisible(false);
          refreshNotificationDot();
        }}
      />

      <SignOutModal visible={signOutVisible} onClose={() => setSignOutVisible(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 56,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  headerSpacer: {
    width: 24,
  },
  headerWordmark: {
    flex: 1,
    alignItems: 'center',
  },
  bellButton: {
    width: 24,
    alignItems: 'flex-end',
  },
  notificationDot: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: COLORS.gold,
  },
  cards: {
    paddingHorizontal: 20,
    gap: 16,
  },
  cardBorder: {},
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 18,
  },
  cardText: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.ivory,
    marginBottom: 2,
  },
  cardSubtitle: {
    fontSize: 12,
    color: 'rgba(247,246,242,0.85)',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: COLORS.gold,
    marginHorizontal: 20,
    marginTop: 28,
  },
  signOutButton: {
    alignItems: 'center',
    paddingVertical: 18,
  },
  signOutText: {
    fontSize: 15,
    fontWeight: '700',
  },
});
