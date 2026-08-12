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
  /**
   * Pass true ONLY when the caller's `style` sets an explicit `height`
   * (e.g. inputs, buttons, the fixed-size category circles) — makes the
   * inner content stretch to fill that height, closing a gold gap that
   * otherwise shows at the bottom edge whenever content comes out
   * shorter than the box. Leave false/omitted for content-sized usage
   * (cards, panels, anything without an explicit height) — flex:1 there
   * collapses the box to almost nothing instead, confirmed on a real
   * device 2026-08-12 (AccountScreen's cards, NotificationPanel). A
   * single automatic behavior can't correctly serve both cases at once,
   * so this is an explicit per-caller choice, not a guess.
   */
  fillHeight?: boolean;
}

export function GoldGradientBorder({
  children,
  borderWidth = 1.5,
  borderRadius = 12,
  backgroundColor,
  style,
  fillHeight = false,
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
          // flex:1 only when the caller opts in via fillHeight (see prop
          // doc) — unconditional flex:1 here previously broke every
          // content-sized usage (AccountScreen's cards, NotificationPanel
          // collapsed to almost nothing), confirmed on a real device
          // 2026-08-12. Explicit-height callers (inputs, buttons, the
          // category circles) need it to close the bottom gold gap;
          // content-sized callers need its absence to size correctly.
          ...(fillHeight ? { flex: 1 } : null),
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
