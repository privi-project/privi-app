import * as Location from 'expo-location';
import axios from 'axios';

// Same Geocoding API the Admin Portal already uses for business-address
// geocoding (admin-portal/src/lib/google-maps/geocode.ts) — one paid API,
// consistent architecture, no separate lookup service to maintain.
const GOOGLE_GEOCODE_BASE = 'https://maps.googleapis.com/maps/api/geocode/json';

export async function requestForegroundLocationPermission(): Promise<boolean> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  return status === 'granted';
}

export async function getCurrentPosition() {
  const position = await Location.getCurrentPositionAsync({});
  return {
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
  };
}

interface PostcodePrefixResult {
  valid: boolean;
  prefix?: string;
  latitude?: number;
  longitude?: number;
  formattedArea?: string;
}

// Loose shape check only — 2-4 chars, letters then a digit (SE25, N3,
// TN1, LS1). Not trying to fully validate UK postcode grammar here; the
// real safety net is the `types` check below, since Google will still
// return a confident-looking result for genuinely malformed input.
const OUTWARD_CODE_SHAPE = /^[A-Z]{1,2}[0-9][A-Z0-9]?$/;

/**
 * Validates a UK postcode PREFIX (outward code only, e.g. "SE25" not
 * "SE25 4XX") against the live Google Geocoding API and resolves it to a
 * general area + coordinates.
 *
 * Outward-only lookups behave differently from full-postcode ones —
 * tested directly against the live API before shipping this: a plain
 * free-text query for a short alpha-numeric code can collide with
 * unrelated places. Confirmed example: address="M1" resolves to the M1
 * *motorway* (types: ["route"]), not Manchester's M1 postal district.
 *
 * Fixed by querying with `components=postal_code:X|country:GB` instead
 * of a free-text `address` — this asks Google structurally for "the place
 * whose postal_code component is X", which only matches actual postcodes
 * (roads don't have a postal_code component equal to their name), rather
 * than doing a general place search that a road name can win. Re-tested
 * with this fix: "M1" now correctly resolves to Manchester with the
 * proper postal_code_prefix type. The type check below is kept as a
 * defense-in-depth safety net, not the primary fix.
 */
export async function validatePostcodePrefix(prefix: string): Promise<PostcodePrefixResult> {
  const normalized = prefix.trim().toUpperCase();

  if (!OUTWARD_CODE_SHAPE.test(normalized)) {
    return { valid: false };
  }

  const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    console.error('Missing EXPO_PUBLIC_GOOGLE_MAPS_API_KEY');
    return { valid: false };
  }

  try {
    const { data } = await axios.get(GOOGLE_GEOCODE_BASE, {
      params: {
        components: `postal_code:${normalized}|country:GB`,
        key: apiKey,
      },
    });

    if (data.status !== 'OK' || !data.results?.[0]) {
      return { valid: false };
    }

    const result = data.results[0];
    const isPostcodeMatch =
      result.types?.includes('postal_code') || result.types?.includes('postal_code_prefix');

    if (!isPostcodeMatch) {
      return { valid: false };
    }

    return {
      valid: true,
      prefix: normalized,
      latitude: result.geometry.location.lat,
      longitude: result.geometry.location.lng,
      formattedArea: result.formatted_address,
    };
  } catch {
    return { valid: false };
  }
}
