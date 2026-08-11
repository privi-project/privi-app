import { supabase } from './supabase';

export interface SubscriptionInfo {
  plan: 'monthly' | 'annual' | null;
  status: string;
  renewalDate: string | null;
  paymentMethodBrand: string | null;
  paymentMethodLast4: string | null;
  portalUrl: string | null;
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
