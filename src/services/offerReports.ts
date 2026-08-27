import { supabase } from './supabase';

export type OfferReportReason = 'not_honoured' | 'not_as_described' | 'already_expired' | 'other';

/**
 * Reports an issue with an offer — the one narrow, deliberately-frictioned
 * exception to "members have no direct line to Privi" (Procedures Manual
 * §6). Only ever called after the member picks a specific reason from
 * OfferScreen's ActionSheet, not from a raw one-tap button, so an idle tap
 * can't fire this by accident.
 *
 * Goes through report_offer() (security definer RPC) rather than a direct
 * insert — public.offer_reports has no RLS policies, same service-role-only
 * pattern as public.notification_acknowledgements; the RPC is the one
 * sanctioned write path.
 */
export async function reportOffer(
  offerId: string,
  reason: OfferReportReason,
  note?: string,
): Promise<void> {
  const { error } = await supabase.rpc('report_offer', {
    p_offer_id: offerId,
    p_reason: reason,
    p_note: note ?? null,
  });
  if (error) throw error;
}
