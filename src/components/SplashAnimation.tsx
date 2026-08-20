import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
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
   *   Welcome's hero (md) size — the not-signed-in path.
   * 'home': shorter sequence — no motto, no buttons. The whole overlay
   *   fades out instead, revealing Home (already navigated-to and mounted
   *   underneath by the caller) through it. Logo/wordmark end at Home's
   *   header (sm) size and position, so the handoff is seamless — Home's
   *   own header logo is already sitting there, same spot, same size.
   */
  destination?: 'welcome' | 'home';
}

// Same source-asset ratios as BrandMark (see BrandMark.tsx / website memory)
// Updated 2026-08-19 for the "Refined Privi Logo" replacement (915x1241).
const LOGO_RATIO = 915 / 1241;
const WORDMARK_DARK_RATIO = 898 / 453;
const WORDMARK_LIGHT_RATIO = 951 / 489;
const WORDMARK_HEIGHT_STRETCH = 62 / 56;

// Final sizes match BrandMark exactly (same values as BrandMark.tsx) for
// each destination, so there's no size jump at handoff. gap values updated
// 2026-08-20 alongside BrandMark's WORDMARK_MARGIN_PX retune (sm:4->9,
// md:6->13) — keep these in sync if either changes.
const FINAL_SIZES = {
  welcome: { iconHeight: 74, wordmarkBaseHeight: 56, gap: 13 },
  home: { iconHeight: 49, wordmarkBaseHeight: 37, gap: 9 },
} as const;

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');
// 0.2 -> 0.15 (2026-08-20): opening icon read as too big per user feedback.
// Keep in sync with SplashHold.tsx, which mirrors this as a static frame.
const ICON_START_HEIGHT = SCREEN_HEIGHT * 0.15;

// Home's header logo sits at HOME_HEADER_TOP_PADDING + half its own
// height from the top of the screen — see constants/animations.ts.
const HOME_TARGET_CENTER_Y = HOME_HEADER_TOP_PADDING + FINAL_SIZES.home.iconHeight / 2;

const EASING = Easing.bezier(0.45, 0, 0.2, 1);

/**
 * Splash animation, choreographed per user review (2026-07-27, refined
 * same day): starting icon fills 20% of screen height, shrinks to final
 * size, wordmark grows out of the logo to the right, lockup moves up with
 * motto reveal (destination='welcome') or fades to reveal Home underneath
 * (destination='home').
 *
 * Rebuilt 2026-08-12/13 on react-native-reanimated (was the legacy
 * `Animated` API). Real-device testing proved the old approach's animated
 * values ticked perfectly correctly in JS the whole time, but Android
 * never repainted the wordmark until something unrelated later in the
 * sequence forced a redraw. The first Reanimated attempt restored the
 * "wordmark grows out of the icon" width/clip reveal (an `overflow:hidden`
 * wrapper whose own width animated 0 -> final) — confirmed via live
 * on-device retest that this STILL doesn't paint progressively, even on
 * Reanimated's UI-thread engine. That rules out the animation engine as
 * the cause entirely (two structurally different engines, identical
 * symptom) and points at the specific technique: an `overflow:hidden`
 * container animating its own width is a known category of Android
 * view-invalidation bug, independent of what drives it. This version
 * drops that technique — the wordmark wrapper is now a FIXED size the
 * whole time, and the reveal is a plain opacity fade (0 -> 1), the one
 * combination not yet tried and the animation type Reanimated's own docs
 * treat as its most reliable, best-tested path.
 */
