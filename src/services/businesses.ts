import { supabase } from './supabase';
import { getCurrentPosition } from './location';
import { isCurrentlyLive } from './offers';
import * as Location from 'expo-location';

export interface Category {
  id: string;
  slug: string;
  label: string;
  display_order: number;
}

export type FeaturedLevel = 'none' | 'category' | 'global';

export interface BusinessCard {
  id: string;
  name: string;
  short_description: string | null;
  logo_url: string | null;
  distanceMiles: number | null;
  featuredLevel: FeaturedLevel;
}

interface Coordinates {
  latitude: number;
  longitude: number;
}

// Haversine distance in miles between two lat/long points.
function distanceInMiles(a: Coordinates, b: Coordinates): number {
  const R = 3958.8; // Earth radius in miles
  const dLat = ((b.latitude - a.latitude) * Math.PI) / 180;
  const dLon = ((b.longitude - a.longitude) * Math.PI) / 180;
  const lat1 = (a.latitude * Math.PI) / 180;
  const lat2 = (b.latitude * Math.PI) / 180;

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(h));
}

/**
 * Resolves the member's position for ranking the business feed by distance:
 * live GPS if permission is already granted (Map/Home use case), otherwise
 * their stored Preferred Area coordinates — geocoded once at first-launch
 * time (LocationSetupScreen) and persisted on profiles, so this reads them
 * directly instead of re-geocoding the postcode prefix on every Home load.
 */
