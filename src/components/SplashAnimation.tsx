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
   *   wordmark, still one rigid group) slides up so the WORDMARK lands
   *   exactly on Home's real header wordmark position, then the whole
   *   group fades away together as Home fades in underneath (already
   *   navigated-to and mounted by the caller). The wordmark's own
   *   disappearance is invisible — Home's real wordmark is sitting in the
   *   exact same spot — only the icon (which has nothing to land on, Home's
   *   header no longer shows one) visibly fades. See FINAL_SIZES/
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
// assembling into Welcome specifically (not noticeable on the Home path,
// since the icon used to keep shrinking further into its final header
// size regardless — as of the 2026-08-20 "lockup slides up" redesign
// below, Home no longer shrinks the icon further at all, so this value
// now applies identically to both destinations throughout). If this
// changes again, BrandMark.tsx's LOGO_HEIGHT_PX.md must change with it —
// it's what actually drives WelcomeScreen's own icon size, this constant
// only drives the animation.
//
// home.wordmarkBaseHeight is NOT an animation target any more (the
// animated wordmark never shrinks to it — see the redesign note above) —
// it's kept only so HOME_WORDMARK_TARGET_CENTER_Y below can compute
// where Home's real, static header wordmark actually sits (BrandMark.tsx
// renders it at 'sm', same base height). Must stay in sync with
// BrandMark.tsx's WORDMARK_BASE_HEIGHT_PX.sm for that reason.
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

const EASING = Easing.bezier(0.45, 0, 0.2, 1);