export function SplashAnimation({ onComplete, theme = 'dark', destination = 'welcome' }: SplashAnimationProps) {
  const size = FINAL_SIZES[destination];
  const wordmarkDisplayHeight = Math.round(size.wordmarkBaseHeight * WORDMARK_HEIGHT_STRETCH);
  const wordmarkRatio = theme === 'dark' ? WORDMARK_LIGHT_RATIO : WORDMARK_DARK_RATIO;
  const wordmarkFinalWidth = Math.round(size.wordmarkBaseHeight * wordmarkRatio);
  const wordmarkClipFinalWidth = size.gap + wordmarkFinalWidth;

  const iconSize = useSharedValue(ICON_START_HEIGHT);
  // Direct pixels (0 -> wordmarkClipFinalWidth), not a 0-1 fraction routed
  // through interpolate() — deliberately mirrors mottoHeight's pattern
  // exactly (see stage3's comment below), since that's the one animated
  // dimension proven to actually paint on this device.
  const wordmarkRevealWidth = useSharedValue(0);
  // 2026-08-20: the icon was staying put while wordmarkRevealWidth grew the
  // clip window to its right — visually that drags the whole group's centre
  // rightward as the wordmark appears, since the icon (the original, single
  // centred element) never moves. This counter-shifts iconRow left by half
  // of the reveal's final width, in lockstep with the same reveal, so the
  // icon+wordmark pair ends up centred on the exact point the icon alone
  // started at — the same result as if the FINAL combined lockup had been
  // centred as one unit (matching how BrandMark centres itself statically
  // on Welcome/Home/Sign-in's own headers).
  const iconRowShiftX = useSharedValue(0);
  const lockupTranslateY = useSharedValue(0);
  const mottoHeight = useSharedValue(0);
  const mottoTranslateY = useSharedValue(-10);
  const wordmarkCrossfade = useSharedValue(0);
  const bgColorProgress = useSharedValue(0);
  const overlayOpacity = useSharedValue(1); // 'home' only
  const buttonsOpacity = useSharedValue(0);

  React.useEffect(() => {
    // Stage 2: icon shrinks to final size, staying centred.
    iconSize.value = withDelay(
      SPLASH_ANIMATION.stage2Start,
      withTiming(size.iconHeight, { duration: SPLASH_ANIMATION.stage2Duration, easing: EASING })
    );

    // Stage 3: wordmark's clip window grows from 0 to its final width —
    // same overflow:hidden + directly-animated-pixel-dimension principle
    // as the motto's proven-working height reveal below, just horizontal.
    wordmarkRevealWidth.value = withDelay(
      SPLASH_ANIMATION.stage3Start,
      withTiming(wordmarkClipFinalWidth, { duration: SPLASH_ANIMATION.stage3Duration, easing: EASING })
    );
    iconRowShiftX.value = withDelay(
      SPLASH_ANIMATION.stage3Start,
      withTiming(-wordmarkClipFinalWidth / 2, { duration: SPLASH_ANIMATION.stage3Duration, easing: EASING })
    );

    // Stage 4: move up to the destination's resting position.
    const targetTranslateY = destination === 'home' ? HOME_TARGET_CENTER_Y - SCREEN_HEIGHT / 2 : -90;
    lockupTranslateY.value = withDelay(
      SPLASH_ANIMATION.stage4Start,
      withTiming(targetTranslateY, { duration: SPLASH_ANIMATION.stage4Duration, easing: EASING })
    );

    if (destination === 'welcome') {
      mottoHeight.value = withDelay(
        SPLASH_ANIMATION.stage4Start,
        withTiming(68, { duration: SPLASH_ANIMATION.stage4Duration, easing: EASING })
      );
      mottoTranslateY.value = withDelay(
        SPLASH_ANIMATION.stage4Start,
        withTiming(0, { duration: SPLASH_ANIMATION.stage4Duration, easing: EASING })
      );
    }

    if (destination === 'home') {
      // Overlay fade must wait until the logo has fully arrived at Home's
      // header position (stage 4 completely done) — starting it early
      // revealed Home while the logo was still travelling, which read as
      // the logo vanishing rather than becoming Home's own header logo.
      overlayOpacity.value = withDelay(
        SPLASH_ANIMATION.homeFadeStart,
        withTiming(0, { duration: SPLASH_ANIMATION.homeFadeDuration, easing: EASING }, (finished) => {
          if (finished) runOnJS(onComplete)();
        })
      );
    } else {
      // 'welcome': the backdrop settles to the theme colour while
      // motto/buttons appear on top of it — starts with stage 4 as before.
      bgColorProgress.value = withDelay(
        SPLASH_ANIMATION.bgStart,
        withTiming(1, { duration: SPLASH_ANIMATION.bgDuration, easing: EASING })
      );
      wordmarkCrossfade.value = withDelay(
        SPLASH_ANIMATION.bgStart,
        withTiming(1, { duration: SPLASH_ANIMATION.bgDuration, easing: EASING })
      );
    }

    // Stage 5 ('welcome' only): buttons fade in, finishing exactly as the
    // background transition completes.
    if (destination === 'welcome') {
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

  const lockupAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: lockupTranslateY.value }],
  }));

  const iconRowAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: iconRowShiftX.value }],
  }));

  const iconAnimatedStyle = useAnimatedStyle(() => ({
    width: iconSize.value,
    height: iconSize.value,
  }));

  const wordmarkRevealAnimatedStyle = useAnimatedStyle(() => ({
    width: wordmarkRevealWidth.value,
  }));

  // Pure crossfade opacity (light/dark wordmark swap) — the reveal itself
  // is handled entirely by the clip window's width above, not by opacity.
  const startWordmarkAnimatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(wordmarkCrossfade.value, [0, 1], [1, 0], Extrapolation.CLAMP),
  }));

  const endWordmarkAnimatedStyle = useAnimatedStyle(() => ({
    opacity: wordmarkCrossfade.value,
  }));

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

  return (
    <Animated.View style={[styles.container, containerAnimatedStyle]}>
      <Animated.View style={[styles.lockup, lockupAnimatedStyle]}>
        <Animated.View style={[styles.iconRow, iconRowAnimatedStyle]}>
          <Animated.Image
            source={require('../../assets/brand/privi-logo.png')}
            resizeMode="contain"
            style={iconAnimatedStyle}
          />
          {/* Absolutely positioned, anchored at the icon's FINAL static
              width (safe — stage3 no longer overlaps stage2's icon-shrink,
              so the icon has always finished resizing before this becomes
              visible) — kept absolute rather than a normal flex sibling
              so the growing wordmark can't widen iconRow and drag the
              icon sideways as a side effect. The clip window's WIDTH is
              what's animated (0 -> full), same overflow:hidden +
              directly-animated-pixel-dimension principle as the motto's
              reveal below (which IS proven to paint correctly on this
              device). collapsable={false} on every level here (2026-08-13):
              the motto's own content is GoldGradientText — a heavier,
              distinctly-native gradient-mask component Android's renderer
              never flattens — while this subtree is plain layout Views
              around a plain Image, exactly what Android's "view flattening"
              optimization removes from the real native tree by default.
              A flattened-away view can silently stop receiving dynamic
              clip/paint updates, matching our exact symptom (nothing
              visible until an unrelated redraw forces the whole tree to
              recompute). collapsable={false} forces Android to keep these
              as real native view nodes. */}
          <Animated.View
            collapsable={false}
            style={[
              styles.wordmarkWrap,
              {
                left: size.iconHeight,
                top: (size.iconHeight - wordmarkDisplayHeight) / 2,
                height: wordmarkDisplayHeight,
              },
              wordmarkRevealAnimatedStyle,
            ]}
          >
            <View
              collapsable={false}
              style={{
                marginLeft: size.gap,
                width: wordmarkFinalWidth,
                height: wordmarkDisplayHeight,
              }}
            >
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
            </View>
          </Animated.View>
        </Animated.View>

        {destination === 'welcome' && (
          <Animated.View style={[styles.mottoWrap, mottoWrapAnimatedStyle]}>
            <Animated.View style={mottoInnerAnimatedStyle}>
              <GoldGradientText style={styles.motto}>
                More for you.{'\n'}Every day.
              </GoldGradientText>
            </Animated.View>
          </Animated.View>
        )}
      </Animated.View>

      {destination === 'welcome' && (
        <Animated.View style={[styles.buttonsContainer, buttonsAnimatedStyle]} />
      )}
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
  iconRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  wordmarkWrap: {
    position: 'absolute',
    overflow: 'hidden',
  },
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
