import React from 'react';
import { View, Image, StyleSheet, Dimensions } from 'react-native';
import { COLORS } from '@/constants/colors';

const LOGO_RATIO = 915 / 1241; // updated 2026-08-19 for the Refined Privi Logo replacement
const { height: SCREEN_HEIGHT } = Dimensions.get('window');
// Kept in sync with SplashAnimation.tsx's ICON_START_HEIGHT (0.2 -> 0.15,
// 2026-08-20 — opening icon read as too big per user feedback).
const ICON_START_HEIGHT = SCREEN_HEIGHT * 0.15;

/**
 * Static frame matching SplashAnimation's Stage 1 exactly (teal bg, icon
 * alone at 20% of screen height, centred) — no animation. Shown while
 * auth status is still resolving, or briefly for an already-signed-in
 * member before the root-level overlay takes over, so there's never a
 * flash of Welcome's buttons (or anything else) before the real splash
 * has had a chance to start.
 */
export function SplashHold() {
  return (
    <View style={styles.container}>
      <Image
        source={require('../../assets/brand/privi-logo.png')}
        resizeMode="contain"
        style={{ width: ICON_START_HEIGHT * LOGO_RATIO, height: ICON_START_HEIGHT }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.teal,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
