// Easing function used throughout the app
export const PRIVI_EASE = 'cubic-bezier(0.45, 0, 0.2, 1)';

// Splash Screen Animation Timings — choreographed per user review
// (2026-07-27, refined same day; wordmark reveal direction changed
// 2026-08-20, see SplashAnimation.tsx): starting icon fills 20% (now 15%)
// of screen height, shrinks to final size, wordmark reveals downward
// below the icon (not sideways — see SplashAnimation.tsx's comments on
// why), then for 'welcome' the assembled pair moves up with motto reveal
// and background transitions overlapping into buttons fade-in; for
// 'home' it skips the motto and instead shrinks+aligns onto Home's real
// header wordmark, then the icon alone continues off-screen as the
// overlay fades (stage4Home*/stage4HomeContinue* below).
//
// Each stage's start is pulled STAGE_OVERLAP earlier than the previous
// stage's nominal end, so motion reads as one continuous, fluid gesture
// instead of separate stop-start moves — durations are unchanged, only
// the start times overlap. Stage 5 (buttons) is deliberately NOT pulled
// earlier — it stays anchored to stage 4's nominal end so it keeps
// finishing exactly together with the background transition, a
// relationship that was specifically requested and confirmed good.
const STAGE_OVERLAP = 150;

const stage2End = 1000 + 750;
// 2026-08-12: stage3 (wordmark width growth) NO LONGER overlaps stage2
// (icon shrink) — confirmed live on a real device that the wordmark
// wasn't animating progressively at all, just snapping to fully-revealed
// once the whole sequence finished, despite the images themselves
// loading fine (ruled out via onLoad/onError diagnostics) and the
// animation timer firing correctly (ruled out via a stage3 console.log).
// Both stage2 and stage3 animate LAYOUT-affecting properties (height and
// width respectively) on sibling elements in the same flexDirection:row
// container — Android's layout engine appears to drop/batch the
// wordmark's progressive width updates when both are running
// simultaneously (the 150ms overlap window). Starting stage3 only once
// stage2 has fully finished removes that contention. Adds 150ms to the
// total sequence (~3.7s -> ~3.85s), imperceptible.
const stage3Start = stage2End;
const stage3End = stage3Start + 750;
// 2026-08-12: stage4 (lockup translateY + motto) also no longer overlaps
// stage3 (wordmark fade). Same category of issue as the stage2/stage3
// fix above, but parent-child rather than sibling-sibling — the lockup
// (an ANCESTOR of the wordmark) was being transformed at the same
// moment the wordmark itself was trying to fade in via the native
// driver. Untested whether this is actually the cause; removing the
// overlap here is cheap and low-risk regardless. Adds another 150ms to
// the total sequence.
const stage4Start = stage3End;
const stage4End = stage4Start + 1000;

export const SPLASH_ANIMATION = {
  // Stage 1: Hold — teal background, icon alone at 20% of screen height, centred
  stage1Hold: 1000,

  // Stage 2: Icon shrinks to final size, staying centred
  stage2Duration: 750,
  stage2Start: 1000,

  // Stage 3: Wordmark grows out of the icon to the right — starts slightly
  // before the shrink's tail end
  stage3Duration: 750,
  stage3Start: stage3Start,

  // Stage 4: Lockup slides up, motto reveals (gold gradient) — starts
  // slightly before the wordmark-grow's tail end
  stage4Duration: 1000,
  stage4Start: stage4Start,

  // Background transition — starts with stage 4, runs longer, overlapping
  // into the buttons stage so both finish together.
  bgDuration: 1500,
  bgStart: stage4Start,

  // Stage 5: Buttons fade in, anchored to stage 4's nominal end (not
  // overlap-shifted) so it keeps finishing exactly with the background
  // transition: stage4Start + bgDuration === stage4End + stage5Duration.
  stage5Duration: 500,
  stage5Start: stage4End,

  totalDuration: stage4Start + 1500,

  // 'home' destination only (already-signed-in path) — redesigned again
  // 2026-08-22 (3rd redesign; supersedes the pure-translateY, no-resize
  // version from 2026-08-21 — see SplashAnimation.tsx's file-level
  // comment for the full history). Home never shows the motto (explicit
  // founder call, 2026-08-21) — it skips straight from stage 3's
  // wordmark reveal into these two final stages, so the home path never
  // gets much longer than it already was.
  //
  // Stage 4Home ("shrink+align"): the whole assembled lockup (icon +
  // wordmark, still one rigid group, uniformly scaling down together —
  // not split apart) shrinks AND slides up at the same time, timed so
  // both finish together: by the moment this stage ends, the wordmark is
  // at Home's real header wordmark's exact size AND position, not just
  // roughly near it. Founder feedback 2026-08-22: the previous "moves up
  // but stays the same size" version felt disconnected compared to the
  // Welcome path's own settle-into-place feel — this fixes that by
  // giving Home a genuine, matching settle moment too, not just a slide.
  stage4HomeStart: stage3End,
  stage4HomeDuration: 800,
  // Stage 4HomeContinue: once the wordmark has genuinely landed (same
  // size, same position as the real one — the handoff is invisible
  // because there's nothing left to tell them apart), only the icon
  // keeps travelling further, off the top of the screen, while the
  // whole overlay fades to reveal Home underneath — pulled
  // STAGE_OVERLAP earlier than stage4Home's nominal end, same
  // overlapping-motion convention used everywhere else, so it reads as
  // one continuous gesture (settle, then the icon alone continues
  // leaving) rather than a stop then a separate second move.
  stage4HomeContinueStart: stage3End + 800 - STAGE_OVERLAP,
  stage4HomeContinueDuration: 500,
} as const;

// Where Home's header logo sits — SplashAnimation's "destination=home"
// path lands the logo/wordmark here so the handoff into Home is seamless
// (its real header logo is already there, same position/size, no visible
// swap). Must stay in sync with HomeScreen's header layout — both import
// this instead of hardcoding the value twice.
export const HOME_HEADER_TOP_PADDING = 56;

// Interaction Animations
export const INTERACTION_ANIMATIONS = {
  // Notification modal: scale + fade
  notificationModal: {
    duration: 300,
    scaleFrom: 0.85,
    scaleTo: 1,
    easing: 'ease',
  },

  // Filter panel: bottom sheet slide
  filterPanel: {
    duration: 350,
    easing: PRIVI_EASE,
  },

  // Centred confirmation modal: scale + fade
  confirmationModal: {
    duration: 250,
    scaleFrom: 0.85,
    scaleTo: 1,
    easing: 'ease',
  },

  // Search bar contraction
  searchBar: {
    barDuration: 400,
    filterBubbleDuration: 350,
    resultsFadeDelay: 250,
    easing: PRIVI_EASE,
  },

  // Toast: scale + fade in/out
  toast: {
    duration: 250,
    scaleFrom: 0.8,
    scaleTo: 1,
    hold: 1600,
    easing: 'ease',
  },

  // Loading indicator: pulse
  loadingPulse: {
    duration: 1200,
    scaleMin: 1,
    scaleMax: 1.15,
    easing: 'ease-in-out',
  },
} as const;
