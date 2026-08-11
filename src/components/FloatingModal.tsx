import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Modal, Animated, KeyboardAvoidingView, Platform } from 'react-native';
import { COLORS, OVERLAY } from '@/constants/colors';
import { GoldGradientBorder, GoldGradientText } from '@/components/GoldGradient';
import { useAppColorScheme } from '@/hooks/useAppColorScheme';

interface FloatingModalProps {
  visible: boolean;
  onClose: () => void;
  icon?: React.ReactNode;
  title: string;
  description?: string;
  children?: React.ReactNode;
}

// Shell for the "Floating Modal" pattern from 21_Modal_Pop_Ups_Screens.png /
// modal_animations.html's confirm modal — centred card, icon in a circle,
// X close top-right, title + description, dimmed backdrop, scale+fade
// motion (0.85->1, 0.25s ease, matching the founder-approved reference
// exactly rather than the app's other bezier/350ms bottom-sheet timing).
// Used for Forgot Password now; Sign Out / Location Permission / General
// Info (Phase 5+) should reuse this rather than building their own shell.
export function FloatingModal({ visible, onClose, icon, title, description, children }: FloatingModalProps) {
  const colorScheme = useAppColorScheme();
  const isDark = colorScheme === 'dark';

  const scale = useRef(new Animated.Value(0.85)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(scale, { toValue: 1, duration: 250, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 250, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(scale, { toValue: 0.85, duration: 250, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0, duration: 250, useNativeDriver: true }),
    ]).start(() => onClose());
  };

  const cardBg = isDark ? '#1E2126' : COLORS.ivory;
  const textColor = isDark ? COLORS.ivory : COLORS.charcoal;
  const subColor = isDark ? '#9CA3AF' : COLORS.mediumGray;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={handleClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: OVERLAY.darkStrong, opacity }]} />
        <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />

        <Animated.View style={[styles.card, { backgroundColor: cardBg, opacity, transform: [{ scale }] }]}>
          <Pressable style={styles.closeButton} onPress={handleClose} hitSlop={12}>
            <GoldGradientText style={styles.closeIcon}>✕</GoldGradientText>
          </Pressable>

          {icon ? (
            <GoldGradientBorder borderWidth={1.5} borderRadius={28} backgroundColor={cardBg} style={styles.iconCircle}>
              <View style={styles.iconCircleInner}>{icon}</View>
            </GoldGradientBorder>
          ) : null}

          <Text style={[styles.title, { color: textColor }]}>{title}</Text>
          {description ? (
            <Text style={[styles.description, { color: subColor }]}>{description}</Text>
          ) : null}

          {children}
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  card: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 20,
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 24,
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 1,
  },
  closeIcon: {
    fontSize: 18,
  },
  iconCircle: {
    width: 56,
    height: 56,
    marginBottom: 14,
  },
  iconCircleInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 6,
  },
  description: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 20,
  },
});
