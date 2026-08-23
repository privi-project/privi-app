import { supabase } from './supabase';

export interface ReferredMember {
  id: string;
  firstName: string;
  status: 'pending' | 'rewarded';
  referredAt: string;
}

export interface ReferralSummary {
  referralCode: string | null;
  referred: ReferredMember[];
}

/**
 * A member's own code plus everyone they've referred, pending and
 * rewarded both. get_my_referrals() is a narrow RPC (not a direct table
 * query) because profiles' own RLS only lets a member read their own
 * row — see website/supabase/schema.sql for why.
 */
export async function fetchReferralSummary(userId: string): Promise<ReferralSummary> {
  const [{ data: profile }, { data: referrals }] = await Promise.all([
    supabase.from('profiles').select('referral_code').eq('id', userId).maybeSingle(),
    supabase.rpc('get_my_referrals'),
  ]);

  const referred: ReferredMember[] = (referrals ?? []).map((r: any) => ({
    id: r.referred_id,
    firstName: r.first_name,
    status: r.rewarded ? ('rewarded' as const) : ('pending' as const),
    referredAt: r.referred_at,
  }));

  return {
    referralCode: profile?.referral_code ?? null,
    referred,
  };
}
