import React from 'react';
import { StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withTiming,
  interpolate,
  interpolateColor,
  Extrapolation,
  runOnJS,
  Easing,
} from 'react-native-reanimated';

import { COLORS } from '@/constants/colors';
import { SPLASH_ANIMATION, HOME_HEADER_TOP_PADDING } from '@/constants/animations';
import { GoldGradientText } from '@/components/GoldGradient';

interface SplashAnimationProps {
  onComplete: () => void;
  theme?: 'light' | 'dark';
  /**
   * 'welcome': full sequence ending with motto + buttons, logo/wordmark at
   *   Welcome's hero (md) size, stacked vertically — the not-signed-in path.
   * 'home': after the same shared assembly, the whole lockup (icon +
   *   wordmark, still one rigid group) shrinks AND slides up together, timed
   *   so the WORDMARK ends up at Home's real header wordmark's exact size
   *   AND position — not just roughly near it. Once that lands, the icon
   *   alone keeps travelling further, off the top of the screen, while the
   *   whole group fades to reveal Home underneath (already navigated-to and
   *   mounted by the caller). The wordmark's own disappearance is invisible
   *   — by the time it fades, it's pixel-identical to Home's real one
   *   sitting in the exact same spot. See FINAL_SIZES/
   *   HOME_WORDMARK_TARGET_CENTER_Y comments below.
   */
  destination?: 'welcome' | 'home';
}

// Same source-asset ratios as BrandMark (see BrandMark.tsx / website memory)
// Updated 2026-08-19 for the "Refined Privi Logo" replacement (915x1241).
const LOGO_RATIO = 915 / 1241;
const WORDMARK_DARK_RATIO = 898 / 453;
const WORDMARK_LIGHT_RATIO = 951 / 489;
const WORDMARK_HEIGHT_STRETCH = 62 / 56;

// Final sizes match BrandMark exactly (same values as BrandMark.tsx's
// LOGO_HEIGHT_PX/WORDMARK_BASE_HEIGHT_PX — NOT imported from there, kept
// manually in sync by convention across the two files, same as this
// codebase has always done) for each destination, so there's no size
// jump at handoff. Exported so WelcomeScreen.tsx can share `welcome.gap`
// rather than duplicate it — its static layout must land on exactly the
// same shape this animation assembles, so the two can't be allowed to
// drift apart independently.
//
// welcome.iconHeight was 74 until 2026-08-20 — read as a few px too big
// assembling into Welcome specifically. home.wordmarkBaseHeight is the
// real target BrandMark.tsx's own Wordmark('sm') renders Home's header
// at — used below both to compute where it sits (HOME_WORDMARK_TARGET_
// CENTER_Y) and, as of the 2026-08-22 redesign, as a genuine animation
// target again (the wordmark actually shrinks to this size now, not
// just roughly near it — see the file-level comment below). Must stay
// in sync with BrandMark.tsx's WORDMARK_BASE_HEIGHT_PX.sm for that
// reason.
export const FINAL_SIZES = {
  welcome: { iconHeight: 70, wordmarkBaseHeight: 56, gap: 13 },
  home: { wordmarkBaseHeight: 37 },
} as const;

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
// 0.2 -> 0.15 (2026-08-20): opening icon read as too big per user feedback.
// Keep in sync with SplashHold.tsx, which mirrors this as a static frame.
const ICON_START_HEIGHT = SCREEN_HEIGHT * 0.15;

// Home's real header wordmark sits at HOME_HEADER_TOP_PADDING + half its
// own (stretched) display height from the top of the screen — the header
// row's own height is now defined by the wordmark itself (it's the
// tallest flow child once the header icon is gone, see the 2026-08-20
// "remove header icon" change across Home/Account/Favourites/Map), so
// its centre is exactly HOME_HEADER_TOP_PADDING + half that height, no
// guessing needed.
const HOME_WORD_DISPLAY_HEIGHT = Math.round(FINAL_SIZES.home.wordmarkBaseHeight * WORDMARK_HEIGHT_STRETCH);
const HOME_WORDMARK_TARGET_CENTER_Y = HOME_HEADER_TOP_PADDING + HOME_WORD_DISPLAY_HEIGHT / 2;

