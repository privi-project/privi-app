import { supabase } from './supabase';

export interface AppLinks {
  helpFaqUrl: string | null;
  privacyPolicyUrl: string | null;
  termsUrl: string | null;
  supportEmail: string | null;
}

// Hardcoded fallback — only used if the fetch fails (offline, RLS/grant
// misconfigured, row missing) so a link never silently goes dead. The
// Admin Portal's Settings page (App Data → Settings) is the real,
// live-editable source once this fetch is working; these values just
// stop a broken network call from breaking a button.
//
// subscriptionTermsUrl/memberRulesUrl/referralTermsUrl were removed
// 2026-08-26 — Subscription Terms, Members' Rules and Referral Programme
// Terms were all folded into Terms & Conditions as sections, so every
// screen that used to link to one of those now links to termsUrl
// instead (see ReferralsScreen.tsx).
const FALLBACK: AppLinks = {
  helpFaqUrl: 'https://privi.info/help',
  privacyPolicyUrl: 'https://privi.info/legal/privacy-policy',
  termsUrl: 'https://privi.info/legal/terms-and-conditions',
  supportEmail: null,
};

/**
 * Reads the App's outbound links live from the Admin Portal's Settings
 * (system_settings, via the public.app_links view — see admin-portal's
 * schema.sql for why a view rather than the table directly). Falls back
 * to the last-known-good hardcoded URLs on any failure, field by field,
 * so one missing/null column doesn't take down links that did load.
 */
export async function fetchAppLinks(): Promise<AppLinks> {
  const { data, error } = await supabase.from('app_links').select('*').maybeSingle();

  if (error || !data) {
    return FALLBACK;
  }

  return {
    helpFaqUrl: data.help_faq_url ?? FALLBACK.helpFaqUrl,
    privacyPolicyUrl: data.privacy_policy_url ?? FALLBACK.privacyPolicyUrl,
    termsUrl: data.terms_url ?? FALLBACK.termsUrl,
    supportEmail: data.support_email ?? FALLBACK.supportEmail,
  };
}
