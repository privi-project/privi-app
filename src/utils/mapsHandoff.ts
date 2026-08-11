import { Platform, Linking } from 'react-native';

const webFallbackUrl = (lat: number, lng: number) =>
  `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;

/**
 * Hands off to the device's native navigation app — Privi never calculates
 * routes itself (see app_map_directions_enhancement memory). Apple Maps on
 * iOS, Google Maps (or whatever the user has set as default) on Android via
 * a geo: intent, falling back to the Google Maps web directions URL
 * anywhere neither scheme is available (incl. this app's own web preview).
 */
export async function openDirections(lat: number, lng: number, label?: string) {
  const encodedLabel = label ? encodeURIComponent(label) : '';
  const url =
    Platform.OS === 'ios'
      ? `maps://app?daddr=${lat},${lng}${label ? `&q=${encodedLabel}` : ''}`
      : Platform.OS === 'android'
        ? `geo:${lat},${lng}?q=${lat},${lng}(${encodedLabel})`
        : webFallbackUrl(lat, lng);

  try {
    const supported = await Linking.canOpenURL(url);
    await Linking.openURL(supported ? url : webFallbackUrl(lat, lng));
  } catch {
    await Linking.openURL(webFallbackUrl(lat, lng));
  }
}
