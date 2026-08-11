import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Easing, Dimensions } from 'react-native';
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
const LOGO_RATIO = 1218 / 1536;
const WORDMARK_DARK_RATIO = 898 / 453;
const WORDMARK_LIGHT_RATIO = 951 / 489;
const WORDMARK_HEIGHT_STRETCH = 62 / 56;

// Final sizes match BrandMark exactly (same values as BrandMark.tsx) for
// each destination, so there's no size jump at handoff.
const FINAL_SIZES = {
  welcome: { iconHeight: 74, wordmarkBaseHeight: 56, gap: 6 },
  home: { iconHeight: 49, wordmarkBaseHeight: 37, gap: 4 },
} as const;

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');
const ICON_START_HEIGHT = SCREEN_HEIGHT * 0.2;

// Home's header logo sits at HOME_HEADER_TOP_PADDING + half its own
// height from the top of the screen — see constants/animations.ts.
const HOME_TARGET_CENTER_Y = HOME_HEADER_TOP_PADDING + FINAL_SIZES.home.iconHeight / 2;

/**
 * Splash animation, choreographed per user review (2026-07-27, refined
 * same day): starting icon fills 20% of screen height, shrinks to final
 * size, wordmark grows out of the logo to the right, lockup moves up with
 * motto reveal (destination='welcome') or fades to reveal Home underneath
 * (destination='home'). Stages are independently scheduled (not chained
 * via .start() callbacks) so each can start slightly before the previous
 * one's tail end — see SPLASH_ANIMATION's STAGE_OVERLAP — reading as one
 * continuous gesture instead of separate stop-start moves.
 */
