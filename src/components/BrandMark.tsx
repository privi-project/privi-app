import React from 'react';
import { Image } from 'react-native';

// Intrinsic aspect ratios of the source PNG exports (same assets as website,
// see website/src/components/brand-mark.tsx — this is a direct port).
// LOGO_RATIO updated 2026-08-19 for the "Refined Privi Logo" replacement
// (915x1241, trimmed to real content bounds).
const LOGO_RATIO = 915 / 1241;
const WORDMARK_DARK_RATIO = 898 / 453;
const WORDMARK_LIGHT_RATIO = 951 / 489;

// Icon and wordmark are sized independently on purpose (see website memory:
// resizing the wordmark must not silently resize the icon).
// md was 74 until 2026-08-20 — read a few px too big on WelcomeScreen
// (the only place "md" is used). Must stay in sync with
// SplashAnimation.tsx's FINAL_SIZES.welcome.iconHeight — that's what the
// splash animates to, this is what WelcomeScreen's own static layout
// renders once the animation hands off, and the whole point of that
// handoff is landing on the exact same size.
const LOGO_HEIGHT_PX = { sm: 49, md: 70, lg: 126 };

// Wordmark rendered height is stretched relative to its width-derived base
// height — the source file reads slightly squashed/wide at its natural
// ratio, so height is deliberately stretched independently of width.
const WORDMARK_HEIGHT_STRETCH = 62 / 56;
const WORDMARK_BASE_HEIGHT_PX = { sm: 37, md: 56, lg: 80 };

type Size = 'sm' | 'md' | 'lg';

interface BrandMarkProps {
  size?: Size;
  /** Which background this lockup sits on — picks the matching wordmark colourway. */
  on?: 'light' | 'dark';
  style?: any;
}

/**
 * Wordmark image alone, no icon — used on legal-style / settings pages,
 * and (2026-08-20) most app headers. The combo "icon immediately left of
 * wordmark" component that used to live here (`BrandMark`) is gone —
 * the founder grew to dislike the icon sitting right next to the
 * wordmark, chased through several rounds of margin/size tuning, and the
 * decision was to stop juxtaposing them at all rather than keep tuning
 * it. Icon and wordmark are now always placed independently (see
 * HomeScreen.tsx etc. for the icon-left/wordmark-centre header pattern,
 * and WelcomeScreen.tsx / SplashAnimation.tsx for the vertical stack).
 */
export function Wordmark({ size = 'md', on = 'light', style }: BrandMarkProps) {
  const wordmarkBaseHeight = WORDMARK_BASE_HEIGHT_PX[size];
  const wordmarkDisplayHeight = Math.round(wordmarkBaseHeight * WORDMARK_HEIGHT_STRETCH);
  const wordmarkSrc =
    on === 'dark'
      ? require('../../assets/brand/privi-wordmark-light.png')
      : require('../../assets/brand/privi-wordmark-dark.png');
  const wordmarkRatio = on === 'dark' ? WORDMARK_LIGHT_RATIO : WORDMARK_DARK_RATIO;
  const wordmarkWidth = Math.round(wordmarkBaseHeight * wordmarkRatio);

  return (
    <Image
      source={wordmarkSrc}
      style={[{ width: wordmarkWidth, height: wordmarkDisplayHeight }, style]}
      resizeMode="contain"
    />
  );
}

/** Icon alone — used for headers, activity panel bell anchor, etc. */
export function BrandIcon({ size = 'md', style }: { size?: Size; style?: any }) {
  const logoHeight = LOGO_HEIGHT_PX[size];
  const logoWidth = Math.round(logoHeight * LOGO_RATIO);

  return (
    <Image
      source={require('../../assets/brand/privi-logo.png')}
      style={[{ width: logoWidth, height: logoHeight }, style]}
      resizeMode="contain"
    />
  );
}
