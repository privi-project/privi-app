import React from 'react';
import { View, Image, StyleSheet } from 'react-native';

// Intrinsic aspect ratios of the source PNG exports (same assets as website,
// see website/src/components/brand-mark.tsx — this is a direct port).
const LOGO_RATIO = 1218 / 1536;
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
// negative margins (sm:-4, md:-18, lg:19) do NOT transfer to React Native's
// Image renderer — tested directly (4-5x zoom screenshots) and the ported
// values caused the icon's tail to visibly overlap the wordmark's "p" at
// both sm and md. RN's "contain" fit crops each source PNG's transparent
// edge padding differently than the website's <img>, so the same px value
// produces a different visual gap. Recalibrated for RN specifically — 0 was
// confirmed clean/non-overlapping; bumped to a small positive gap per user
// feedback wanting more breathing room between icon and wordmark.
const WORDMARK_MARGIN_PX = { sm: 4, md: 6, lg: 10 };

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