export async function getMemberLocation(userId: string): Promise<Coordinates | null> {
  const { status } = await Location.getForegroundPermissionsAsync();
  if (status === 'granted') {
    try {
      return await getCurrentPosition();
    } catch {
      // fall through to preferred area
    }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('preferred_area_lat, preferred_area_lng')
    .eq('id', userId)
    .single();

  if (!profile?.preferred_area_lat || !profile?.preferred_area_lng) return null;

  return { latitude: profile.preferred_area_lat, longitude: profile.preferred_area_lng };
}

export async function fetchCategories(): Promise<Category[]> {
  const { data, error } = await supabase
    .from('categories')
    .select('id, slug, label, display_order')
    .order('display_order', { ascending: true });

  if (error) throw error;
  return data ?? [];
}

interface FetchBusinessesOptions {
  /** Any of these categories matches (OR) — a single selected category row
   * is passed as a one-element array; a season banner's action_type =
   * 'categories' can pass several at once. */
  categoryIds?: string[] | null;
  searchQuery?: string;
  memberLocation?: Coordinates | null;
  maxDistanceMiles?: number | null;
  accessibleOnly?: boolean;
  onlineOfferOnly?: boolean;
}

export async function fetchBusinesses({
  categoryIds,
  searchQuery,
  memberLocation,
  maxDistanceMiles,
  accessibleOnly,
  onlineOfferOnly,
}: FetchBusinessesOptions): Promise<BusinessCard[]> {
  const hasCategoryFilter = !!categoryIds && categoryIds.length > 0;

  let query = supabase
    .from('businesses')
    .select(
      `id, name, short_description, logo_url, featured_level, featured_at, featured_expires_at,
       business_categories!inner(category_id),
       business_locations(latitude, longitude, status, is_accessible)`
    )
    .eq('status', 'active');

  if (hasCategoryFilter) {
    query = query.in('business_categories.category_id', categoryIds!);
  }

  // accessibleOnly is no longer a SQL-level filter (2026-08-14) — is_accessible
  // moved to business_locations (a national business can have some accessible
  // sites and some that aren't), so "is this business accessible" only makes
  // sense once we know WHICH location a member would actually be matched to.
  // Filtered in JS below, after that matching happens.

  if (searchQuery && searchQuery.trim()) {
    // REAL GAP FOUND 2026-08-23: the search bar's own placeholder promised
    // "businesses, towns or categories" but the query only ever matched
    // business name + the admin-authored search_keywords tags — town and
    // category were never actually wired up. Fixed by widening this to a
    // real 4-way match: name, tag words (search_keywords — both already
    // covered by the single .or() below, straight PostgREST columns on
    // businesses itself), town (business_locations.city — ANY of a
    // business's active locations, not just its nearest one, so a chain
    // with one branch in the searched town still shows up), and category
    // (the category's own label via business_categories, so typing e.g.
    // "food" finds anything tagged Food & Drink even if neither the name
    // nor its own keywords mention food). Town and category live on
    // joined tables PostgREST can't OR across in a single query the way
    // name/search_keywords can, so those two run as their own small
    // lookups in parallel and get unioned in with the name/keyword match
    // before the main query filters on the combined id set.
    const term = searchQuery.trim().replace(/[%,]/g, '');
    const [nameOrKeywordMatch, townMatch, categoryMatch] = await Promise.all([
      supabase.from('businesses').select('id').eq('status', 'active').or(`name.ilike.%${term}%,search_keywords.ilike.%${term}%`),
      supabase.from('business_locations').select('business_id').eq('status', 'active').ilike('city', `%${term}%`),
      supabase.from('business_categories').select('business_id, categories!inner(label)').ilike('categories.label', `%${term}%`),
    ]);
    if (nameOrKeywordMatch.error) throw nameOrKeywordMatch.error;
    if (townMatch.error) throw townMatch.error;
    if (categoryMatch.error) throw categoryMatch.error;

    const matchedIds = new Set<string>([
      ...nameOrKeywordMatch.data.map((r) => r.id as string),
      ...townMatch.data.map((r: any) => r.business_id as string),
      ...categoryMatch.data.map((r: any) => r.business_id as string),
    ]);
    query = query.in('id', Array.from(matchedIds));
  }

  // Unlike accessibleOnly, this genuinely needs a second table — offers
  // aren't joined into the businesses query at all otherwise. Run it in
  // parallel with the main query since neither depends on the other.
  const onlineOffersQuery = onlineOfferOnly
    ? supabase
        .from('offers')
        .select('business_id, start_date, expiry_date')
        .eq('status', 'active')
        .in('redeem_where', ['online', 'both'])
    : null;

  const [{ data, error }, onlineOffersResult] = await Promise.all([
    query,
    onlineOffersQuery ?? Promise.resolve({ data: null, error: null }),
  ]);
  if (error) throw error;
  if (onlineOffersResult.error) throw onlineOffersResult.error;

  // A business qualifies if it has at least one active, currently-live
  // (not expired, not scheduled-for-the-future) offer redeemable online.
  const onlineOfferBusinessIds = onlineOfferOnly
    ? new Set(
        (onlineOffersResult.data ?? [])
          .filter(isCurrentlyLive)
          .map((o: any) => o.business_id as string),
      )
    : null;

  const cards: BusinessCard[] = (data ?? []).map((b: any) => {
    const activeLocations = (b.business_locations ?? []).filter(
      (loc: any) => loc.status === 'active' && loc.latitude && loc.longitude
    );

    // Nearest location to the member when we know their position (matches
    // fetchBusinessDetail's same logic) — otherwise just the first active
    // one, same fallback as before. This is also the location whose
    // is_accessible value the accessibleOnly filter below checks — a member
    // should only see a business under "Accessible" if the SPECIFIC branch
    // they'd actually be shown/directed to is accessible, not some other
    // branch of the same chain they'd never visit.
    let matchedLocation = activeLocations[0] ?? null;
    if (memberLocation && activeLocations.length > 1) {
      let best = activeLocations[0];
      let bestDist = Infinity;
      for (const loc of activeLocations) {
        const d = distanceInMiles(memberLocation, { latitude: loc.latitude, longitude: loc.longitude });
        if (d < bestDist) {
          bestDist = d;
          best = loc;
        }
      }
      matchedLocation = best;
    }

    const distanceMiles =
      memberLocation && matchedLocation
        ? distanceInMiles(memberLocation, {
            latitude: matchedLocation.latitude,
            longitude: matchedLocation.longitude,
          })
        : null;

    // A featured business whose paid term has lapsed stops boosting here
    // even if the Admin Portal record still says featured_level !== 'none'
    // — same computed-at-read-time pattern as the Admin Portal's own
    // effectiveFeaturedLevel(). The founder doesn't have to remember to
    // manually reset it the moment a term ends.
    const featuredIsLive =
      b.featured_level !== 'none' &&
      (!b.featured_expires_at || new Date(b.featured_expires_at) > new Date());

    // 'category'-tier featured only counts as featured within a
    // category-filtered view — the inner-join-with-.in() filter above
    // already guarantees every returned row belongs to one of the
    // requested categories, so no extra membership check is needed here.
    const featuredLevel: FeaturedLevel =
      featuredIsLive && b.featured_level === 'global'
        ? 'global'
        : featuredIsLive && b.featured_level === 'category' && hasCategoryFilter
          ? 'category'
          : 'none';

    return {
      id: b.id,
      name: b.name,
      short_description: b.short_description,
      logo_url: b.logo_url,
      distanceMiles,
      featuredLevel,
      _featuredAt: b.featured_at as string | null,
      _matchedLocationAccessible: matchedLocation?.is_accessible ?? false,
    } as BusinessCard & { _featuredAt: string | null; _matchedLocationAccessible: boolean };
  });

  const accessibilityFiltered = accessibleOnly
    ? cards.filter((c: any) => c._matchedLocationAccessible)
    : cards;

  // Bug fixed 2026-08-18: onlineOfferBusinessIds was computed above but
  // never actually applied — the filter chip toggled with no effect,
  // showing every business regardless of whether it had a qualifying
  // offer. This is the step that was missing.
  const onlineOfferFiltered = onlineOfferOnly
    ? accessibilityFiltered.filter((c: any) => onlineOfferBusinessIds!.has(c.id))
    : accessibilityFiltered;

  const tierRank: Record<FeaturedLevel, number> = { global: 2, category: 1, none: 0 };

  onlineOfferFiltered.sort((a: any, b: any) => {
    const tierDiff = tierRank[b.featuredLevel as FeaturedLevel] - tierRank[a.featuredLevel as FeaturedLevel];
    if (tierDiff !== 0) return tierDiff;

    if (a.featuredLevel !== 'none') {
      // Same non-none tier — newest featured_at first.
      const aTime = a._featuredAt ? new Date(a._featuredAt).getTime() : 0;
      const bTime = b._featuredAt ? new Date(b._featuredAt).getTime() : 0;
      return bTime - aTime;
    }

    // Neither featured in this view — distance order, closest first.
    if (a.distanceMiles == null) return 1;
    if (b.distanceMiles == null) return -1;
    return a.distanceMiles - b.distanceMiles;
  });

  const result = onlineOfferFiltered.map(
    ({ _featuredAt, _matchedLocationAccessible, ...card }: any) => card as BusinessCard
  );

  if (maxDistanceMiles != null) {
    return result.filter((c) => c.distanceMiles != null && c.distanceMiles <= maxDistanceMiles);
  }

  return result;
}

// Mirrors admin-portal's src/lib/locations/opening-hours.ts shape — the
// two codebases don't share code, but must agree on the jsonb layout
// stored in business_locations.opening_hours.
export interface DayHours {
  open: string;
  close: string;
  closed: boolean;
}
export type OpeningHours = Record<'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun', DayHours>;

const DAY_KEYS: (keyof OpeningHours)[] = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

function formatHour(value: string): string {
  const [h, m] = value.split(':').map(Number);
  const period = h >= 12 ? 'pm' : 'am';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return m === 0 ? `${hour12}${period}` : `${hour12}:${String(m).padStart(2, '0')}${period}`;
}

/**
 * "Open today 7:00am – 8:00pm" / "Closed today" — computed from the
 * member's local device day, not stored/kept in sync by the admin. Returns
 * null when there's no opening_hours set at all, so the Business Page can
 * skip the row entirely rather than show a misleading blank line.
 */
export function formatOpeningHoursToday(hours: OpeningHours | null): string | null {
  if (!hours) return null;
  const today = DAY_KEYS[new Date().getDay()];
  const day = hours[today];
  if (!day) return null;
  if (day.closed) return 'Closed today';
  return `Open today ${formatHour(day.open)} – ${formatHour(day.close)}`;
}

export interface BusinessLocationDetail {
  id: string;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  region: string | null;
  postcode: string | null;
  formatted_address: string | null;
  phone: string | null;
  website_url: string | null;
  latitude: number | null;
  longitude: number | null;
  opening_hours: OpeningHours | null;
  is_accessible: boolean;
}

export interface BusinessDetail {
  id: string;
  name: string;
  short_description: string | null;
  about_description: string | null;
  logo_url: string | null;
  location: BusinessLocationDetail | null;
  // Every OTHER active location besides the one shown above, sorted
  // nearest-first when the member's location is known — for the
  // Business Page's "Other locations" expandable section (2026-08-13).
  // Previously fetched and then discarded entirely; now returned.
  otherLocations: BusinessLocationDetail[];
}

/**
 * A national business can have several active locations — since the rest
 * of the app (fetchBusinesses' distance ranking) already simplifies this
 * to "one representative location," the Business Page follows the same
 * rule: nearest active location to the member if more than one, otherwise
 * whichever active location exists.
 */
export async function fetchBusinessDetail(
  id: string,
  memberLocation?: Coordinates | null
): Promise<BusinessDetail | null> {
  const { data, error } = await supabase
    .from('businesses')
    .select(
      `id, name, short_description, about_description, logo_url,
       business_locations(id, address_line1, address_line2, city, region, postcode, formatted_address, phone, website_url, opening_hours, latitude, longitude, status, is_accessible)`
    )
    .eq('id', id)
    .eq('status', 'active')
    .single();

  if (error || !data) return null;

  const activeLocations = ((data as any).business_locations ?? []).filter(
    (l: any) => l.status === 'active'
  );

  let location = activeLocations[0] ?? null;
  if (memberLocation && activeLocations.length > 1) {
    let best = activeLocations[0];
    let bestDist = Infinity;
    for (const l of activeLocations) {
      if (l.latitude == null || l.longitude == null) continue;
      const d = distanceInMiles(memberLocation, { latitude: l.latitude, longitude: l.longitude });
      if (d < bestDist) {
        bestDist = d;
        best = l;
      }
    }
    location = best;
  }

  const mapLocation = (l: any): BusinessLocationDetail => ({
    id: l.id,
    address_line1: l.address_line1,
    address_line2: l.address_line2,
    city: l.city,
    region: l.region,
    postcode: l.postcode,
    formatted_address: l.formatted_address,
    phone: l.phone,
    website_url: l.website_url,
    latitude: l.latitude,
    longitude: l.longitude,
    opening_hours: l.opening_hours,
    is_accessible: l.is_accessible,
  });

  // Every other active location, nearest-first when we know the member's
  // position (same distance math as picking the primary one above) —
  // otherwise left in whatever order Supabase returned them.
  const otherLocationsRaw = activeLocations.filter((l: any) => l.id !== location?.id);
  if (memberLocation) {
    otherLocationsRaw.sort((a: any, b: any) => {
      const da =
        a.latitude != null && a.longitude != null
          ? distanceInMiles(memberLocation, { latitude: a.latitude, longitude: a.longitude })
          : Infinity;
      const db =
        b.latitude != null && b.longitude != null
          ? distanceInMiles(memberLocation, { latitude: b.latitude, longitude: b.longitude })
          : Infinity;
      return da - db;
    });
  }

  return {
    id: (data as any).id,
    name: (data as any).name,
    short_description: (data as any).short_description,
    about_description: (data as any).about_description,
    logo_url: (data as any).logo_url,
    location: location ? mapLocation(location) : null,
    otherLocations: otherLocationsRaw.map(mapLocation),
  };
}

export interface BusinessPin {
  id: string; // location id — a national business can place several pins
  businessId: string;
  name: string;
  short_description: string | null;
  logo_url: string | null;
  latitude: number;
  longitude: number;
}

// No viewport-bounded query (yet) — with the modest number of businesses
// expected at launch, fetching every active pin once is simpler and still
// cheap. Revisit with a bounds-filtered query if the business count grows
// large enough for this to matter.
export async function fetchBusinessPins(): Promise<BusinessPin[]> {
  const { data, error } = await supabase
    .from('businesses')
    .select('id, name, short_description, logo_url, business_locations(id, latitude, longitude, status)')
    .eq('status', 'active');

  if (error) throw error;

  const pins: BusinessPin[] = [];
  (data ?? []).forEach((b: any) => {
    (b.business_locations ?? []).forEach((loc: any) => {
      if (loc.status === 'active' && loc.latitude != null && loc.longitude != null) {
        pins.push({
          id: loc.id,
          businessId: b.id,
          name: b.name,
          short_description: b.short_description,
          logo_url: b.logo_url,
          latitude: loc.latitude,
          longitude: loc.longitude,
        });
      }
    });
  });
  return pins;
}

export interface FavouriteBusinessCard {
  id: string;
  name: string;
  logo_url: string | null;
  categoryLabel: string | null;
}

// Mockup shows each favourite row with a category label ("Coffee & Drinks",
// "Restaurants", ...) rather than the short_description used on Home's
// cards — a business can belong to several categories, so this just shows
// whichever one comes back first from the join, not a definitive "primary"
// category (the schema has no such concept).
export async function fetchFavouriteBusinesses(memberId: string): Promise<FavouriteBusinessCard[]> {
  const { data, error } = await supabase
    .from('favourites')
    .select(
      `business_id,
       businesses!inner(id, name, logo_url, status,
         business_categories(categories(label)))`
    )
    .eq('member_id', memberId)
    .eq('businesses.status', 'active');

  if (error) throw error;

  return (data ?? []).map((row: any) => {
    const b = row.businesses;
    const firstCategory = b.business_categories?.[0]?.categories?.label ?? null;
    return {
      id: b.id,
      name: b.name,
      logo_url: b.logo_url,
      categoryLabel: firstCategory,
    };
  });
}

export async function fetchFavouriteIds(memberId: string): Promise<Set<string>> {
  const { data, error } = await supabase
    .from('favourites')
    .select('business_id')
    .eq('member_id', memberId);

  if (error) throw error;
  return new Set((data ?? []).map((f) => f.business_id));
}

export async function addFavourite(memberId: string, businessId: string) {
  const { error } = await supabase
    .from('favourites')
    .insert({ member_id: memberId, business_id: businessId });
  if (error) throw error;
}

export async function removeFavourite(memberId: string, businessId: string) {
  const { error } = await supabase
    .from('favourites')
    .delete()
    .eq('member_id', memberId)
    .eq('business_id', businessId);
  if (error) throw error;
}
