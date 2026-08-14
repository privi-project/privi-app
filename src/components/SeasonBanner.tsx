import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { COLORS } from '@/constants/colors';
import { SeasonBanner as SeasonBannerData } from '@/services/banners';

interface SeasonBannerProps {
  banner: SeasonBannerData;
  onPress: (banner: SeasonBannerData) => void;
}

/**
 * Promo card at the top of Home's business feed. Same footprint as a
 * business card but teal fill / ivory text, no logo slot — visually
 * distinct from a real business listing on purpose. Only ever rendered
 * when Admin Portal has an is_active banner; never a placeholder.
 *
 * No horizontal margin of its own (2026-08-13) — HomeScreen renders this
 * as the business FlatList's ListHeaderComponent (fixed 2026-08-13: it
 * used to sit as a fixed sibling ABOVE the list instead, eating
 * permanent vertical space rather than scrolling away with the cards),
 * so horizontal inset now comes from the list's own contentContainerStyle
 * padding, same as every business card.
 *
 * Redesigned 2026-08-13 per founder review (v2, after a first pass with
 * a border + separate left accent stripe felt off): single thin gold
 * border (no stripe), centered gold title sized up from the body so it
 * actually reads as a headline, a gold divider between title and body,
 * and centered body/CTA to match the centered title rather than mixing
 * alignments. "Discover more →" replaces the old bare arrow — hard to
 * notice as tappable. Whole card is one Pressable whenever action_type
 * !== 'none' (external_link opens action_url, categories filters Home —
 * both already built in HomeScreen's handleBannerPress).
 */
export function SeasonBanner({ banner, onPress }: SeasonBannerProps) {
  const isActionable = banner.action_type !== 'none';

  return (
    <Pressable
      style={styles.card}
      onPress={() => isActionable && onPress(banner)}
      disabled={!isActionable}
    >
      <Text style={styles.title}>{banner.title}</Text>
      <View style={styles.divider} />
      <Text style={styles.message}>{banner.message}</Text>
      {isActionable && <Text style={styles.cta}>Discover more →</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.teal,
    borderWidth: 1,
    borderColor: COLORS.gold,
    borderRadius: 14,
    padding: 18,
    marginBottom: 20,
  },
  title: {
    // Reverted 2026-08-13 — bumped to 18 in the first pass to read as a
    // clearer headline, but founder felt it didn't match the rest of the
    // feed (business cards' own name text is 14 — see businessName in
    // HomeScreen.tsx) and looked oversized. Matching that instead.
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.gold,
    textAlign: 'center',
    marginBottom: 10,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.gold,
    opacity: 0.45,
    marginBottom: 10,
  },
  message: {
    fontSize: 12.5,
    color: 'rgba(247,246,242,0.9)',
    lineHeight: 18,
    textAlign: 'center',
    marginBottom: 14,
  },
  cta: {
    fontSize: 12.5,
    fontWeight: '700',
    color: COLORS.gold,
    textAlign: 'center',
  },
});