// How far off the top of the screen the icon needs to travel, past where
// the shrink+align stage already leaves it, to read as genuinely having
// left rather than just faded on the spot. Not tied to any real target
// (there's nothing for the icon to land on any more) — a generous,
// best-effort value, flagged the same way every other exact pixel value
// in this file has been: functionally correct, visually unverified until
// checked on a real device.
const ICON_EXIT_TRAVEL = 80;

const EASING = Easing.bezier(0.45, 0, 0.2, 1);

/**
 * Splash animation, choreographed per user review (2026-07-27, refined
 * same day; wordmark reveal direction changed 2026-08-20, Home's ending
 * redesigned twice since — see below): starting icon fills 15% of screen
 * height, shrinks to final size, wordmark reveals downward below the
 * icon, then 'welcome' moves the assembled pair up with motto reveal
 * while 'home' shrinks+aligns onto Home's real header wordmark before the
 * icon alone continues off-screen.
 *
 * **2026-08-20 redesign context.** The founder grew to dislike the icon
 * sitting immediately next to the wordmark — chased through several
 * rounds of margin/centering fixes earlier this session — and the
 * decision was to stop juxtaposing them at all, everywhere in the app,
 * not just here. That meant this animation's own ending (a horizontal
 * icon-beside-wordmark lockup) had to change too, since both real
 * destinations (Welcome, Home) no longer look like that. The wordmark
 * now reveals *downward*, below the icon, reusing the exact mechanic
 * the motto reveal below already uses (a plain `overflow:hidden` height
 * clip as a normal flex child) — the one animated dimension confirmed
 * by real-device testing (see the stage3 comment further down) to
 * actually paint progressively on Android, unlike the old sideways
 * width-reveal this replaces.
 *
 * **2026-08-21 redesign: Home's ending simplified.** Home's header icon
 * was removed (Home/Account/Favourites/Map headers dropped it entirely,
 * wordmark + bell only), so the previous diagonal-icon-travel design —
 * built specifically to land the icon on that header icon's position —
 * lost its reason to exist. Home's stage 4 became the simplest thing
 * that still worked: the whole assembled group slid up by a single
 * translateY (no resize) until the wordmark's centre matched Home's
 * header wordmark position, then the whole group faded together.
 *
 * **2026-08-22 redesign: Home's ending gets a genuine settle, not just a
 * slide.** Founder feedback: the 2026-08-21 version — same size the
 * whole way, just sliding up and disappearing — read as disconnected
 * compared to Welcome's own settle-into-place feel. Fixed by making
 * Home's stage 4 do what Welcome's own assembly already does: actually
 * shrink to a real final size, not just translate. Now in two beats:
 *
 * 1. **Shrink+align** (stage4Home*): the whole rigid group (icon and
 *    wordmark, still one group, uniformly scaling down together — never
 *    split apart) shrinks AND slides up at the same time, timed so both
 *    finish together — by the end of this stage the wordmark is at
 *    Home's real header wordmark's exact size AND position, not roughly
 *    near it. The icon shrinks by the same ratio purely so the pair
 *    keeps reading as one coherent shrinking unit, not two independently
 *    resizing things (there's no "real" target size for the icon to aim
 *    for any more, since Home's header doesn't show one).
 * 2. **Continue+reveal** (stage4HomeContinue*): the wordmark has now
 *    genuinely landed — same size, same position as Home's real one, so
 *    its eventual fade is invisible, there's nothing left to tell the
 *    two apart. Only the icon keeps travelling, further up off the top
 *    of the screen (an *additional* translateY stacked on top of
 *    wherever the group itself already placed it — no structural split
 *    needed, the icon just gets one extra transform on its own image
 *    style), while the whole group fades to reveal Home underneath.
 *
 * This does mean the wordmark box resizes again at the end (removed in
 * the 2026-08-21 redesign, reinstated here) — reusing the exact same
 * clip/content technique proven safe for the stage-3 reveal, just now
 * also driving a shrink: wordmarkRevealHeight (the clip window) and
 * wordmarkContentHeight (the real content box) move in lockstep toward
 * the same smaller target, so nothing is ever masked/cropped mid-shrink,
 * only ever unmasked-then-resized as one continuous motion.
 *
 * Rebuilt 2026-08-12/13 on react-native-reanimated (was the legacy
 * `Animated` API). Real-device testing proved the old approach's animated
 * values ticked perfectly correctly in JS the whole time, but Android
 * never repainted the wordmark until something unrelated later in the
 * sequence forced a redraw. The first Reanimated attempt restored a
 * width/clip reveal (an `overflow:hidden` wrapper whose own width
 * animated 0 -> final) — confirmed via live on-device retest that this
 * STILL doesn't paint progressively, even on Reanimated's UI-thread
 * engine. That ruled out the animation engine as the cause entirely and
 * pointed at the specific technique: an `overflow:hidden` container
 * animating its own WIDTH is a known category of Android view-
 * invalidation bug, independent of what drives it — a HEIGHT reveal (as
 * the motto always used, and the wordmark now uses too) is not the same
 * category and is proven safe.
 */
