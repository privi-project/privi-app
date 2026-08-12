import { supabase } from './supabase';
import * as Location from 'expo-location';
import { getSeenNotificationIds } from './notificationReads';

export type NotificationType = 'new_business' | 'new_offer' | 'offer_ending_soon' | 'general';

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  notification_type: NotificationType;
  linked_business_id: string | null;
  linked_offer_id: string | null;
  sent_at: string;
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
export async function fetchMyNotifications(): Promise<AppNotification[]> {
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

  // Filter out notifications this member has already individually tapped
  // open — purely local/on-device (see notificationReads.ts), not a
  // server-side read-receipt. Every screen's bell dot derives from this
  // same function, so filtering here fixes all of them at once.
  const seen = await getSeenNotificationIds();
  return (data ?? []).filter((n: AppNotification) => !seen.has(n.id));
}
