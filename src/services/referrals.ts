import { supabase } from './supabase';

export interface ReferredMember {
  id: string;
  firstName: string;
  // 'capped' (2026-08-31): the friend's referral succeeded — they're a
  // real member — but no NEW reward was added for this one specifically,
  // because the referrer already had a full cycle's worth of unused
  // referral credit banked. Distinct from 'pending' (friend hasn't
  // completed their first payment yet) so the screen can explain what
  // actually happened rather than looking like a missed reward.
  status: 'pending' | 'rewarded' | 'capped';
  referredAt: string;
}

export interface ReferralSummary {
  referralCode: string | null;
  // The member's OWN plan — determines how many referral rewards they
  // can have banked at once (1 for monthly, 12 for annual, see
  // referralRewardCap below). Defaults to 'monthly' if unset (matches
  // the same fallback used server-side in membership-discount.ts).
  plan: 'monthly' | 'annual';
  referred: ReferredMember[];
}

/**
 * How many referral rewards a member can have banked at once, before
 * further referrals stop adding new ones (capped) — mirrors the
 * website's accumulation-cap logic exactly (one full cycle's worth: a
 * monthly reward already equals the whole cap, so 1; an annual reward is
 * only 1/12th of it, so up to 12 stack before the cap hits). Referring
 * itself has no limit — only how many of those referrals can be
 * rewarded at the same time.
 */
export function referralRewardCap(plan: 'monthly' | 'annual'): number {
  return plan === 'annual' ? 12 : 1;
}

/**
 * A member's own code plus everyone they've referred, pending and
 * rewarded both. get_my_referrals() is a narrow RPC (not a direct table
 * query) because profiles' own RLS only lets a member read their own
 * row — see website/supabase/schema.sql for why.
 */
export async function fetchReferralSummary(userId: string): Promise<ReferralSummary> {
  const [{ data: profile }, { data: referrals }] = await Promise.all([
    supabase.from('profiles').select('referral_code, subscription_plan').eq('id', userId).maybeSingle(),
    supabase.rpc('get_my_referrals'),
  ]);

  const referred: ReferredMember[] = (referrals ?? []).map((r: any) => ({
    id: r.referred_id,
    firstName: r.first_name,
    status: r.rewarded ? ('rewarded' as const) : r.capped ? ('capped' as const) : ('pending' as const),
    referredAt: r.referred_at,
  }));

  return {
    referralCode: profile?.referral_code ?? null,
    plan: profile?.subscription_plan === 'annual' ? 'annual' : 'monthly',
    referred,
  };
}