export function SplashAnimation({ onComplete, theme = 'dark', destination = 'welcome' }: SplashAnimationProps) {
  const welcome = FINAL_SIZES.welcome;
  const home = FINAL_SIZES.home;
  const wordmarkRatio = theme === 'dark' ? WORDMARK_LIGHT_RATIO : WORDMARK_DARK_RATIO;

  const welcomeWordDisplayHeight = Math.round(welcome.wordmarkBaseHeight * WORDMARK_HEIGHT_STRETCH);
  const welcomeWordWidth = Math.round(welcome.wordmarkBaseHeight * wordmarkRatio);
  // 'home' only — the wordmark's genuine final size, matching what
  // BrandMark.tsx's own Wordmark('sm') actually renders at.
  const homeWordWidth = Math.round(home.wordmarkBaseHeight * wordmarkRatio);

  // 'home' only — the icon shrinks by the SAME ratio the wordmark does
  // during the shrink+align stage, so the pair reads as one uniformly-
  // scaling group rather than the wordmark resizing alone while the icon
  // stays big. Not a "real" target (nothing in Home's header uses this
  // size) — purely a visual-coherence choice.
  const homeShrinkRatio = HOME_WORD_DISPLAY_HEIGHT / welcomeWordDisplayHeight;
  const homeIconHeightAtMatch = welcome.iconHeight * homeShrinkRatio;
  const homeGapAtMatch = welcome.gap * homeShrinkRatio;

  // 'home' only — where the whole assembled group needs to end up
  // (translateY, from its pre-move screen-centred position) so the
  // WORDMARK's own centre lands on HOME_WORDMARK_TARGET_CENTER_Y, given
  // the group is ALSO shrinking during this move (so this uses the
  // AT-MATCH/shrunk dimensions, not the Welcome-sized assembled ones).
  // Explicit pair-centring math, same approach this file has always used:
  // the assembled group (icon, then wordmark below it with a gap)
  // auto-sizes to its own CURRENT content and is centred on screen via
  // .lockup's own translate(-50%,-50%) — so at rest, the group's own
  // vertical centre IS screen-centre, and stays anchored there as the
  // content shrinks around it. Within the group, the wordmark's centre
  // sits `wordmarkOffsetFromGroupCenterAtMatch` below the group's own
  // centre (using the group's FINAL, shrunk dimensions); solve for the
  // translateY that puts (screen-centre + that offset) exactly on the
  // real target.
  const groupContentHeightAtMatch = homeIconHeightAtMatch + homeGapAtMatch + HOME_WORD_DISPLAY_HEIGHT;
  const wordmarkCenterYFromGroupTopAtMatch = homeIconHeightAtMatch + homeGapAtMatch + HOME_WORD_DISPLAY_HEIGHT / 2;
  const wordmarkOffsetFromGroupCenterAtMatch = wordmarkCenterYFromGroupTopAtMatch - groupContentHeightAtMatch / 2;
  const homeLockupTargetY =
    HOME_WORDMARK_TARGET_CENTER_Y - SCREEN_HEIGHT / 2 - wordmarkOffsetFromGroupCenterAtMatch;

  const iconSize = useSharedValue(ICON_START_HEIGHT);
  // wordmarkRevealHeight is the CLIP WINDOW: 0 while nothing should be
  // visible yet, growing toward the wordmark's true (Welcome-sized)
  // height during stage 3 — then, 'home' only, shrinking again toward
  // Home's real (smaller) size during the shrink+align stage.
  // wordmarkContentHeight/wordmarkBoxWidth are the REAL content box —
  // always at its current true size, never the thing being masked;
  // during stage 3 they stay fixed at the Welcome-sized target the whole
  // reveal (so the images render at correct scale from frame 1, purely
  // unmasked as the clip window grows); during Home's shrink+align they
  // move in LOCKSTEP with wordmarkRevealHeight/wordmarkBoxWidth (same
  // target, same timing) so nothing is ever masked/cropped mid-shrink —
  // clip and content are simply always equal to each other in that
  // direction, unlike the asymmetric reveal.
  const wordmarkRevealHeight = useSharedValue(0);
  const wordmarkContentHeight = useSharedValue(welcomeWordDisplayHeight);
  const wordmarkBoxWidth = useSharedValue(welcomeWordWidth);
  const wordmarkCrossfade = useSharedValue(0);
  const bgColorProgress = useSharedValue(0);
  const overlayOpacity = useSharedValue(1); // 'home' only
  const buttonsOpacity = useSharedValue(0);

  // The whole assembled pair (icon+wordmark, as one rigid flex-column
  // group) moves up together — for 'welcome', so the motto can reveal
  // underneath; for 'home', so the wordmark lands on Home's real header
  // position (shrinking at the same time — see homeIconSize/
  // wordmarkRevealHeight above) before the icon continues on alone.
  // Shared shared value, different target per destination (see useEffect
  // below).
  const lockupTranslateY = useSharedValue(0);
  // 'home' only — an ADDITIONAL translateY stacked on top of whatever
  // the group's own lockupTranslateY already placed the icon at, so it
  // can keep travelling once the wordmark has landed and stopped, without
  // needing to structurally split the icon out of the rigid group at all.
  // Stays 0 (a no-op transform) for 'welcome'.
  const iconExtraTranslateY = useSharedValue(0);
  // 'welcome' only.
  const mottoHeight = useSharedValue(0);
  const mottoTranslateY = useSharedValue(-10);

  React.useEffect(() => {
    // Stage 2: icon shrinks to its final size, staying centred. Shared by
    // both destinations.
    iconSize.value = withDelay(
      SPLASH_ANIMATION.stage2Start,
      withTiming(welcome.iconHeight, { duration: SPLASH_ANIMATION.stage2Duration, easing: EASING })
    );

    // Stage 3: wordmark reveals downward — a plain height clip on a
    // normal flex child, the one technique proven to actually paint
    // progressively on Android (see the file-level comment). Shared by
    // both destinations.
    wordmarkRevealHeight.value = withDelay(
      SPLASH_ANIMATION.stage3Start,
      withTiming(welcomeWordDisplayHeight, { duration: SPLASH_ANIMATION.stage3Duration, easing: EASING })
    );

    if (destination === 'home') {
      // Stage 4Home ("shrink+align"): no added hold — starts the instant
      // stage 3 ends. Icon, wordmark (both dimensions) and the group's
      // own position all animate together, over the same duration, so
      // they all land at once: the wordmark ends up at Home's real
      // header wordmark's exact size and position.
      iconSize.value = withDelay(
        SPLASH_ANIMATION.stage4HomeStart,
        withTiming(homeIconHeightAtMatch, { duration: SPLASH_ANIMATION.stage4HomeDuration, easing: EASING })
      );
      wordmarkRevealHeight.value = withDelay(
        SPLASH_ANIMATION.stage4HomeStart,
        withTiming(HOME_WORD_DISPLAY_HEIGHT, { duration: SPLASH_ANIMATION.stage4HomeDuration, easing: EASING })
      );
      wordmarkContentHeight.value = withDelay(
        SPLASH_ANIMATION.stage4HomeStart,
        withTiming(HOME_WORD_DISPLAY_HEIGHT, { duration: SPLASH_ANIMATION.stage4HomeDuration, easing: EASING })
      );
      wordmarkBoxWidth.value = withDelay(
        SPLASH_ANIMATION.stage4HomeStart,
        withTiming(homeWordWidth, { duration: SPLASH_ANIMATION.stage4HomeDuration, easing: EASING })
      );
      lockupTranslateY.value = withDelay(
        SPLASH_ANIMATION.stage4HomeStart,
        withTiming(homeLockupTargetY, { duration: SPLASH_ANIMATION.stage4HomeDuration, easing: EASING })
      );

      // Stage 4HomeContinue: the wordmark has now genuinely landed (same
      // size, same position as the real one) and stops here — only the
      // icon keeps going, while the whole group fades to reveal Home.
      iconExtraTranslateY.value = withDelay(
        SPLASH_ANIMATION.stage4HomeContinueStart,
        withTiming(-ICON_EXIT_TRAVEL, {
          duration: SPLASH_ANIMATION.stage4HomeContinueDuration,
          easing: EASING,
        })
      );
      overlayOpacity.value = withDelay(
        SPLASH_ANIMATION.stage4HomeContinueStart,
        withTiming(0, { duration: SPLASH_ANIMATION.stage4HomeContinueDuration, easing: EASING }, (finished) => {
          if (finished) runOnJS(onComplete)();
        })
      );
    } else {
      // 'welcome': stays a single rigid flex-column group — move the
      // whole thing up, motto reveals underneath, background settles to
      // the theme colour.
      lockupTranslateY.value = withDelay(
        SPLASH_ANIMATION.stage4Start,
        withTiming(-90, { duration: SPLASH_ANIMATION.stage4Duration, easing: EASING })
      );
      mottoHeight.value = withDelay(
        SPLASH_ANIMATION.stage4Start,
        withTiming(68, { duration: SPLASH_ANIMATION.stage4Duration, easing: EASING })
      );
      mottoTranslateY.value = withDelay(
        SPLASH_ANIMATION.stage4Start,
        withTiming(0, { duration: SPLASH_ANIMATION.stage4Duration, easing: EASING })
      );
      bgColorProgress.value = withDelay(
        SPLASH_ANIMATION.bgStart,
        withTiming(1, { duration: SPLASH_ANIMATION.bgDuration, easing: EASING })
      );
      wordmarkCrossfade.value = withDelay(
        SPLASH_ANIMATION.bgStart,
        withTiming(1, { duration: SPLASH_ANIMATION.bgDuration, easing: EASING })
      );
      // Stage 5: buttons fade in, finishing exactly as the background
      // transition completes.
      buttonsOpacity.value = withDelay(
        SPLASH_ANIMATION.stage5Start,
        withTiming(1, { duration: SPLASH_ANIMATION.stage5Duration, easing: EASING }, (finished) => {
          if (finished) runOnJS(onComplete)();
        })
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const containerAnimatedStyle = useAnimatedStyle(() => {
    if (destination === 'home') {
      return { backgroundColor: COLORS.teal, opacity: overlayOpacity.value };
    }
    return {
      backgroundColor: interpolateColor(
        bgColorProgress.value,
        [0, 1],
        [COLORS.teal, theme === 'dark' ? COLORS.charcoal : COLORS.ivory]
      ),
    };
  });

  // iconExtraTranslateY stays 0 (a no-op) for 'welcome' — this is a
  // shared style, not a home-only one, but only ever actually moves
  // anything for 'home'.
  const iconImageAnimatedStyle = useAnimatedStyle(() => ({
    width: iconSize.value * LOGO_RATIO,
    height: iconSize.value,
    transform: [{ translateY: iconExtraTranslateY.value }],
  }));

  // Pure crossfade opacity (light/dark wordmark swap) — the reveal itself
  // is handled entirely by the clip window's height above, not by opacity.
  // Never actually animated for 'home' (stays at its initial 0), matching
  // the pre-existing behaviour that Home's wordmark doesn't crossfade —
  // it's pixel-identical to Home's real one by the time it fades, so
  // whichever colour it happens to be doesn't matter.
  const startWordmarkAnimatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(wordmarkCrossfade.value, [0, 1], [1, 0], Extrapolation.CLAMP),
  }));
  const endWordmarkAnimatedStyle = useAnimatedStyle(() => ({
    opacity: wordmarkCrossfade.value,
  }));

  // The OUTER clip window — width/height both driven by shared values now
  // (2026-08-22: width used to be a static constant; now genuinely
  // animates for 'home's shrink stage, same as height already did).
  const wordmarkClipAnimatedStyle = useAnimatedStyle(() => ({
    width: wordmarkBoxWidth.value,
    height: wordmarkRevealHeight.value,
  }));
  // The INNER content — during stage 3's reveal this stays fixed at the
  // Welcome-sized target the whole time (so the images render at correct
  // scale from frame 1, purely unmasked by the clip window as it grows);
  // during Home's shrink+align stage it moves in LOCKSTEP with the clip
  // window above (same target, same timing), so the two are always equal
  // to each other in that direction and nothing is ever masked/cropped
  // mid-shrink.
  const wordmarkContentAnimatedStyle = useAnimatedStyle(() => ({
    width: wordmarkBoxWidth.value,
    height: wordmarkContentHeight.value,
  }));

  const lockupAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: lockupTranslateY.value }],
  }));
  // 'welcome' only.
  const mottoWrapAnimatedStyle = useAnimatedStyle(() => ({
    height: mottoHeight.value,
  }));
  const mottoInnerAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: mottoTranslateY.value }],
  }));
  const buttonsAnimatedStyle = useAnimatedStyle(() => ({
    opacity: buttonsOpacity.value,
  }));

  const startWordmarkSrc = require('../../assets/brand/privi-wordmark-light.png');
  const endWordmarkSrc =
    theme === 'dark'
      ? require('../../assets/brand/privi-wordmark-light.png')
      : require('../../assets/brand/privi-wordmark-dark.png');

  // Shared between both destinations — just the two crossfading images,
  // absoluteFill relative to their explicitly-sized parent
  // (wordmarkContentAnimatedStyle's box). wordmarkImageFill (explicit
  // 100%/100%) alongside absoluteFill — see its own comment in `styles`
  // for why absoluteFill alone isn't enough on web.
  const wordmarkImages = (
    <>
      <Animated.Image
        source={startWordmarkSrc}
        resizeMode="contain"
        style={[StyleSheet.absoluteFill, styles.wordmarkImageFill, startWordmarkAnimatedStyle]}
      />
      <Animated.Image
        source={endWordmarkSrc}
        resizeMode="contain"
        style={[StyleSheet.absoluteFill, styles.wordmarkImageFill, endWordmarkAnimatedStyle]}
      />
    </>
  );

  // Shared between both destinations — icon then wordmark, stacked as
  // normal flex children of .lockup. Outer/inner split (wordmarkClip vs
  // wordmarkContent) — see wordmarkContentAnimatedStyle's own comment
  // above for how the two stay in sync during Home's shrink stage.
  // collapsable={false} on the wordmark wrapper: matches this file's own
  // established rule for every dynamically-transformed view — Android's
  // view-flattening optimisation can silently drop a wrapper it decides
  // to hoist out of the native tree from receiving further updates.
  const iconAndWordmark = (
    <>
      <Animated.Image
        source={require('../../assets/brand/privi-logo.png')}
        resizeMode="contain"
        style={iconImageAnimatedStyle}
      />
      <Animated.View
        collapsable={false}
        style={[styles.wordmarkWrap, { marginTop: welcome.gap }, wordmarkClipAnimatedStyle]}
      >
        <Animated.View collapsable={false} style={wordmarkContentAnimatedStyle}>
          {wordmarkImages}
        </Animated.View>
      </Animated.View>
    </>
  );

  if (destination === 'home') {
    return (
      <Animated.View style={[styles.container, containerAnimatedStyle]}>
        <Animated.View style={[styles.lockup, lockupAnimatedStyle]}>{iconAndWordmark}</Animated.View>
      </Animated.View>
    );
  }

  return (
    <Animated.View style={[styles.container, containerAnimatedStyle]}>
      <Animated.View style={[styles.lockup, lockupAnimatedStyle]}>
        {iconAndWordmark}
        <Animated.View style={[styles.mottoWrap, mottoWrapAnimatedStyle]}>
          <Animated.View style={mottoInnerAnimatedStyle}>
            <GoldGradientText style={styles.motto}>
              More for you.{'\n'}Every day.
            </GoldGradientText>
          </Animated.View>
        </Animated.View>
      </Animated.View>

      <Animated.View style={[styles.buttonsContainer, buttonsAnimatedStyle]} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lockup: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Shared by both destinations — the OUTER clip window, just
  // overflow:hidden, sized via wordmarkClipAnimatedStyle. Never itself
  // absolutely positioned.
  wordmarkWrap: {
    overflow: 'hidden',
  },
  // REAL BUG FOUND 2026-08-22 (web only, confirmed on the web preview —
  // the wordmark reveal on native/Android was never affected): the two
  // crossfading wordmark Animated.Images were only ever given
  // `StyleSheet.absoluteFill` (position + inset:0, no explicit width/
  // height) to size themselves against their parent box. On native,
  // inset:0 alone is enough to stretch any view to fill its parent
  // regardless of element type. On React Native Web, an <Image> with no
  // explicit width/height falls back to the SOURCE ASSET's own natural
  // pixel size (951x489 for this wordmark) instead of stretching to
  // fill — confirmed directly via computed styles: the image's actual
  // host div was rendering at 951x489 inside a 109x62 parent, with only
  // the extreme top-left corner (mostly transparent padding in the
  // source PNG) visible through the tiny overflow:hidden clip window.
  // That's why the wordmark reveal was invisible on the web preview
  // while the icon (which already gets explicit pixel width/height via
  // iconImageAnimatedStyle) rendered/scaled correctly. Fix: give the
  // wordmark images an explicit 100%/100% fill alongside absoluteFill,
  // so they can no longer fall back to natural size on any platform.
  wordmarkImageFill: {
    width: '100%',
    height: '100%',
  },
  // 'welcome' only.
  mottoWrap: {
    overflow: 'hidden',
  },
  motto: {
    fontSize: 20,
    fontWeight: '500',
    textAlign: 'center',
    paddingTop: 10,
  },
  buttonsContainer: {
    position: 'absolute',
    bottom: 40,
    left: 20,
    right: 20,
  },
});
