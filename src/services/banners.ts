import { supabase } from './supabase';

export type BannerActionType = 'none' | 'categories' | 'external_link';

export interface SeasonBanner {
  id: string;
  title: string;
  message: string;
  action_type: BannerActionType;
  action_url: string | null;
  categoryIds: string[]; // populated only when action_type === 'categories'
}

/**
 * Returns the active season banner, or null if none is active. Admin
 * Portal keeps these off by default until the founder creates one and
 * flips is_active — a null return means "render nothing," never a
 * placeholder/empty card.
 */
export async function fetchActiveSeasonBanner(): Promise<SeasonBanner | null> {
  const { data, error } = await supabase
    .from('season_banners')
    .select(
      `id, title, message, action_type, action_url,
       season_banner_categories(category_id)`
    )
    .eq('is_active', true)
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return {
    id: data.id,
    title: data.title,
    message: data.message,
    action_type: data.action_type,
    action_url: data.action_url,
    categoryIds: (data.season_banner_categories ?? []).map((c: any) => c.category_id),
  };
}
