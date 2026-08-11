import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { COLORS } from '@/constants/colors';
import { GoldGradientText } from '@/components/GoldGradient';
import { MailIcon, CheckIcon } from '@/components/NavIcons';
import { FloatingModal } from '@/components/FloatingModal';
import { supabase } from '@/services/supabase';

interface ChangePasswordModalProps {
  visible: boolean;
  onClose: () => void;
  email: string;
}

// "Change Password → Opens confirmation modal to send password reset
// email" (Personal Information Page spec) — the member's own email is
// already known from their session, so unlike the sign-in flow's Forgot
// Password modal, there's no email field to fill in here.
export function ChangePasswordModal({ visible, onClose, email }: ChangePasswordModalProps) {
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (visible) setSent(false);
  }, [visible]);

  const handleSend = async () => {
    setLoading(true);
    try {
      await supabase.auth.resetPasswordForEmail(email, { redirectTo: 'privi://reset-password' });
      setSent(true);
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <FloatingModal
        visible={visible}
        onClose={onClose}
        icon={<CheckIcon color={COLORS.gold} size={26} />}
        title="Check your email"
        description={`We've sent a password reset link to ${email}`}
      />
    );
  }

  return (
    <FloatingModal
      visible={visible}
      onClose={onClose}
      icon={<MailIcon color={COLORS.gold} size={26} />}
      title="Change Password"
      description="We'll send a password reset link to your email address."
    >
      <View style={styles.actions}>
        <Pressable style={styles.primaryButton} onPress={handleSend} disabled={loading}>
          {loading ? (
            <ActivityIndicator color={COLORS.ivory} />
          ) : (
            <Text style={styles.primaryButtonText}>Send reset link</Text>
          )}
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
