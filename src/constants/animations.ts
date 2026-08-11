// Easing function used throughout the app
export const PRIVI_EASE = 'cubic-bezier(0.45, 0, 0.2, 1)';

// Splash Screen Animation Timings (3.7s total) — choreographed per user
// review (2026-07-27, refined 2026-07-27): starting icon fills 20% of
// screen height, shrinks to final size, wordmark grows out to the right,
// lockup moves up with motto reveal, background transitions overlapping
// into buttons fade-in.
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
const stage3Start = stage2End - STAGE_OVERLAP;
const stage3End = stage3Start + 750;
const stage4Start = stage3End - STAGE_OVERLAP;
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

  // 'home' destination only (already-signed-in path): the overlay fade
  // must NOT start until the logo has fully finished travelling to Home's
  // header position — starting it early (e.g. at stage4Start, like the
  // 'welcome' path's bg transition does) revealed Home while the logo was
  // still mid-flight, which read as the logo vanishing rather than
  // becoming Home's own header logo. So this starts only once stage 4
  // (move-up) is completely done.
  homeFadeStart: stage4End,
  homeFadeDuration: 600,
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
