import { useEffect, useState } from 'react';
import { Stack, useRouter } from 'expo-router';
import { SplashHold } from '@/components/SplashHold';
import { fetchSubscriptionInfo } from '@/services/subscription';

/**
 * 2026-08-26: this group previously had zero access gating at all —
 * cancelled/past_due/expired-complimentary members had full app access
 * forever, same as someone actively paying, since nothing anywhere ever
 * checked. This is the actual enforcement point: it runs once, when a
 * member first enters (app), before any of its routes render.
 *
 * `entitled` (computed server-side in api/app/subscription, see that
 * route's own comment for the exact rule) covers both paid and
 * complimentary members with one flag, so this doesn't need to know
 * which kind of member it's looking at.
 *
 * A failed fetch (offline, brief backend hiccup) is treated as "don't
 * block" rather than "no access" — fetchSubscriptionInfo returns null on
 * any failure, never `entitled: false`, so this only ever redirects on a
 * genuine, confirmed answer. Losing app access to a network blip would be
 * a worse failure mode than occasionally letting a lapsed member browse
 * a little longer than they should.
 */
export default function AppLayout() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetchSubscriptionInfo().then((info) => {
      if (cancelled) return;
      if (info && info.entitled === false) {
        router.replace('/access-ended');
      }
      setChecking(false);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (checking) {
    return <SplashHold />;
  }

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
