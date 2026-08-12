import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { COLORS } from '@/constants/colors';
import { MailIcon, CheckIcon } from '@/components/NavIcons';
import { FloatingModal } from '@/components/FloatingModal';
import { GoldGradientText, GoldGradientBorder } from '@/components/GoldGradient';
import { supabase } from '@/services/supabase';
import { useAppColorScheme } from '@/hooks/useAppColorScheme';
import { PASSWORD_RESET_REDIRECT_URL } from '@/constants/authLinks';
import { noOutline } from '@/utils/webStyles';

interface ForgotPasswordModalProps {
  visible: boolean;
  onClose: () => void;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function ForgotPasswordModal({ visible, onClose }: ForgotPasswordModalProps) {
  const colorScheme = useAppColorScheme();
  const isDark = colorScheme === 'dark';

  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (visible) {
      setEmail('');
      setError('');
      setSuccess(false);
    }
  }, [visible]);

  const handleSendResetLink = async () => {
    setError('');
    if (!EMAIL_REGEX.test(email)) {
      setError('Please enter a valid email address.');
      return;
    }

    setLoading(true);
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: PASSWORD_RESET_REDIRECT_URL,
      });

      if (resetError) {
        setError(resetError.message);
        setLoading(false);
        return;
      }

      setLoading(false);
      setSuccess(true);
      setTimeout(onClose, 2000);
    } catch (e) {
      setError('Something went wrong. Please try again.');
      setLoading(false);
    }
  };

  const textColor = isDark ? COLORS.ivory : COLORS.charcoal;
  const placeholderColor = isDark ? '#9CA3AF' : COLORS.mediumGray;

  if (success) {
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
      title="Forgot your password?"
      description="Enter your email address and we'll send you a link to reset your password."
    >
      <View style={styles.form}>
        <Text style={[styles.label, { color: textColor }]}>Email address</Text>
        <GoldGradientBorder
          borderWidth={1}
          borderRadius={12}
          backgroundColor={isDark ? '#2A2D34' : COLORS.white}
          style={styles.inputWrap}
        >
          <TextInput
            style={[styles.input, { color: textColor }, noOutline]}
            placeholder="Enter your email"
            placeholderTextColor={placeholderColor}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            editable={!loading}
          />
        </GoldGradientBorder>
        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <Pressable
          style={loading ? styles.primaryButtonDisabled : undefined}
          onPress={handleSendResetLink}
          disabled={loading}
        >
          <GoldGradientBorder borderWidth={1.5} borderRadius={12} backgroundColor={COLORS.teal} style={styles.primaryButton} fillHeight>
            <View style={styles.primaryButtonInner}>
              {loading ? (
                <ActivityIndicator color={COLORS.ivory} />
              ) : (
                <Text style={styles.primaryButtonText}>Send reset link</Text>
              )}
            </View>
          </GoldGradientBorder>
        </Pressable>

        <Pressable onPress={onClose} hitSlop={8} style={styles.cancelLink}>
          <GoldGradientText style={styles.cancelText}>Cancel</GoldGradientText>
        </Pressable>
      </View>
    </FloatingModal>
  );
}

const styles = StyleSheet.create({
  form: {
    width: '100%',
    alignItems: 'center',
  },
  label: {
    alignSelf: 'flex-start',
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 6,
  },
  inputWrap: {
    width: '100%',
    marginBottom: 4,
  },
  input: {
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 14,
  },
  errorText: {
    alignSelf: 'flex-start',
    color: '#D64545',
    fontSize: 12,
    marginBottom: 8,
    marginTop: 4,
  },
  primaryButton: {
    width: '100%',
    height: 52,
    marginTop: 12,
  },
  primaryButtonInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonDisabled: {
    opacity: 0.7,
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
