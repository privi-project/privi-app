import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Modal, Animated, KeyboardAvoidingView, Keyboard, Platform } from 'react-native';
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
  // Android only: RN's <Modal> renders in a separate native window that
  // doesn't inherit the app's own keyboard-resize behaviour, which is why
  // KeyboardAvoidingView alone doesn't work here (confirmed 2026-08-12 —
  // 'height' behavior broke the keyboard from appearing at all, reverted).
  // Bypassing that entirely: track the keyboard's real height directly and
  // shift the card up by an explicit animated offset instead of relying on
  // the (broken, for this specific case) automatic resize/pan behavior.
  // iOS is unaffected and keeps using KeyboardAvoidingView's 'padding' mode
  // below, which already works correctly there.
  const keyboardOffset = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(scale, { toValue: 1, duration: 250, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 250, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  useEffect(() => {
    if (Platform.OS !== 'android') return;

    const showSub = Keyboard.addListener('keyboardDidShow', (e) => {
      Animated.timing(keyboardOffset, {
        toValue: -(e.endCoordinates.height / 2),
        duration: 200,
        useNativeDriver: true,
      }).start();
    });
    const hideSub = Keyboard.addListener('keyboardDidHide', () => {
      Animated.timing(keyboardOffset, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

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
        // REVERTED 2026-08-12: tried 'height' on Android to fix the
        // keyboard covering modal content, but that broke something
        // worse — confirmed live, the keyboard stopped appearing AT ALL
        // when tapping the input inside this modal. Reverted to the
        // original 'undefined' (keyboard shows fine, just covers
        // content — the lesser, still-usable problem) rather than risk
        // guessing again at what 'height' specifically broke here
        // without being able to test on-device directly. Revisit with
        // more care/actual device iteration, not another blind guess.
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: OVERLAY.darkStrong, opacity }]} />
        <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />

        <Animated.View
          style={[
            styles.card,
            { backgroundColor: cardBg, opacity, transform: [{ scale }, { translateY: keyboardOffset }] },
          ]}
        >
          <Pressable style={styles.closeButton} onPress={handleClose} hitSlop={12}>
            <GoldGradientText style={styles.closeIcon}>✕</GoldGradientText>
          </Pressable>

          {icon ? (
            <GoldGradientBorder borderWidth={1.5} borderRadius={28} backgroundColor={cardBg} style={styles.iconCircle} fillHeight>
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
