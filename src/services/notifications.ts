import { supabase } from './supabase';
import * as Location from 'expo-location';
import { getSeenNotificationIds } from './notificationReads';

// 2026-08-20: 'general' retired in favour of 'account_alert' (legal/price/
// security, always delivered) and 'announcement' (app updates etc., also
// always delivered) — 'general' stays in the union since historic rows
// can still come back from get_my_notifications, just nothing new admin-
// side creates it.
export type NotificationType =
  | 'new_business'
  | 'new_location'
  | 'new_offer'
  | 'offer_ending_soon'
  | 'account_alert'
  | 'announcement'
  | 'general';

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  notification_type: NotificationType;
  linked_business_id: string | null;
  linked_offer_id: string | null;
  sent_at: string;
  // Only meaningful for notification_type === 'account_alert' — see
  // AccountAlertScreen.tsx for how these drive the action button.
  requires_acknowledgement: boolean;
  document_url: string | null;
  action_label: string | null;
  action_destination: string | null;
}

/**
 * Calls the get_my_notifications() RPC — the only sanctioned read path into
 * public.notifications, which has zero direct RLS policies (service_role-only).
 * See supabase/notifications_rpc.sql for the function definition.
 *
 * Passes live GPS only if permission is already granted, without prompting —
 * the RPC itself decides whether to use it (only members with no stored
 * Preferred Area fall back to it; Preferred-Area members are always matched
 * against that instead, never live GPS).
 */
async function fetchEligibleNotifications(): Promise<AppNotification[]> {
  let liveLat: number | null = null;
  let liveLng: number | null = null;

  try {
    const { status } = await Location.getForegroundPermissionsAsync();
    if (status === 'granted') {
      const position = await Location.getCurrentPositionAsync({});
      liveLat = position.coords.latitude;
      liveLng = position.coords.longitude;
    }
  } catch {
    // Live location unavailable — RPC still returns non-area notifications.
  }

  const { data, error } = await supabase.rpc('get_my_notifications', {
    live_lat: liveLat,
    live_lng: liveLng,
  });

  if (error) throw error;
  return data ?? [];
}

export async function fetchMyNotifications(): Promise<AppNotification[]> {
  const eligible = await fetchEligibleNotifications();

  // Filter out notifications this member has already individually tapped
  // open — purely local/on-device (see notificationReads.ts), not a
  // server-side read-receipt. Every screen's bell dot derives from this
  // same function, so filtering here fixes all of them at once.
  const seen = await getSeenNotificationIds();
  return eligible.filter((n) => !seen.has(n.id));
}

/**
 * Fetches one specific notification fresh, by id — used by
 * AccountAlertScreen instead of trusting whatever object arrived via
 * route params. Deliberately does NOT apply the "seen" filter above
 * (unlike fetchMyNotifications): NotificationPanel already marks a
 * notification seen the moment it's tapped, before navigating here, so
 * filtering by seen status would make this always return null for the
 * exact notification it's meant to display.
 */
export async function fetchNotificationById(id: string): Promise<AppNotification | null> {
  const eligible = await fetchEligibleNotifications();
  return eligible.find((n) => n.id === id) ?? null;
}
