import { supabase } from './supabase';

export interface OfferSummary {
  id: string;
  title: string;
  value_summary: string | null;
}

export interface OfferDetail {
  id: string;
  business_id: string;
  title: string;
  value_summary: string | null;
  availability: string | null;
  terms: string | null;
  redemption_method: 'discount_code' | 'barcode';
  redemption_value: string | null;
  redeem_where: 'in_store' | 'online' | 'both';
}

// RLS already restricts reads to active, unexpired offers of active
// businesses (see offers' "Anyone can view active, unexpired offers..."
// policy) — the client-side date check here is defense-in-depth, same
// pattern as location.ts's postcode shape check, not the primary guard.
function isCurrentlyLive(o: { expiry_date?: string | null; start_date?: string | null }): boolean {
  const today = new Date().toISOString().slice(0, 10);
  if (o.expiry_date && o.expiry_date < today) return false;
  if (o.start_date && o.start_date > today) return false;
  return true;
}

export async function fetchBusinessOffers(businessId: string): Promise<OfferSummary[]> {
  const { data, error } = await supabase
    .from('offers')
    .select('id, title, value_summary, expiry_date, start_date, created_at')
    .eq('business_id', businessId)
    .eq('status', 'active')
    .order('created_at', { ascending: false });

  if (error) throw error;

  return (data ?? [])
    .filter(isCurrentlyLive)
    .map((o) => ({ id: o.id, title: o.title, value_summary: o.value_summary }));
}

export async function fetchOfferDetail(offerId: string): Promise<OfferDetail | null> {
  const { data, error } = await supabase
    .from('offers')
    .select('id, business_id, title, value_summary, availability, terms, redemption_method, redemption_value, redeem_where, expiry_date, start_date')
    .eq('id', offerId)
    .eq('status', 'active')
    .single();

  if (error || !data || !isCurrentlyLive(data)) return null;

  return {
    id: data.id,
    business_id: data.business_id,
    title: data.title,
    value_summary: data.value_summary,
    availability: data.availability,
    terms: data.terms,
    redemption_method: data.redemption_method,
    redemption_value: data.redemption_value,
    redeem_where: data.redeem_where,
  };
}
