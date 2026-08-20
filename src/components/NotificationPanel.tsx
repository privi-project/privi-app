import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  Animated,
  Easing,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { COLORS } from '@/constants/colors';
import { GoldGradientBorder } from '@/components/GoldGradient';
import { fetchMyNotifications, AppNotification } from '@/services/notifications';
import { markNotificationSeen } from '@/services/notificationReads';
import { useAppColorScheme } from '@/hooks/useAppColorScheme';

interface NotificationPanelProps {
  visible: boolean;
  onClose: () => void;
}

/**
 * Activity Panel (Privi_updated.docx Section 3.9): a dropdown overlay
 * anchored top-right from the bell, not a dedicated screen. Deliberately
 * not a "noisy notification centre" — no numeric unread badge, and no
 * server-side read/unread state (consistent with the product's "no usage
 * tracking" decision — the Admin Portal/backend never learns which
 * notifications a member has opened).
 *
 * What DOES happen (2026-08-12): tapping an individual notification here
 * removes just that one from the list, on-device only
 * (notificationReads.ts, AsyncStorage). Tapping the bell to merely VIEW
 * the list does not clear anything — only actually opening a specific
 * notification does. Once every notification in a member's targeted set
 * has been individually tapped, fetchMyNotifications() naturally returns
 * an empty list and every screen's bell dot clears itself, with no
 * special-casing needed there.
 */
export function NotificationPanel({ visible, onClose }: NotificationPanelProps) {
  const router = useRouter();
  const colorScheme = useAppColorScheme();
  const isDark = colorScheme === 'dark';

  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);

  const scale = useRef(new Animated.Value(0.85)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setLoading(true);
      fetchMyNotifications()
        .then(setNotifications)
        .catch((e) => console.error('Failed to load notifications', e))
        .finally(() => setLoading(false));

      Animated.parallel([
        Animated.timing(scale, {
          toValue: 1,
          duration: 300,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      scale.setValue(0.85);
      opacity.setValue(0);
    }
  }, [visible]);

  const bg = isDark ? COLORS.charcoal : COLORS.ivory;
  const textColor = isDark ? COLORS.ivory : COLORS.charcoal;
  const placeholderColor = isDark ? '#9CA3AF' : COLORS.mediumGray;

  const handlePress = (notification: AppNotification) => {
    // Optimistic removal from THIS panel's own list — no need to wait on
    // the AsyncStorage write. Other screens' bell dots pick up the change
    // next time they call fetchMyNotifications() themselves.
    setNotifications((prev) => prev.filter((n) => n.id !== notification.id));
    markNotificationSeen(notification.id);

    onClose();

    // 2026-08-20: account_alert gets its own bigger detail screen (small
    // popup doesn't have room for a document link + action button). Only
    // the id is passed — AccountAlertScreen fetches the notification
    // fresh via fetchNotificationById rather than trusting a JSON-
    // encoded object round-tripped through route params.
    if (notification.notification_type === 'account_alert') {
      router.push({ pathname: '/account-alert/[id]', params: { id: notification.id } });
    } else if (notification.linked_offer_id) {
      // Previously dead data — AppNotification always carried this field
      // but nothing ever read it, so an offer-type notification fell
      // through to the business-page branch below (or nowhere, if
      // linked_business_id was also unset).
      router.push(`/offer/${notification.linked_offer_id}`);
    } else if (notification.linked_business_id) {
      router.push(`/business/${notification.linked_business_id}`);
    }
    // else (e.g. announcement): no destination, matches today's existing
    // behaviour for anything with no link — just dismisses.
  };

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <View style={styles.anchor}>
          <Animated.View style={{ transform: [{ scale }], opacity }}>
            <GoldGradientBorder borderWidth={1} borderRadius={12} backgroundColor={bg} style={styles.panel}>
              {/* The tail's diagonal cut-corner is built from borderLeft/
                  borderTop on a rotated square, not a rectangular edge —
                  GoldGradientBorder's rectangular mask can't represent that,
                  so it stays flat gold rather than being force-fit. */}
              <View style={[styles.tail, { backgroundColor: bg }]} />
              <Text style={[styles.title, { color: textColor }]}>Notifications</Text>

              {loading ? (
                <ActivityIndicator style={{ padding: 20 }} color={COLORS.teal} />
              ) : notifications.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={[styles.emptyText, { color: placeholderColor }]}>
                    You're all caught up.
                  </Text>
                </View>
              ) : (
                <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
                  {notifications.map((n) => (
                    <Pressable
                      key={n.id}
                      style={styles.notificationItem}
                      onPress={() => handlePress(n)}
                    >
                      <Text style={[styles.notificationTitle, { color: textColor }]} numberOfLines={1}>
                        {n.title}
                      </Text>
                      <Text style={[styles.notificationBody, { color: placeholderColor }]} numberOfLines={2}>
                        {n.body}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              )}
            </GoldGradientBorder>
          </Animated.View>
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(47,47,55,0.25)',
  },
  anchor: {
    alignItems: 'flex-end',
    paddingTop: 96,
    paddingRight: 20,
  },
  panel: {
    width: 260,
    maxHeight: 320,
    overflow: 'hidden',
  },
  // Flat gold — see the comment above the tail's JSX for why the gradient
  // border can't apply here.
  tail: {
    position: 'absolute',
    top: -6,
    right: 20,
    width: 12,
    height: 12,
    borderLeftWidth: 1,
    borderTopWidth: 1,
    borderColor: COLORS.gold,
    transform: [{ rotate: '45deg' }],
  },
  title: {
    fontSize: 12,
    fontWeight: '600',
    padding: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(150,150,150,0.2)',
  },
  list: {
    maxHeight: 260,
  },
  notificationItem: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(150,150,150,0.15)',
  },
  notificationTitle: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 2,
  },
  notificationBody: {
    fontSize: 10,
  },
  emptyState: {
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 12,
  },
});
