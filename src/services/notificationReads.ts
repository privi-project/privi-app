import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'privi_seen_notification_ids';

/**
 * Purely local, on-device "has this member tapped this specific
 * notification" tracking — never sent to or readable from the server,
 * consistent with the product's deliberate no-usage-tracking decision
 * (see the comment in NotificationPanel.tsx). This is NOT a read-receipt
 * system the Admin Portal can see; it only exists so the App itself can
 * stop re-showing something the member has already opened.
 *
 * Tapping the bell (just viewing the list) does NOT mark anything seen —
 * only tapping an individual notification does. That's a deliberate
 * product decision (2026-08-12), not an oversight.
 */
export async function getSeenNotificationIds(): Promise<Set<string>> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? new Set(parsed) : new Set();
  } catch {
    return new Set();
  }
}

export async function markNotificationSeen(id: string): Promise<void> {
  try {
    const seen = await getSeenNotificationIds();
    seen.add(id);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(seen)));
  } catch {
    // Best-effort — worst case the notification reappears next time,
    // not worth surfacing an error to the member for this.
  }
}
