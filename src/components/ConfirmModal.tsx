import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { COLORS } from '@/constants/colors';
import { GoldGradientText } from '@/components/GoldGradient';
import { FloatingModal } from '@/components/FloatingModal';

interface ConfirmModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
  icon: React.ReactNode;
  title: string;
  description?: string;
  confirmLabel: string;
}

// Generic yes/no version of SignOutModal's shell — for any action that
// hands off to a different app (phone dialer, maps app) where a stray tap
// shouldn't silently kick the member out of Privi. Confirming closes the
// modal itself; callers just do the handoff in onConfirm.
export function ConfirmModal({
  visible,
  onClose,
  onConfirm,
  icon,
  title,
  description,
  confirmLabel,
}: ConfirmModalProps) {
  const handleConfirm = () => {
    onClose();
    onConfirm();
  };

  return (
    <FloatingModal visible={visible} onClose={onClose} icon={icon} title={title} description={description}>
      <View style={styles.actions}>
        <Pressable style={styles.primaryButton} onPress={handleConfirm}>
          <Text style={styles.primaryButtonText}>{confirmLabel}</Text>
        </Pressable>
        <Pressable onPress={onClose} hitSlop={8} style={styles.cancelLink}>
          <GoldGradientText style={styles.cancelText}>Cancel</GoldGradientText>
        </Pressable>
      </View>
    </FloatingModal>
  );
}

const styles = StyleSheet.create({
  actions: {
    width: '100%',
    alignItems: 'center',
  },
  primaryButton: {
    width: '100%',
    backgroundColor: COLORS.teal,
    borderWidth: 1.5,
    borderColor: COLORS.gold,
    borderRadius: 12,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: COLORS.ivory,
    fontSize: 15,
    fontWeight: '600',
  },
  cancelLink: {
    marginTop: 14,
  },
  cancelText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
