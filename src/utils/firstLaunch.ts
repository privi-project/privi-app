import AsyncStorage from '@react-native-async-storage/async-storage';

// Local-only marker that the one-time Location Permission / Preferred Area
// flow has run for this user on this device. Not synced to the backend —
// GPS-granted members never populate profiles.preferred_area (by design),
// so there's no server-side field to detect "already completed" from.
// A reinstall re-triggers the flow once; that's an acceptable, idempotent UX.
const KEY_PREFIX = 'privi_location_setup_complete_';

export async function hasCompletedLocationSetup(userId: string): Promise<boolean> {
  const value = await AsyncStorage.getItem(KEY_PREFIX + userId);
  return value === 'true';
}

export async function markLocationSetupComplete(userId: string): Promise<void> {
  await AsyncStorage.setItem(KEY_PREFIX + userId, 'true');
}
