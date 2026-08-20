import { supabase } from './supabase';

export interface Profile {
  first_name: string;
  last_name: string;
  preferred_area: string | null;
}

export async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('first_name, last_name, preferred_area')
    .eq('id', userId)
    .single();

  if (error) return null;
  return data;
}

export interface ProfileUpdate {
  first_name: string;
  last_name: string;
  preferred_area?: string;
  preferred_area_lat?: number;
  preferred_area_lng?: number;
}

export async function updateProfile(userId: string, update: ProfileUpdate) {
  const { error } = await supabase.from('profiles').update(update).eq('id', userId);
  if (error) throw error;
}

// 2026-08-20: notify_membership_updates dropped from here — "Membership
// Updates" folded into Account Alerts (one less toggle, and membership
// news is exactly the kind of thing that should always reach the member
// rather than being switchable off). The column itself stays in the
// profiles table, just unused — not worth a destructive migration for.
export interface NotificationPreferences {
  notify_new_businesses: boolean;
  notify_special_offers: boolean;
  notify_account_alerts: boolean;
}

// notify_new_businesses/notify_special_offers are now enforced on the
// delivery side (get_my_notifications in notifications_rpc.sql, App
// repo) — notify_account_alerts still isn't and never will be, since
// Account Alerts must always be delivered regardless of this stored
// value (SupportSettingsScreen.tsx renders it as a locked "Always on"
// row, not a real Switch). Fetch defaults to all-on if the migration
// hasn't been run yet (columns missing), rather than erroring the whole
// Settings page.
export async function fetchNotificationPreferences(
  userId: string
): Promise<NotificationPreferences> {
  const { data, error } = await supabase
    .from('profiles')
    .select('notify_new_businesses, notify_special_offers, notify_account_alerts')
    .eq('id', userId)
    .single();

  if (error || !data) {
    return {
      notify_new_businesses: true,
      notify_special_offers: true,
      notify_account_alerts: true,
    };
  }
  return data;
}

export async function updateNotificationPreferences(
  userId: string,
  update: Partial<NotificationPreferences>
) {
  const { error } = await supabase.from('profiles').update(update).eq('id', userId);
  if (error) throw error;
}
