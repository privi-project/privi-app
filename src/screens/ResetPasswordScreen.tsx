import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import { COLORS } from '@/constants/colors';
import { BrandMark } from '@/components/BrandMark';
import { GoldGradientBorder } from '@/components/GoldGradient';
import { supabase } from '@/services/supabase';
import { noOutline } from '@/utils/webStyles';
import { useAppColorScheme } from '@/hooks/useAppColorScheme';

export default function ResetPasswordScreen() {
  const router = useRouter();
  const url = Linking.useURL();
  const colorScheme = useAppColorScheme();
  const theme = colorScheme === 'dark' ? 'dark' : 'light';
  const isDark = theme === 'dark';

  const [exchanging, setExchanging] = useState(true);
  const [sessionReady, setSessionReady] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const backgroundColor = isDark ? COLORS.charcoal : COLORS.ivory;
  const textColor = isDark ? COLORS.ivory : COLORS.charcoal;
  const placeholderColor = isDark ? '#9CA3AF' : COLORS.mediumGray;
  const inputBg = isDark ? COLORS.charcoal : COLORS.white;

  useEffect(() => {
    (async () => {
      if (!url) return;
      const { queryParams } = Linking.parse(url);
      const code = queryParams?.code as string | undefined;

      if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        if (exchangeError) {
          setError('This reset link has expired. Please request a new one.');
        } else {
          setSessionReady(true);
        }
      } else {
        setError('This reset link is invalid. Please request a new one.');
      }
      setExchanging(false);
    })();
  }, [url]);

  const handleSetPassword = async () => {
    setError('');
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setSuccess(true);
    setTimeout(() => {
      router.replace('/sign-in');
    }, 2000);
  };

  return (
    <View style={[styles.container, { backgroundColor }]}>
      <View style={styles.header}>
        <BrandMark size="sm" on={isDark ? 'dark' : 'light'} />
      </View>

      {exchanging ? (
        <View style={styles.centered}>
          <ActivityIndicator color={COLORS.teal} />
        </View>
      ) : success ? (
        <View style={styles.centered}>
          <Text style={[styles.heading, { color: textColor }]}>Password updated</Text>
          <Text style={[styles.subheading, { color: placeholderColor }]}>
            Redirecting you to sign in…
          </Text>
        </View>
      ) : sessionReady ? (
        <KeyboardAvoidingView style={styles.content} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <Text style={[styles.heading, { color: textColor }]}>Set a new password</Text>
          <Text style={[styles.subheading, { color: placeholderColor }]}>
            Choose a new password for your account.
          </Text>

          <Text style={[styles.label, { color: textColor }]}>New password</Text>
          <GoldGradientBorder borderWidth={1} borderRadius={12} backgroundColor={inputBg} style={styles.inputWrap}>
            <TextInput
              style={[styles.input, { color: textColor }, noOutline]}
              placeholder="Enter new password"
              placeholderTextColor={placeholderColor}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              editable={!loading}
            />
          </GoldGradientBorder>

          <Text style={[styles.label, { color: textColor }]}>Confirm password</Text>
          <GoldGradientBorder borderWidth={1} borderRadius={12} backgroundColor={inputBg} style={styles.inputWrap}>
            <TextInput
              style={[styles.input, { color: textColor }, noOutline]}
              placeholder="Confirm new password"
              placeholderTextColor={placeholderColor}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              editable={!loading}
            />
          </GoldGradientBorder>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <Pressable
            style={[styles.primaryButton, loading && styles.primaryButtonDisabled]}
            onPress={handleSetPassword}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={COLORS.ivory} />
            ) : (
              <Text style={styles.primaryButtonText}>Update password</Text>
            )}
          </Pressable>
        </ScrollView>
        </KeyboardAvoidingView>
      ) : (
        <View style={styles.centered}>
          <Text style={[styles.heading, { color: textColor }]}>Link expired</Text>
          <Text style={[styles.subheading, { color: placeholderColor }]}>{error}</Text>
          <Pressable
            style={[styles.primaryButton, { marginTop: 20, width: '100%' }]}
            onPress={() => router.replace('/sign-in')}
          >
            <Text style={styles.primaryButtonText}>Back to Sign In</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
  },
  header: {
    alignItems: 'center',
    marginTop: 60,
    marginBottom: 40,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 100,
  },
  content: {
    flex: 1,
  },
  heading: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 6,
  },
  subheading: {
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 24,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 6,
  },
  inputWrap: {
    marginBottom: 16,
    height: 52,
  },
  input: {
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 14,
  },
  errorText: {
    color: '#D64545',
    fontSize: 12,
    marginTop: -10,
    marginBottom: 12,
    textAlign: 'center',
  },
  primaryButton: {
    backgroundColor: COLORS.teal,
    borderRadius: 12,
    height: 56,
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
});
