import { supabase } from './supabase';

export interface SubscriptionInfo {
  plan: 'monthly' | 'annual' | null;
  status: string;
  renewalDate: string | null;
  paymentMethodBrand: string | null;
  paymentMethodLast4: string | null;
  portalUrl: string | null;
  deletionRequestedAt: string | null;
  /** Computed server-side (see api/app/subscription) — the single source
   * of truth for whether this member currently gets into (app) at all.
   * Covers both paid (active/past_due) and complimentary (unexpired)
   * members with one flag. */
  entitled: boolean;
  isComplimentary: boolean;
  /** Null means either not complimentary, or complimentary with no time
   * limit (grantComplimentaryAction's "leave blank for permanent") — the
   * latter has genuinely nothing to continue, since access never lapses
   * on its own. Only a time-limited complimentary member (both true and
   * this set) should ever see a "continue my membership" prompt. */
  complimentaryExpiresAt: string | null;
  /** Live referral-reward cap status (2026-08-31) — would one more
   * referral reward right now push this member's banked Stripe credit
   * over one full cycle's worth? Null when there's no Stripe customer
   * to check (never started a payment). Used by the Referrals screen so
   * it can show real current state, not just a static explanation of
   * the cap mechanic. */
  referralAtCap: boolean | null;
}

const WEBSITE_API_URL = process.env.EXPO_PUBLIC_WEBSITE_API_URL ?? 'https://privi.info';

// The App has no backend of its own — Website already owns the Stripe
// integration (secret key, webhook), so this calls its API rather than
// duplicating Stripe config here. Auth is the member's own Supabase access
// token, verified server-side; nothing sensitive is exposed to the App.
export async function fetchSubscriptionInfo(): Promise<SubscriptionInfo | null> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) return null;

  const res = await fetch(`${WEBSITE_API_URL}/api/app/subscription`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  return res.json();
}

/**
 * Used by AccessEndedScreen when a complimentary member's access has
 * lapsed and they've never held a paid subscription (no portalUrl to fall
 * back to). Returns a one-time Supabase magic link that logs their
 * EXISTING account into a real browser session on privi.info — the
 * caller must open it with Linking.openURL (the real external browser),
 * never WebBrowser.openBrowserAsync. Payment always happens on the actual
 * Privi website, never in-app or in an in-app browser overlay.
 */
export async function fetchContinueMembershipLink(): Promise<string | null> {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) return null;

  const res = await fetch(`${WEBSITE_API_URL}/api/app/continue-membership-link`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  const body = await res.json();
  return body.url ?? null;
}
