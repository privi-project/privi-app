import * as Haptics from 'expo-haptics';
import { useHapticsStore } from '@/store/haptics';

/**
 * Deliberately used at only two moments in the whole app — favouriting
 * a business, and selecting an offer to view/redeem — not on every
 * button press. Founder direction (2026-08-31): haptics used everywhere
 * read as generic and are what most people immediately disable in
 * Settings; used sparingly at a genuinely meaningful moment, they read
 * as a considered, premium touch. Matches the same "quiet, not
 * everywhere" discipline already applied to the "Privi it" copy — see
 * FavouritesScreen.tsx / HomeScreen.tsx search placeholder.
 *
 * Always Haptics.ImpactFeedbackStyle.Light — the founder was explicit
 * this should be quick and small, never strong. Reads the haptics store
 * directly (not a hook) so this can be called from plain event handlers,
 * not just component bodies.
 */
export function triggerHaptic() {
  if (!useHapticsStore.getState().enabled) return;
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {
    // Haptics aren't available on every device (e.g. some Android
    // hardware, web) — never let a missing capability throw into the
    // caller's own logic.
  });
}
