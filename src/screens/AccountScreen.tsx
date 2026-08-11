import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { COLORS } from '@/constants/colors';
import { useAppColorScheme } from '@/hooks/useAppColorScheme';
import { BrandMark } from '@/components/BrandMark';
import { GoldGradientText, GoldGradientBorder } from '@/components/GoldGradient';
import { BellIcon, AccountIcon, SettingsIcon, ChevronRightIcon } from '@/components/NavIcons';
import { NotificationPanel } from '@/components/NotificationPanel';
import { SignOutModal } from '@/components/SignOutModal';
import { fetchMyNotifications } from '@/services/notifications';
import { useAuthStore } from '@/store/auth';

export default function AccountScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const colorScheme = useAppColorScheme();
  const isDark = colorScheme === 'dark';

  const [notificationsVisible, setNotificationsVisible] = useState(false);
  const [hasNotifications, setHasNotifications] = useState(false);
  const [signOutVisible, setSignOutVisible] = useState(false);

  const backgroundColor = isDark ? COLORS.charcoal : COLORS.ivory;

  useEffect(() => {
    if (!user) return;
    fetchMyNotifications()
      .then((n) => setHasNotifications(n.length > 0))
      .catch(() => setHasNotifications(false));
  }, [user]);

  return (
    <View style={[styles.container, { backgroundColor }]}>
      <View style={styles.header}>
        <View style={styles.headerSpacer} />
        <BrandMark size="sm" on={isDark ? 'dark' : 'light'} />
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
        onClose={() => setNotificationsVisible(false)}
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
