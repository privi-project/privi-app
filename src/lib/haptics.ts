import * as Haptics from 'expo-haptics';
import { useHapticsStore } from '@/store/haptics';

/**
 * Deliberately used at only a small, chosen set of moments in the whole
 * app — not on every button press. Founder direction (2026-08-31):
 * haptics used everywhere read as generic and are what most people
 * immediately disable in Settings; used sparingly at genuinely
 * meaningful moments, they read as a considered, premium touch instead.
 * Matches the same "quiet, not everywhere" discipline already applied
 * to the "Privi it" copy seeding.
 *
 * Two distinct feel types, matching what each moment actually is:
 * - triggerHaptic(): Impact/Light — a definite, deliberate action (you
 *   favourited something). Used on all three favourite/unfavourite
 *   handlers (BusinessScreen, HomeScreen, FavouritesScreen). An earlier
 *   round also had this on selecting an offer to view — founder
 *   feedback (2026-08-31) was that one didn't land, removed.
 * - triggerTabHaptic(): Selection — the lighter, distinct feel iOS/
 *   Android already use natively for tab bars, segmented controls and
 *   pickers (UISelectionFeedbackGenerator on iOS), not the same as a
 *   deliberate action. Used on the bottom tab bar specifically because
 *   that's a well-established platform convention already, not an
 *   invented one — and deliberately the lighter of the two types since
 *   tab-switching happens far more often per session than favouriting
 *   does; using the same Impact feel there risked exactly the
 *   "everywhere" fatigue this whole feature is trying to avoid.
 *
 * Both read the haptics store directly (not a hook) so they can be
 * called from plain event handlers/listeners, not just component
 * bodies.
 */
export function triggerHaptic() {
  if (!useHapticsStore.getState().enabled) return;
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {
    // Haptics aren't available on every device (e.g. some Android
    // hardware, web) — never let a missing capability throw into the
    // caller's own logic.
  });
}

export function triggerTabHaptic() {
  if (!useHapticsStore.getState().enabled) return;
  Haptics.selectionAsync().catch(() => {});
}
