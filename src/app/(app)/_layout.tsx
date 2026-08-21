import { Stack } from 'expo-router';

export default function AppLayout() {
  // gestureEnabled explicit rather than relying on the default (2026-08-22:
  // founder tested swipe-back on a real Android device and it did nothing —
  // rather than trace exactly why the ambient default wasn't taking effect,
  // set it explicitly here so it can't be ambiguous. Covers every screen
  // pushed on top of the tabs (Business, Offer, Personal Information,
  // Support Settings, Account Alert) — swiping between the bottom tabs
  // themselves isn't a thing on either platform, this only affects these
  // pushed detail screens. AccountAlertScreen.tsx still overrides this to
  // false for itself while a required acknowledgement is unaccepted — a
  // per-screen override always wins over this default.
  return <Stack screenOptions={{ headerShown: false, gestureEnabled: true }} />;
}
