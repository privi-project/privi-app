import { supabase } from './supabase';

const WEBSITE_API_URL = process.env.EXPO_PUBLIC_WEBSITE_API_URL ?? 'https://privi.info';

/**
 * Delete Account flow — same Website-owns-the-backend pattern as
 * fetchSubscriptionInfo (see subscription.ts). These call the Website's
 * /api/app/schedule-deletion and /api/app/cancel-deletion routes, which
 * set/clear profiles.deletion_requested_at (the same flag the Admin
 * Portal already surfaces on its Dashboard Action Centre) and send the
 * matching confirmation email via Resend. The App never deletes or
 * anonymises anything itself — that stays a deliberate Admin Portal
 * action, same as every other destructive action in this system.
 */
export async function scheduleAccountDeletion(): Promise<boolean> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) return false;

  const res = await fetch(`${WEBSITE_API_URL}/api/app/schedule-deletion`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.ok;
}

export async function cancelAccountDeletion(): Promise<boolean> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) return false;

  const res = await fetch(`${WEBSITE_API_URL}/api/app/cancel-deletion`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.ok;
}
