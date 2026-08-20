import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Switch, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { COLORS } from '@/constants/colors';
import { GoldGradientText } from '@/components/GoldGradient';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  HelpIcon,
  SunIcon,
  StorefrontIcon,
  TagIcon,
  BellIcon,
} from '@/components/NavIcons';
import {
  fetchNotificationPreferences,
  updateNotificationPreferences,
  NotificationPreferences,
} from '@/services/profile';
import { useAppColorScheme } from '@/hooks/useAppColorScheme';
import { useThemeStore } from '@/store/theme';
import { useAuthStore } from '@/store/auth';

const HELP_CENTRE_URL = 'https://privi.info/help';

export default function SupportSettingsScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const colorScheme = useAppColorScheme();
  const isDark = colorScheme === 'dark';
  const themeOverride = useThemeStore((s) => s.override);
  const setThemeOverride = useThemeStore((s) => s.setOverride);

  const [loading, setLoading] = useState(true);
  // Default to all-on rather than null — an unauthenticated/no-profile
  // state (shouldn't normally happen post-sign-in, but defends against it
  // anyway) should show sensible toggles, not spin forever waiting for
  // data that will never arrive.
  const [prefs, setPrefs] = useState<NotificationPreferences>({
    notify_new_businesses: true,
    notify_special_offers: true,
    notify_account_alerts: true,
  });

  const backgroundColor = isDark ? COLORS.charcoal : COLORS.ivory;
  const textColor = isDark ? COLORS.ivory : COLORS.charcoal;
  const subColor = isDark ? '#9CA3AF' : COLORS.mediumGray;

  const load = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    const data = await fetchNotificationPreferences(user.id);
    setPrefs(data);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  // "When on, the app will use light theme" per the mockup — a single
  // switch, not a three-way (System/Light/Dark) picker. Off = dark theme,
  // matching the toggle's own supporting copy exactly.
  //
  // Reads from `colorScheme` (the resolved theme actually on screen right
  // now), not `themeOverride === 'light'` directly. Until a member has
  // explicitly touched this toggle, `themeOverride` is null ("follow the
  // device"), which `themeOverride === 'light'` treats as false/off —
  // showing "dark selected" even when the device's own setting is light
  // and that's what's actually rendering. Sourcing this from the resolved
  // scheme means the switch always matches what's on screen, whether that
  // came from an explicit choice or the device default.
  const isLightOverride = colorScheme === 'light';

  const handleThemeToggle = (value: boolean) => {
    setThemeOverride(value ? 'light' : 'dark');
  };

  const handlePrefToggle = (key: keyof NotificationPreferences, value: boolean) => {
    if (!user) return;
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    updateNotificationPreferences(user.id, { [key]: value }).catch(() => {
      setPrefs(prefs);
    });
  };

  return (
    <View style={[styles.container, { backgroundColor }]}>
      <View style={styles.header}>
        <Pressable hitSlop={12} onPress={() => router.back()}>
          <ChevronLeftIcon color={COLORS.gold} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: textColor }]}>Support &amp; Settings</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <GoldGradientText style={styles.sectionHeading}>HELP</GoldGradientText>
        <Pressable style={styles.row} onPress={() => WebBrowser.openBrowserAsync(HELP_CENTRE_URL)}>
          <HelpIcon color={COLORS.gold} size={20} />
          <Text style={[styles.rowLabel, styles.rowLabelFlex, { color: textColor }]}>FAQs</Text>
          <ChevronRightIcon color={COLORS.gold} size={18} />
        </Pressable>

        <View style={styles.divider} />

        <GoldGradientText style={styles.sectionHeading}>APPEARANCE</GoldGradientText>
        <View style={styles.toggleRow}>
          <SunIcon color={COLORS.gold} size={20} />
          <View style={styles.toggleText}>
            <Text style={[styles.rowLabel, { color: textColor }]}>App Theme</Text>
            <Text style={[styles.rowSubtitle, { color: subColor }]}>
              When on, the app will use light theme
            </Text>
          </View>
          <Switch
            value={isLightOverride}
            onValueChange={handleThemeToggle}
            trackColor={{ false: '#3A3A42', true: COLORS.teal }}
            thumbColor={COLORS.ivory}
          />
        </View>

        <View style={styles.divider} />

        <GoldGradientText style={styles.sectionHeading}>NOTIFICATIONS</GoldGradientText>

        {loading ? (
          <ActivityIndicator color={COLORS.teal} style={{ marginTop: 20 }} />
        ) : (
          <>
            <ToggleRow
              icon={<StorefrontIcon color={COLORS.gold} size={20} />}
              label="New Businesses Nearby"
              subtitle="Get notified about new businesses near you"
              value={prefs.notify_new_businesses}
              onChange={(v) => handlePrefToggle('notify_new_businesses', v)}
              textColor={textColor}
              subColor={subColor}
            />
            <ToggleRow
              icon={<TagIcon color={COLORS.gold} size={20} />}
              label="Special Offers"
              subtitle="Receive alerts for special offers and discounts"
              value={prefs.notify_special_offers}
              onChange={(v) => handlePrefToggle('notify_special_offers', v)}
              textColor={textColor}
              subColor={subColor}
            />
            <ToggleRow
              icon={<BellIcon color={COLORS.gold} size={20} />}
              label="Account Alerts"
              subtitle="Legal, price, security updates and membership news — always sent, so you're never caught out"
              value
              locked
              onChange={() => {}}
              textColor={textColor}
              subColor={subColor}
            />
          </>
        )}
      </ScrollView>
    </View>
  );
}

function ToggleRow({
  icon,
  label,
  subtitle,
  value,
  onChange,
  textColor,
  subColor,
  locked,
}: {
  icon: React.ReactNode;
  label: string;
  subtitle: string;
  value: boolean;
  onChange: (v: boolean) => void;
  textColor: string;
  subColor: string;
  /** Account Alerts (legal/price/security updates) can't be switched off —
   * members must be told about these regardless of preference. Shown as a
   * locked "Always on" indicator instead of an interactive Switch. */
  locked?: boolean;
}) {
  return (
    <View style={styles.toggleRow}>
      {icon}
      <View style={styles.toggleText}>
        <Text style={[styles.rowLabel, { color: textColor }]}>{label}</Text>
        <Text style={[styles.rowSubtitle, { color: subColor }]}>{subtitle}</Text>
      </View>
      {locked ? (
        <View style={styles.lockedBadge}>
          <Text style={styles.lockedBadgeText}>Always on</Text>
        </View>
      ) : (
        <Switch
          value={value}
          onValueChange={onChange}
          trackColor={{ false: '#3A3A42', true: COLORS.teal }}
          thumbColor={COLORS.ivory}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  headerSpacer: {
    width: 24,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  sectionHeading: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
  },
  rowLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  rowLabelFlex: {
    flex: 1,
  },
  rowSubtitle: {
    fontSize: 11,
    marginTop: 2,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
  },
  toggleText: {
    flex: 1,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: COLORS.gold,
    marginVertical: 18,
  },
  lockedBadge: {
    borderWidth: 1,
    borderColor: COLORS.gold,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  lockedBadgeText: {
    color: COLORS.gold,
    fontSize: 11,
    fontWeight: '700',
  },
});
