import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Modal, Animated, Easing } from 'react-native';
import { COLORS } from '@/constants/colors';
import { GoldGradientText, GoldGradientBorder } from '@/components/GoldGradient';
import { useAppColorScheme } from '@/hooks/useAppColorScheme';

const DISTANCE_OPTIONS = [5, 10, 25, 50];

// Category used to be selectable in here too, duplicating the category row
// already on Home — same filter, two different controls for it. Removed.
interface FilterModalProps {
  visible: boolean;
  onClose: () => void;
  selectedDistance: number | null;
  accessibleOnly: boolean;
  favouritesOnly: boolean;
  onApply: (distance: number | null, accessibleOnly: boolean, favouritesOnly: boolean) => void;
}

export function FilterModal({
  visible,
  onClose,
  selectedDistance,
  accessibleOnly: initialAccessibleOnly,
  favouritesOnly: initialFavouritesOnly,
  onApply,
}: FilterModalProps) {
  const colorScheme = useAppColorScheme();
  const isDark = colorScheme === 'dark';

  const [distance, setDistance] = useState(selectedDistance);
  const [accessibleOnly, setAccessibleOnly] = useState(initialAccessibleOnly);
  const [favouritesOnly, setFavouritesOnly] = useState(initialFavouritesOnly);

  const translateY = useRef(new Animated.Value(400)).current;

  useEffect(() => {
    if (visible) {
      setDistance(selectedDistance);
      setAccessibleOnly(initialAccessibleOnly);
      setFavouritesOnly(initialFavouritesOnly);
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
      toValue: 400,
      duration: 250,
      easing: Easing.bezier(0.45, 0, 0.2, 1),
      useNativeDriver: true,
    }).start(() => onClose());
  };

  const handleClear = () => {
    setDistance(null);
    setAccessibleOnly(false);
    setFavouritesOnly(false);
  };

  const handleShowResults = () => {
    onApply(distance, accessibleOnly, favouritesOnly);
    handleClose();
  };

  const bg = isDark ? COLORS.charcoal : COLORS.ivory;
  const textColor = isDark ? COLORS.ivory : COLORS.charcoal;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
        <Animated.View style={[styles.sheet, { backgroundColor: bg, transform: [{ translateY }] }]}>
          <View style={styles.dragHandle} />

          <View style={styles.headerRow}>
            <Text style={[styles.heading, { color: textColor }]}>Filters</Text>
            <Pressable onPress={handleClear}>
              <GoldGradientText style={styles.clearLink}>Clear</GoldGradientText>
            </Pressable>
          </View>

          <Text style={[styles.label, { color: textColor }]}>Distance</Text>
          <View style={styles.chipRow}>
            {DISTANCE_OPTIONS.map((d) => {
              const selected = distance === d;
              return (
                <Pressable key={d} onPress={() => setDistance(selected ? null : d)}>
                  {selected ? (
                    <View style={[styles.chipInner, styles.chipSelected]}>
                      <Text style={[styles.chipText, { color: COLORS.ivory }]}>{d} miles</Text>
                    </View>
                  ) : (
                    <GoldGradientBorder borderWidth={1.5} borderRadius={8} backgroundColor={bg}>
                      <View style={styles.chipInner}>
                        <Text style={[styles.chipText, { color: textColor }]}>{d} miles</Text>
                      </View>
                    </GoldGradientBorder>
                  )}
                </Pressable>
              );
            })}
          </View>

          <Text style={[styles.label, { color: textColor, marginTop: 20 }]}>More filters</Text>
          <View style={styles.chipRow}>
            <Pressable onPress={() => setAccessibleOnly((v) => !v)}>
              {accessibleOnly ? (
                <View style={[styles.chipInner, styles.chipSelected]}>
                  <Text style={[styles.chipText, { color: COLORS.ivory }]}>♿ Accessible</Text>
                </View>
              ) : (
                <GoldGradientBorder borderWidth={1.5} borderRadius={8} backgroundColor={bg}>
                  <View style={styles.chipInner}>
                    <Text style={[styles.chipText, { color: textColor }]}>♿ Accessible</Text>
                  </View>
                </GoldGradientBorder>
              )}
            </Pressable>
            <Pressable onPress={() => setFavouritesOnly((v) => !v)}>
              {favouritesOnly ? (
                <View style={[styles.chipInner, styles.chipSelected]}>
                  <Text style={[styles.chipText, { color: COLORS.ivory }]}>♥ Favourites only</Text>
                </View>
              ) : (
                <GoldGradientBorder borderWidth={1.5} borderRadius={8} backgroundColor={bg}>
                  <View style={styles.chipInner}>
                    <Text style={[styles.chipText, { color: textColor }]}>♥ Favourites only</Text>
                  </View>
                </GoldGradientBorder>
              )}
            </Pressable>
          </View>

          <Pressable onPress={handleShowResults}>
            <GoldGradientBorder borderWidth={1.5} borderRadius={12} backgroundColor={COLORS.teal} style={styles.primaryButton}>
              <View style={styles.primaryButtonInner}>
                <Text style={styles.primaryButtonText}>Show results</Text>
              </View>
            </GoldGradientBorder>
          </Pressable>
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
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 40,
    maxHeight: '80%',
  },
  dragHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(150,150,150,0.4)',
    alignSelf: 'center',
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  heading: {
    fontSize: 20,
    fontWeight: '700',
  },
  clearLink: {
    fontSize: 13,
    fontWeight: '500',
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 10,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  chipInner: {
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  chipSelected: {
    backgroundColor: COLORS.teal,
    borderWidth: 1.5,
    borderColor: COLORS.teal,
    borderRadius: 8,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  primaryButton: {
    height: 52,
    marginTop: 24,
  },
  primaryButtonInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: COLORS.ivory,
    fontSize: 15,
    fontWeight: '600',
  },
});
