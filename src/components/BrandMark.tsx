import React from 'react';
import { View, Image, StyleSheet } from 'react-native';

// Intrinsic aspect ratios of the source PNG exports (same assets as website,
// see website/src/components/brand-mark.tsx — this is a direct port).
// LOGO_RATIO updated 2026-08-19 for the "Refined Privi Logo" replacement
// (915x1241, trimmed to real content bounds).
const LOGO_RATIO = 915 / 1241;
const WORDMARK_DARK_RATIO = 898 / 453;
const WORDMARK_LIGHT_RATIO = 951 / 489;

// Icon and wordmark are sized independently on purpose (see website memory:
// resizing the wordmark must not silently resize the icon).
const LOGO_HEIGHT_PX = { sm: 49, md: 74, lg: 126 };

// Wordmark rendered height is stretched relative to its width-derived base
// height — the source file reads slightly squashed/wide at its natural
// ratio, so height is deliberately stretched independently of width.
const WORDMARK_HEIGHT_STRETCH = 62 / 56;
const WORDMARK_BASE_HEIGHT_PX = { sm: 37, md: 56, lg: 80 };

// Gap between icon and wordmark. The website's own screenshot-calibrated
// negative margins do NOT transfer to React Native's Image renderer —
// tested directly (4-5x zoom screenshots) with the OLD logo asset and the
// ported values caused the icon's tail to visibly overlap the wordmark's
// "p" at both sm and md, so this has always been calibrated separately
// from the website.
//
// 2026-08-20 ("Refined Privi Logo" swap): sm:4/md:6 read as too tight per
// user feedback looking at real Welcome/sign-in renders. Retuned to match
// the website's own gap:iconHeight ratio (~0.18, consistent across its
// md/lg) rather than guessing a new absolute value — sm: 49*0.18≈9,
// md: 74*0.18≈13. The new master logo (915x1241, trimmed to real content
// bounds) crops far more predictably under resizeMode="contain" than the
// old asset did, so this ratio-based approach is safe now even though the
// original cross-renderer warning above (don't port website px values
// verbatim) still holds for any future logo replacement.
const WORDMARK_MARGIN_PX = { sm: 9, md: 13, lg: 10 };

type Size = 'sm' | 'md' | 'lg';

interface BrandMarkProps {
  size?: Size;
  /** Which background this lockup sits on — picks the matching wordmark colourway. */
  on?: 'light' | 'dark';
  style?: any;
}

/**
 * Full brand lockup: gold icon immediately left of the "privi" wordmark.
 * Mirrors website's BrandMark component exactly — same assets, same ratios.
 */
export function BrandMark({ size = 'md', on = 'light', style }: BrandMarkProps) {
  const logoHeight = LOGO_HEIGHT_PX[size];
  const wordmarkBaseHeight = WORDMARK_BASE_HEIGHT_PX[size];
  const wordmarkMarginLeft = WORDMARK_MARGIN_PX[size];
  const wordmarkDisplayHeight = Math.round(wordmarkBaseHeight * WORDMARK_HEIGHT_STRETCH);

  const wordmarkSrc =
    on === 'dark'
      ? require('../../assets/brand/privi-wordmark-light.png')
      : require('../../assets/brand/privi-wordmark-dark.png');
  const wordmarkRatio = on === 'dark' ? WORDMARK_LIGHT_RATIO : WORDMARK_DARK_RATIO;

  const logoWidth = Math.round(logoHeight * LOGO_RATIO);
  const wordmarkWidth = Math.round(wordmarkBaseHeight * wordmarkRatio);

  return (
    <View style={[styles.container, style]}>
      <Image
        source={require('../../assets/brand/privi-logo.png')}
        style={{ width: logoWidth, height: logoHeight }}
        resizeMode="contain"
      />
      <Image
        source={wordmarkSrc}
        style={{
          width: wordmarkWidth,
          height: wordmarkDisplayHeight,
          marginLeft: wordmarkMarginLeft,
        }}
        resizeMode="contain"
      />
    </View>
  );
}

/** Wordmark image alone, no icon — used on legal-style / settings pages. */
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

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
