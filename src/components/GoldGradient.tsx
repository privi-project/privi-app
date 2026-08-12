import React from 'react';
import { View, Text, TextStyle, StyleProp, ViewStyle, StyleSheet, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import MaskedView from '@react-native-masked-view/masked-view';
import { COLORS, GOLD_GRADIENT_STOPS, GOLD_GRADIENT_LOCATIONS } from '@/constants/colors';

const GRADIENT_PROPS = {
  colors: GOLD_GRADIENT_STOPS,
  locations: GOLD_GRADIENT_LOCATIONS,
  start: { x: 0, y: 0 },
  end: { x: 0, y: 1 },
};

// @react-native-masked-view/masked-view's web implementation is a no-op
// passthrough (js/MaskedView.web.js just renders maskElement, dropping the
// gradient entirely) — real masking only happens on native iOS/Android.
// react-native-web forwards unknown style keys straight to the DOM, so on
// web we instead port the website's own CSS technique directly
// (background-clip:text / the padding-box+border-box border trick from
// globals.css's .privi-gold-text / .privi-gold-border) for visual parity.
const GRADIENT_CSS = `linear-gradient(180deg, ${GOLD_GRADIENT_STOPS[0]} 0%, ${GOLD_GRADIENT_STOPS[1]} 32%, ${GOLD_GRADIENT_STOPS[2]} 68%, ${GOLD_GRADIENT_STOPS[3]} 100%)`;

interface GoldGradientTextProps {
  children: React.ReactNode;
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
}

export function GoldGradientText({ children, style, numberOfLines }: GoldGradientTextProps) {
  if (Platform.OS === 'web') {
    return (
      <Text
        style={[
          style,
          {
            backgroundImage: GRADIENT_CSS,
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            color: 'transparent',
            WebkitTextFillColor: 'transparent',
          } as any,
        ]}
        numberOfLines={numberOfLines}
      >
        {children}
      </Text>
    );
  }

  return (
    <MaskedView maskElement={<Text style={style} numberOfLines={numberOfLines}>{children}</Text>}>
      <LinearGradient {...GRADIENT_PROPS}>
        <Text style={[style, styles.hiddenTextForSizing]} numberOfLines={numberOfLines}>
          {children}
        </Text>
      </LinearGradient>
    </MaskedView>
  );
}

interface GoldGradientBorderProps {
  children: React.ReactNode;
  borderWidth?: number;
  borderRadius?: number;
  /** The surface colour behind the border — must match whatever sits under it. */
  backgroundColor: string;
  style?: StyleProp<ViewStyle>;
}

export function GoldGradientBorder({
  children,
  borderWidth = 1.5,
  borderRadius = 12,
  backgroundColor,
  style,
}: GoldGradientBorderProps) {
  if (Platform.OS === 'web') {
    // The multi-layer background-image border trick (website's own
    // .privi-gold-border technique) fought react-native-web's atomic CSS
    // compiler badly enough to blow out layout width — borders are thin
    // (1.5px) where gradient vs. flat is barely perceptible anyway, unlike
    // text, so web falls back to the flat mid-tone gold here instead.
    return (
      <View
        style={[
          { borderRadius, borderWidth, borderColor: COLORS.gold, backgroundColor },
          style,
        ]}
      >
        {children}
      </View>
    );
  }

  return (
    <LinearGradient {...GRADIENT_PROPS} style={[{ borderRadius }, style]}>
      <View
        style={{
          // REVERTED 2026-08-12: flex:1 here was added to fix a gold gap
          // showing on Sign In's fixed-height inputs/buttons, but it broke
          // every GoldGradientBorder usage that DOESN'T have an explicit
          // height on the outer (content-sized cards/panels, e.g.
          // AccountScreen's menu cards, NotificationPanel) — those
          // collapsed to almost nothing (just a thin gold line), a much
          // worse regression than the gap it fixed. Confirmed live on a
          // real device. Reverted to the original margin-only approach,
          // which is correct for content-sized usage; the fixed-height
          // gap is a real but lower-severity cosmetic issue, tracked
          // separately rather than risking another broken fix here.
          margin: borderWidth,
          borderRadius: Math.max(borderRadius - borderWidth, 0),
          backgroundColor,
          overflow: 'hidden',
        }}
      >
        {children}
      </View>
    </LinearGradient>
  );
}

interface GoldGradientFillProps {
  style?: StyleProp<ViewStyle>;
}

/** Solid gold gradient fill — dividers, icon backgrounds, decorative shapes. */
export function GoldGradientFill({ style }: GoldGradientFillProps) {
  if (Platform.OS === 'web') {
    return <View style={[{ backgroundImage: GRADIENT_CSS } as any, style]} />;
  }
  return <LinearGradient {...GRADIENT_PROPS} style={style} />;
}

const styles = StyleSheet.create({
  hiddenTextForSizing: {
    opacity: 0,
  },
});