/**
 * Splash animation, choreographed per user review (2026-07-27, refined
 * same day; wordmark reveal direction changed 2026-08-20, Home's ending
 * simplified again 2026-08-21 — see below): starting icon fills 15% of
 * screen height, shrinks to final size, wordmark reveals downward below
 * the icon, then 'welcome' moves the assembled pair up with motto reveal
 * while 'home' slides the same assembled pair up to Home's header
 * position and fades it away.
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
 * **2026-08-21 redesign: Home's ending simplified further.** The
 * previous 'home' design (kept for one round) split the icon and
 * wordmark into two independently-transformed elements the moment stage
 * 3 ended, so the icon could travel diagonally to Home's real header-left
 * position while the wordmark travelled straight up — a seamless handoff
 * onto a header that showed an icon top-left. That header icon is gone
 * now (founder decision, 2026-08-21: Home/Account/Favourites/Map headers
 * dropped it entirely, wordmark + bell only), so there's no specific spot
 * left for the animated icon to land on — which means the whole reason
 * for splitting icon and wordmark apart at the end went away too.
 * Home's stage 4 now does the simplest thing that still works: the
 * *whole* assembled group (icon + wordmark, still one rigid flex column,
 * never split apart) slides straight up by a single translateY, chosen
 * so the WORDMARK's centre lands exactly on Home's real header wordmark
 * position (HOME_WORDMARK_TARGET_CENTER_Y below) — then the whole group
 * fades to nothing at the same time, revealing Home underneath. The
 * wordmark's own disappearance is invisible (Home's real wordmark is
 * sitting in the exact same spot); the icon just visibly fades, which is
 * fine since Home has nothing for it to land on any more. This also
 * means Home shares its ENTIRE stage 1-3 rendering with Welcome now, not
 * just the timing — no more independently-transformed icon/wordmark
 * elements, no more per-frame gap-preserving math during the reveal, no
 * more resizing the wordmark box down to Home's smaller size at the end
 * (the fade masks any size difference from Home's real header, same
 * lesson learned fixing the standalone preview's ghosting bug the round
 * before this — chasing an exact size/colour match wasn't the fix,
 * fading together was). Home does NOT show the motto (explicit founder
 * call, 2026-08-21) — it slides up and fades, nothing else.
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
  const wordmarkRatio = theme === 'dark' ? WORDMARK_LIGHT_RATIO : WORDMARK_DARK_RATIO;

  const welcomeWordDisplayHeight = Math.round(welcome.wordmarkBaseHeight * WORDMARK_HEIGHT_STRETCH);
  const welcomeWordWidth = Math.round(welcome.wordmarkBaseHeight * wordmarkRatio);

  // 'home' only — where the whole assembled group needs to end up
  // (translateY, from its pre-move screen-centred position) so the
  // WORDMARK's own centre lands on HOME_WORDMARK_TARGET_CENTER_Y.
  // Explicit pair-centring math, same approach this file has always used
  // (see the pre-2026-08-21 version's iconAssembledCenterY comment for
  // the same style applied to a different problem): the assembled
  // group (icon, then wordmark below it with a gap) auto-sizes to its
  // own content and is centred on screen via .lockup's own
  // translate(-50%,-50%) — so at rest, the group's own vertical centre
  // IS screen-centre. Within the group, the wordmark's centre sits
  // `wordmarkOffsetFromGroupCenter` below the group's own centre; solve
  // for the translateY that puts (screen-centre + that offset) exactly
  // on the real target.
  const groupContentHeight = welcome.iconHeight + welcome.gap + welcomeWordDisplayHeight;
  const wordmarkCenterYFromGroupTop = welcome.iconHeight + welcome.gap + welcomeWordDisplayHeight / 2;
  const wordmarkOffsetFromGroupCenter = wordmarkCenterYFromGroupTop - groupContentHeight / 2;
  const homeLockupTargetY = HOME_WORDMARK_TARGET_CENTER_Y - SCREEN_HEIGHT / 2 - wordmarkOffsetFromGroupCenter;

  const iconSize = useSharedValue(ICON_START_HEIGHT);
  // wordmarkRevealHeight is the CLIP WINDOW — 0 while nothing should be
  // visible yet, growing toward the wordmark's true (Welcome-sized)
  // height. Shared by both destinations now (2026-08-21) — Home no
  // longer resizes this down afterwards, see the redesign comment above.
  const wordmarkRevealHeight = useSharedValue(0);
  const wordmarkCrossfade = useSharedValue(0);
  const bgColorProgress = useSharedValue(0);
  const overlayOpacity = useSharedValue(1); // 'home' only
  const buttonsOpacity = useSharedValue(0);

  // The whole assembled pair (icon+wordmark, as one rigid flex-column
  // group) moves up together — for 'welcome', so the motto can reveal
  // underneath; for 'home' (2026-08-21), so the wordmark lands on Home's
  // real header position before the whole group fades. Shared shared
  // value, different target per destination (see useEffect below).
  const lockupTranslateY = useSharedValue(0);
  // 'welcome' only.
  const mottoHeight = useSharedValue(0);
  const mottoTranslateY = useSharedValue(-10);

  React.useEffect(() => {
    // Stage 2: icon shrinks to its final size, staying centred. Shared by
    // both destinations — Home no longer shrinks the icon further
    // afterwards (2026-08-21 redesign, see above).
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
      // Stage 4 (home, 2026-08-21 redesign): no added hold — starts the
      // instant stage 3 ends. The whole lockup slides up to
      // homeLockupTargetY while the whole group fades out at the same
      // time, revealing Home underneath. See the file-level comment for
      // why this no longer needs a separate icon target, a separate
      // wordmark target, or a resize down to Home's smaller size.
      lockupTranslateY.value = withDelay(
        SPLASH_ANIMATION.stage4HomeStart,
        withTiming(homeLockupTargetY, { duration: SPLASH_ANIMATION.stage4HomeDuration, easing: EASING })
      );
      overlayOpacity.value = withDelay(
        SPLASH_ANIMATION.stage4HomeStart,
        withTiming(0, { duration: SPLASH_ANIMATION.stage4HomeDuration, easing: EASING }, (finished) => {
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

  const iconImageAnimatedStyle = useAnimatedStyle(() => ({
    width: iconSize.value * LOGO_RATIO,
    height: iconSize.value,
  }));

  // Pure crossfade opacity (light/dark wordmark swap) — the reveal itself
  // is handled entirely by the clip window's height above, not by opacity.
  // Never actually animated for 'home' (stays at its initial 0), matching
  // the pre-existing behaviour that Home's wordmark doesn't crossfade —
  // it fades away with the rest of the group before it would matter.
  const startWordmarkAnimatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(wordmarkCrossfade.value, [0, 1], [1, 0], Extrapolation.CLAMP),
  }));
  const endWordmarkAnimatedStyle = useAnimatedStyle(() => ({
    opacity: wordmarkCrossfade.value,
  }));

  // The OUTER clip window — width is always the wordmark's true (Welcome-
  // sized) width, height is the actual reveal driver. Shared by both
  // destinations (2026-08-21) — see wordmarkRevealHeight's own comment.
  const wordmarkClipAnimatedStyle = useAnimatedStyle(() => ({
    width: welcomeWordWidth,
    height: wordmarkRevealHeight.value,
  }));
  // The INNER content — always at its true, full (Welcome-sized) box, so
  // the images inside render at correct scale from frame 1 and are simply
  // unmasked by the clip window above, not rescaled by it. This is a
  // fixed box now (2026-08-21) — it used to also be an animated shared
  // value so Home could resize it down at the end; Home no longer does
  // that (see the redesign comment above), so this is a plain constant
  // wrapped in useAnimatedStyle for consistency with the rest of this
  // file's Android view-flattening handling, not because it varies.
  const wordmarkContentAnimatedStyle = useAnimatedStyle(() => ({
    width: welcomeWordWidth,
    height: welcomeWordDisplayHeight,
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
  // (wordmarkContentAnimatedStyle's box).
  const wordmarkImages = (
    <>
      <Animated.Image
        source={startWordmarkSrc}
        resizeMode="contain"
        style={[StyleSheet.absoluteFill, startWordmarkAnimatedStyle]}
      />
      <Animated.Image
        source={endWordmarkSrc}
        resizeMode="contain"
        style={[StyleSheet.absoluteFill, endWordmarkAnimatedStyle]}
      />
    </>
  );

  // Shared between both destinations (2026-08-21) — icon then wordmark,
  // stacked as normal flex children of .lockup. Outer/inner split
  // (wordmarkClip vs wordmarkContent) — see wordmarkContentAnimatedStyle's
  // own comment above — the inner box never actually moves any more, it's
  // purely unmasked by the outer clip window as it grows.
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
