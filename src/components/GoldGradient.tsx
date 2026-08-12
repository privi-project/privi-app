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
          // A plain View in a column-flex parent only sizes to its own
          // content height by default — it does NOT stretch to fill the
          // parent's height just because a margin is set. Without flex:1,
          // whenever this View's natural content height came out shorter
          // than the outer gradient's fixed height (the common case), the
          // uncovered gap showed through as extra gold gradient — visible
          // as a thick gold "slab" specifically at the bottom edge, since
          // an unstretched child sits at the top of its column container
          // by default. Confirmed live 2026-08-12 on Sign In's input
          // fields and the "Create account" button. This affects every
          // GoldGradientBorder usage app-wide, not just Sign In.
          flex: 1,
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
