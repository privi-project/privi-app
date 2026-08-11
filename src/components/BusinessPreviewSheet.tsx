import React, { useEffect, useRef } from 'react';
import { View, Text, Image, StyleSheet, Pressable, Modal, Animated, Easing } from 'react-native';
import { COLORS } from '@/constants/colors';
import { GoldGradientText } from '@/components/GoldGradient';
import { useAppColorScheme } from '@/hooks/useAppColorScheme';

export interface PreviewBusiness {
  name: string;
  short_description: string | null;
  logo_url: string | null;
}

interface BusinessPreviewSheetProps {
  visible: boolean;
  business: PreviewBusiness | null;
  onClose: () => void;
  onSeeOffers: () => void;
  /** Omit to hide the row entirely (e.g. no coordinates for this pin). */
  onGetDirections?: () => void;
}

// Matches "2. MAP BUSINESS MODAL (TOP SHEET)" from PRIVI_Screen_Rules —
// logo, name, descriptor, "See offers →" link, with "Get directions →"
// underneath it (per founder request 2026-07-28, added after the initial
// build). No visible Cancel: dismiss is tap-outside or swipe-down, per the
// drag handle.
export function BusinessPreviewSheet({
  visible,
  business,
  onClose,
  onSeeOffers,
  onGetDirections,
}: BusinessPreviewSheetProps) {
  const colorScheme = useAppColorScheme();
  const isDark = colorScheme === 'dark';
  const translateY = useRef(new Animated.Value(300)).current;

  useEffect(() => {
    if (visible) {
      Animated.timing(translateY, {
        toValue: 0,
        duration: 350,
        easing: Easing.bezier(0.45, 0, 0.2, 1),
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  const handleClose = () => {
    Animated.timing(translateY, {
      toValue: 300,
      duration: 250,
      easing: Easing.bezier(0.45, 0, 0.2, 1),
      useNativeDriver: true,
    }).start(() => onClose());
  };

  const handleSeeOffers = () => {
    Animated.timing(translateY, {
      toValue: 300,
      duration: 250,
      easing: Easing.bezier(0.45, 0, 0.2, 1),
      useNativeDriver: true,
    }).start(() => {
      onClose();
      onSeeOffers();
    });
  };

  const handleGetDirections = () => {
    Animated.timing(translateY, {
      toValue: 300,
      duration: 250,
      easing: Easing.bezier(0.45, 0, 0.2, 1),
      useNativeDriver: true,
    }).start(() => {
      onClose();
      onGetDirections?.();
    });
  };

  // Matches the app's actual theme surfaces (ivory/charcoal), not a
  // separate "card white"/"card dark" tone — and non-clickable text is
  // always the flat charcoal-on-ivory / ivory-on-charcoal pair, no muted
  // grey secondary tone, per founder direction (2026-07-28).
  const bg = isDark ? COLORS.charcoal : COLORS.ivory;
  const textColor = isDark ? COLORS.ivory : COLORS.charcoal;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={handleClose}>
      <View style={styles.overlay} pointerEvents="box-none">
        <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
        <Animated.View style={[styles.sheet, { backgroundColor: bg, transform: [{ translateY }] }]}>
          <View style={styles.dragHandle} />
          {business && (
            <View style={styles.row}>
              {business.logo_url ? (
                <Image source={{ uri: business.logo_url }} style={styles.logo} />
              ) : (
                <View style={[styles.logo, styles.logoFallback]} />
              )}
              <View style={styles.textCol}>
                <Text style={[styles.name, { color: textColor }]} numberOfLines={1}>
                  {business.name}
                </Text>
                {business.short_description ? (
                  <Text style={[styles.descriptor, { color: textColor }]} numberOfLines={1}>
                    {business.short_description}
                  </Text>
                ) : null}
                <Pressable onPress={handleSeeOffers} hitSlop={6}>
                  <GoldGradientText style={styles.link}>See offers →</GoldGradientText>
                </Pressable>
                {onGetDirections ? (
                  <Pressable onPress={handleGetDirections} hitSlop={6} style={styles.secondLink}>
                    <GoldGradientText style={styles.link}>Get directions →</GoldGradientText>
                  </Pressable>
                ) : null}
              </View>
            </View>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 36,
  },
  dragHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(150,150,150,0.4)',
    alignSelf: 'center',
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    gap: 14,
  },
  logo: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: COLORS.charcoal,
  },
  logoFallback: {
    backgroundColor: COLORS.charcoal,
  },
  textCol: {
    flex: 1,
    justifyContent: 'center',
  },
  name: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 2,
  },
  descriptor: {
    fontSize: 13,
    marginBottom: 6,
  },
  link: {
    fontSize: 13,
    fontWeight: '600',
  },
  secondLink: {
    marginTop: 6,
  },
});