export function SplashAnimation({ onComplete, theme = 'dark', destination = 'welcome' }: SplashAnimationProps) {
  const iconSize = useRef(new Animated.Value(ICON_START_HEIGHT)).current;
  const wordmarkGrowth = useRef(new Animated.Value(0)).current; // drives width + scale + opacity together
  const lockupTranslateY = useRef(new Animated.Value(0)).current;
  const mottoHeight = useRef(new Animated.Value(0)).current;
  const mottoTranslateY = useRef(new Animated.Value(-10)).current;
  const wordmarkCrossfade = useRef(new Animated.Value(0)).current;
  const bgColorProgress = useRef(new Animated.Value(0)).current;
  const overlayOpacity = useRef(new Animated.Value(1)).current; // 'home' only
  const buttonsOpacity = useRef(new Animated.Value(0)).current;

  const easing = Easing.bezier(0.45, 0, 0.2, 1);
  const size = FINAL_SIZES[destination];

  const wordmarkDisplayHeight = Math.round(size.wordmarkBaseHeight * WORDMARK_HEIGHT_STRETCH);
  const wordmarkRatio = theme === 'dark' ? WORDMARK_LIGHT_RATIO : WORDMARK_DARK_RATIO;
  const wordmarkFinalWidth = Math.round(size.wordmarkBaseHeight * wordmarkRatio);

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    const schedule = (fn: () => void, delay: number) => {
      timers.push(setTimeout(fn, delay));
    };

    // Stage 2: icon shrinks to final size, staying centred (trivial —
    // it's the only element with layout weight so far, flexbox centres it
    // automatically regardless of current size).
    schedule(() => {
      Animated.timing(iconSize, {
        toValue: size.iconHeight,
        duration: SPLASH_ANIMATION.stage2Duration,
        easing,
        useNativeDriver: false,
      }).start();
    }, SPLASH_ANIMATION.stage2Start);

    // Stage 3: wordmark grows out of the logo. One driver controls wrapper
    // width + inner scale/opacity together so visible content always
    // exactly fills its wrapper — no clip-mask edge ever shows.
    schedule(() => {
      Animated.timing(wordmarkGrowth, {
        toValue: 1,
        duration: SPLASH_ANIMATION.stage3Duration,
        easing,
        useNativeDriver: false,
      }).start();
    }, SPLASH_ANIMATION.stage3Start);

    // Stage 4: move up to the destination's resting position.
    schedule(() => {
      const targetTranslateY =
        destination === 'home' ? HOME_TARGET_CENTER_Y - SCREEN_HEIGHT / 2 : -90;

      Animated.timing(lockupTranslateY, {
        toValue: targetTranslateY,
        duration: SPLASH_ANIMATION.stage4Duration,
        easing,
        useNativeDriver: true,
      }).start();

      if (destination === 'welcome') {
        Animated.timing(mottoHeight, {
          toValue: 68,
          duration: SPLASH_ANIMATION.stage4Duration,
          easing,
          useNativeDriver: false,
        }).start();
        Animated.timing(mottoTranslateY, {
          toValue: 0,
          duration: SPLASH_ANIMATION.stage4Duration,
          easing,
          useNativeDriver: true,
        }).start();
      }
    }, SPLASH_ANIMATION.stage4Start);

    if (destination === 'home') {
      // Overlay fade must wait until the logo has fully arrived at Home's
      // header position (stage 4 completely done) — starting it early
      // revealed Home while the logo was still travelling, which read as
      // the logo vanishing rather than becoming Home's own header logo.
      schedule(() => {
        Animated.timing(overlayOpacity, {
          toValue: 0,
          duration: SPLASH_ANIMATION.homeFadeDuration,
          easing,
          useNativeDriver: true,
        }).start(() => onComplete());
      }, SPLASH_ANIMATION.homeFadeStart);
    } else {
      // 'welcome': the backdrop settles to the theme colour while
      // motto/buttons appear on top of it — starts with stage 4 as before.
      schedule(() => {
        Animated.timing(bgColorProgress, {
          toValue: 1,
          duration: SPLASH_ANIMATION.bgDuration,
          easing,
          useNativeDriver: false,
        }).start();
        Animated.timing(wordmarkCrossfade, {
          toValue: 1,
          duration: SPLASH_ANIMATION.bgDuration,
          easing,
          useNativeDriver: true,
        }).start();
      }, SPLASH_ANIMATION.bgStart);
    }

    // Stage 5 ('welcome' only): buttons fade in, finishing exactly as the
    // background transition completes.
    if (destination === 'welcome') {
      schedule(() => {
        Animated.timing(buttonsOpacity, {
          toValue: 1,
          duration: SPLASH_ANIMATION.stage5Duration,
          easing,
          useNativeDriver: true,
        }).start(() => onComplete());
      }, SPLASH_ANIMATION.stage5Start);
    }

    return () => timers.forEach(clearTimeout);
  }, []);

  const backgroundColor = bgColorProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [COLORS.teal, theme === 'dark' ? COLORS.charcoal : COLORS.ivory],
  });

  const startWordmarkSrc = require('../../assets/brand/privi-wordmark-light.png');
  const endWordmarkSrc =
    theme === 'dark'
      ? require('../../assets/brand/privi-wordmark-light.png')
      : require('../../assets/brand/privi-wordmark-dark.png');

  const wrapperWidth = wordmarkGrowth.interpolate({
    inputRange: [0, 1],
    outputRange: [0, size.gap + wordmarkFinalWidth],
  });

  // Pure translateX slide — no scaleX. scaling the wordmark image
  // horizontally (its old approach) squished/stretched the letterforms
  // asymmetrically as it grew, which read as a rotation/skew rather than a
  // clean emergence (user-reported 2026-07-28). Sliding the full-size,
  // undistorted image in from fully behind the logo (-wordmarkFinalWidth)
  // to its resting spot (0), revealed by the wrapper's growing clip
  // window, gives a glide with no shape distortion at any point.
  const innerTranslateX = wordmarkGrowth.interpolate({
    inputRange: [0, 1],
    outputRange: [-wordmarkFinalWidth, 0],
  });

  return (
    <Animated.View
      style={[
        styles.container,
        destination === 'home'
          ? { backgroundColor: COLORS.teal, opacity: overlayOpacity }
          : { backgroundColor },
      ]}
    >
      <Animated.View
        style={[styles.lockup, { transform: [{ translateY: lockupTranslateY }] }]}
      >
        <View style={styles.iconRow}>
          <Animated.Image
            source={require('../../assets/brand/privi-logo.png')}
            resizeMode="contain"
            style={{ width: iconSize, height: iconSize }}
          />
          <Animated.View
            style={{
              width: wrapperWidth,
              height: wordmarkDisplayHeight,
              overflow: 'hidden',
            }}
          >
            <View
              style={{
                marginLeft: size.gap,
                width: wordmarkFinalWidth,
                height: wordmarkDisplayHeight,
                opacity: wordmarkGrowth,
                transform: [{ translateX: innerTranslateX }],
              }}
            >
              <Animated.Image
                source={startWordmarkSrc}
                resizeMode="contain"
                style={[
                  StyleSheet.absoluteFill,
                  { opacity: wordmarkCrossfade.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }) },
                ]}
              />
              <Animated.Image
                source={endWordmarkSrc}
                resizeMode="contain"
                style={[StyleSheet.absoluteFill, { opacity: wordmarkCrossfade }]}
              />
            </View>
          </Animated.View>
        </View>

        {destination === 'welcome' && (
          <Animated.View style={[styles.mottoWrap, { height: mottoHeight }]}>
            <Animated.View style={{ transform: [{ translateY: mottoTranslateY }] }}>
              <GoldGradientText style={styles.motto}>
                More for you.{'\n'}Every day.
              </GoldGradientText>
            </Animated.View>
          </Animated.View>
        )}
      </Animated.View>

      {destination === 'welcome' && (
        <Animated.View style={[styles.buttonsContainer, { opacity: buttonsOpacity }]} />
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
