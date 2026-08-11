import { supabase } from './supabase';

const WEBSITE_API_URL = process.env.EXPO_PUBLIC_WEBSITE_API_URL ?? 'https://privi.info';

/**
 * Sends the "deletion request received" confirmation email — same
 * Website-owns-the-backend pattern as fetchSubscriptionInfo (see
 * subscription.ts): the App has no email-sending capability of its own,
 * so this calls the Website's Resend integration instead of duplicating
 * it here.
 *
 * NOT yet wired into an actual "Delete Account" action anywhere in the
 * App — that flow doesn't exist yet (checked 2026-08-11, no delete-
 * account UI/logic found). Call this once, at the point that flow
 * actually schedules a deletion, whenever it's built. This function only
 * sends the email; it does not itself schedule or perform any deletion.
 */
export async function sendAccountDeletionEmail(): Promise<boolean> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) return false;

  const res = await fetch(`${WEBSITE_API_URL}/api/app/account-deletion-email`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.ok;
}
