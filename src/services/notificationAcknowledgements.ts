import { supabase } from './supabase';

/**
 * Records that the calling member accepted a specific Account Alert —
 * used for T&Cs/price changes where the founder needs a real, timestamped
 * "who accepted what, when" record rather than inferring acceptance from
 * the member merely having opened the notification. A deliberate, scoped
 * exception to notificationReads.ts's "no server-side tracking of what a
 * member does with a notification" design — this is the ONLY thing about
 * a notification tap that's ever recorded server-side, and only for
 * account_alert rows with requires_acknowledgement = true.
 *
 * Goes through acknowledge_notification() (security definer RPC) rather
 * than a direct insert — public.notification_acknowledgements has no RLS
 * policies, same service-role-only pattern as public.notifications
 * itself; the RPC is the one sanctioned write path, matching how
 * get_my_notifications is the one sanctioned read path.
 */
export async function acknowledgeNotification(notificationId: string): Promise<void> {
  const { error } = await supabase.rpc('acknowledge_notification', {
    p_notification_id: notificationId,
  });
  if (error) throw error;
}
