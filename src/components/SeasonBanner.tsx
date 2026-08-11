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
 */
export function SeasonBanner({ banner, onPress }: SeasonBannerProps) {
  const isActionable = banner.action_type !== 'none';

  return (
    <View>
      <Pressable
        style={styles.card}
        onPress={() => isActionable && onPress(banner)}
        disabled={!isActionable}
      >
        <Text style={styles.title}>{banner.title}</Text>
        <Text style={styles.message}>{banner.message}</Text>
        {isActionable && <Text style={styles.cta}>→</Text>}
      </Pressable>
      <View style={styles.divider} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.teal,
    borderRadius: 14,
    padding: 16,
    marginHorizontal: 20,
    marginBottom: 16,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.ivory,
    marginBottom: 4,
  },
  message: {
    fontSize: 12,
    color: 'rgba(247,246,242,0.9)',
    lineHeight: 17,
  },
  cta: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.gold,
    marginTop: 8,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.gold,
    marginHorizontal: 20,
    marginBottom: 16,
    opacity: 0.4,
  },
});
