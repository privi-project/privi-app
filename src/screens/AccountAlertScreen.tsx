import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator, BackHandler } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { COLORS } from '@/constants/colors';
import { useAppColorScheme } from '@/hooks/useAppColorScheme';
import { GoldGradientText } from '@/components/GoldGradient';
import { ChevronLeftIcon, BellIcon } from '@/components/NavIcons';
import { AppNotification, fetchNotificationById } from '@/services/notifications';
import { acknowledgeNotification } from '@/services/notificationAcknowledgements';
import { markNotificationSeen } from '@/services/notificationReads';

// No dedicated "danger" token in COLORS — matches the one other spot that
// needs one (PersonalInformationScreen.tsx's errorText).
const DANGER = '#D64545';

/**
 * Bigger detail view for account_alert notifications — the small popup
 * panel (NotificationPanel.tsx) doesn't have room for a document link
 * plus an action button. Fetches the notification fresh by id
 * (fetchNotificationById) rather than trusting a JSON-encoded object
 * round-tripped through route params — simpler to reason about, and
 * always shows authoritative data rather than whatever the previous
 * screen happened to have in memory.
 */
export default function AccountAlertScreen() {
  const router = useRouter();
  const colorScheme = useAppColorScheme();
  const isDark = colorScheme === 'dark';
  const { id } = useLocalSearchParams<{ id: string }>();

  const [notification, setNotification] = useState<AppNotification | null>(null);
  const [loading, setLoading] = useState(true);
  const [acknowledging, setAcknowledging] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    fetchNotificationById(id)
      .then(setNotification)
      .catch(() => setNotification(null))
      .finally(() => setLoading(false));
  }, [id]);

  // Compulsory-accept (2026-08-22, real bug found): a required
  // acknowledgement (T&Cs/price change, etc.) previously could be
  // dismissed via the back chevron, the swipe-back gesture, or Android's
  // hardware back button — none of them called acknowledgeNotification,
  // so the server-side "who accepted what, when" record never got
  // written, yet the notification still vanished (see NotificationPanel
  // .tsx's handlePress for the other half of this fix — it no longer
  // marks the notification seen just from being opened). While
  // blocksExit is true there is deliberately no way out of this screen
  // except tapping Accept — no "Deny" path either, since that needs a
  // real answer to "what happens to their account then," which is a
  // product/legal decision, not one to invent here.
  const blocksExit = !!notification?.requires_acknowledgement && !acknowledged;

  useEffect(() => {
    if (!blocksExit) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => sub.remove();
  }, [blocksExit]);

  const backgroundColor = isDark ? COLORS.charcoal : COLORS.ivory;
  const textColor = isDark ? COLORS.ivory : COLORS.charcoal;
  const subColor = isDark ? '#9CA3AF' : COLORS.mediumGray;

  const handleAccept = async () => {
    if (!notification) return;
    setError('');
    setAcknowledging(true);
    try {
      await acknowledgeNotification(notification.id);
      // Only marked seen now that acceptance is actually recorded server-
      // side — see the blocksExit comment above and NotificationPanel.tsx.
      markNotificationSeen(notification.id);
      setAcknowledged(true);
      setTimeout(() => router.back(), 600);
    } catch {
      setError('Something went wrong recording your acceptance. Please try again.');
    } finally {
      setAcknowledging(false);
    }
  };

  const handleNavigateAction = () => {
    if (notification?.action_destination === 'personal_information') {
      router.push('/personal-information');
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor }]}>
        <ActivityIndicator color={COLORS.teal} />
      </View>
    );
  }

  if (!notification) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor }]}>
        <Text style={{ color: textColor }}>This alert couldn&apos;t be opened.</Text>
        <Pressable onPress={() => router.back()} style={styles.linkRow}>
          <GoldGradientText style={styles.link}>Go back</GoldGradientText>
        </Pressable>
      </View>
    );
  }

  const buttonLabel = notification.requires_acknowledgement
    ? notification.action_label || 'I Accept'
    : notification.action_label;

  return (
    <View style={[styles.container, { backgroundColor }]}>
      {/* Blocks the swipe-back gesture while blocksExit is true — the
          hardware back button is handled separately above (BackHandler),
          and the chevron below is simply not rendered. */}
      <Stack.Screen options={{ gestureEnabled: !blocksExit }} />
      <View style={styles.header}>
        {blocksExit ? (
          <View style={styles.headerSpacer} />
        ) : (
          <Pressable hitSlop={12} onPress={() => router.back()}>
            <ChevronLeftIcon color={COLORS.gold} />
          </Pressable>
        )}
        <Text style={[styles.headerTitle, { color: textColor }]}>Account Alert</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.iconRow}>
          <BellIcon color={COLORS.gold} size={26} />
        </View>

        <Text style={[styles.title, { color: textColor }]}>{notification.title}</Text>
        <Text style={[styles.body, { color: subColor }]}>{notification.body}</Text>

        {notification.document_url && (
          <Pressable
            style={styles.linkRow}
            onPress={() => WebBrowser.openBrowserAsync(notification.document_url as string)}
          >
            <GoldGradientText style={styles.link}>Read the full document</GoldGradientText>
          </Pressable>
        )}

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {notification.requires_acknowledgement ? (
          <Pressable
            style={[styles.primaryButton, acknowledged && styles.primaryButtonDisabled]}
            onPress={handleAccept}
            disabled={acknowledging || acknowledged}
          >
            {acknowledging ? (
              <ActivityIndicator color={COLORS.ivory} />
            ) : (
              <Text style={styles.primaryButtonText}>{acknowledged ? 'Accepted' : buttonLabel}</Text>
            )}
          </Pressable>
        ) : (
          notification.action_destination &&
          buttonLabel && (
            <Pressable style={styles.primaryButton} onPress={handleNavigateAction}>
              <Text style={styles.primaryButtonText}>{buttonLabel}</Text>
            </Pressable>
          )
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
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
  iconRow: {
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 19,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 10,
  },
  body: {
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    marginBottom: 8,
  },
  errorText: {
    color: DANGER,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 12,
  },
  primaryButton: {
    backgroundColor: COLORS.teal,
    borderWidth: 1.5,
    borderColor: COLORS.gold,
    borderRadius: 12,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
  },
  primaryButtonDisabled: {
    opacity: 0.5,
  },
  primaryButtonText: {
    color: COLORS.ivory,
    fontSize: 15,
    fontWeight: '600',
  },
  linkRow: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  link: {
    fontSize: 13,
    fontWeight: '600',
  },
});
