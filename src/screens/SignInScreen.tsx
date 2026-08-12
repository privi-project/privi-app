import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  Linking,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { COLORS } from '@/constants/colors';
import { BrandMark } from '@/components/BrandMark';
import { GoldGradientText, GoldGradientBorder } from '@/components/GoldGradient';
import { EyeIcon, EyeOffIcon } from '@/components/NavIcons';
import { ForgotPasswordModal } from '@/components/ForgotPasswordModal';
import { supabase } from '@/services/supabase';
import { noOutline } from '@/utils/webStyles';
import { hasCompletedLocationSetup } from '@/utils/firstLaunch';
import { useAppColorScheme } from '@/hooks/useAppColorScheme';

const WEBSITE_SIGNUP_URL = 'https://privi.info/signup';
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function SignInScreen() {
  const router = useRouter();
  const colorScheme = useAppColorScheme();
  const theme = colorScheme === 'dark' ? 'dark' : 'light';
  const isDark = theme === 'dark';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [forgotPasswordVisible, setForgotPasswordVisible] = useState(false);

  const backgroundColor = isDark ? COLORS.charcoal : COLORS.ivory;
  const textColor = isDark ? COLORS.ivory : COLORS.charcoal;
  const placeholderColor = isDark ? '#9CA3AF' : COLORS.mediumGray;
  const inputBg = isDark ? COLORS.charcoal : COLORS.white;

  const handleBack = () => {
    router.back();
  };

  const handleCreateAccount = async () => {
    // Sign Up lives on the website only, not an app screen — app hands off to browser.
    await Linking.openURL(WEBSITE_SIGNUP_URL);
  };

  const validate = () => {
    if (!EMAIL_REGEX.test(email)) {
      setError('Please enter a valid email address.');
      return false;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return false;
    }
    return true;
  };

  const handleSignIn = async () => {
    setError('');
    if (!validate()) return;

    setLoading(true);
    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setLoading(false);
      setError('Incorrect email or password. Please try again.');
      return;
    }

    const alreadySetUp = data.user ? await hasCompletedLocationSetup(data.user.id) : false;
    setLoading(false);

    router.replace(alreadySetUp ? '/home' : '/location-setup');
  };

  return (
    <View style={[styles.container, { backgroundColor }]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Pressable style={styles.backButton} onPress={handleBack} hitSlop={12}>
            <Text style={[styles.backArrow, { color: textColor }]}>←</Text>
          </Pressable>

          <View style={styles.header}>
            <BrandMark size="sm" on={isDark ? 'dark' : 'light'} />
            <GoldGradientText style={styles.motto}>More for you. Every day.</GoldGradientText>
          </View>

          <Text style={[styles.heading, { color: textColor }]}>Welcome back</Text>
          <Text style={[styles.subheading, { color: placeholderColor }]}>
            Please sign in to continue.
          </Text>

          <Text style={[styles.label, { color: textColor }]}>Email address</Text>
          <GoldGradientBorder borderWidth={1} borderRadius={12} backgroundColor={inputBg} style={styles.inputWrap}>
            <TextInput
              style={[styles.input, { color: textColor }, noOutline]}
              placeholder="Enter your email"
              placeholderTextColor={placeholderColor}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              editable={!loading}
            />
          </GoldGradientBorder>

          <Text style={[styles.label, { color: textColor }]}>Password</Text>
          <View style={styles.passwordRow}>
            <GoldGradientBorder
              borderWidth={1}
              borderRadius={12}
              backgroundColor={inputBg}
              style={styles.inputWrap}
            >
              <TextInput
                style={[styles.input, styles.passwordInput, { color: textColor }, noOutline]}
                placeholder="Enter your password"
                placeholderTextColor={placeholderColor}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                editable={!loading}
              />
            </GoldGradientBorder>
            <Pressable
              style={styles.eyeButton}
              onPress={() => setShowPassword((s) => !s)}
              hitSlop={12}
            >
              {showPassword ? (
                <EyeOffIcon color={placeholderColor} size={18} />
              ) : (
                <EyeIcon color={placeholderColor} size={18} />
              )}
            </Pressable>
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <Pressable
            style={styles.forgotPasswordLink}
            onPress={() => setForgotPasswordVisible(true)}
          >
            <GoldGradientText style={styles.forgotPasswordText}>Forgot password?</GoldGradientText>
          </Pressable>

          <Pressable
            style={[styles.primaryButton, loading && styles.primaryButtonDisabled]}
            onPress={handleSignIn}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={COLORS.ivory} />
            ) : (
              <Text style={styles.primaryButtonText}>Sign in</Text>
            )}
          </Pressable>

          <View style={styles.dividerRow}>
            <View style={[styles.dividerLine, { backgroundColor: placeholderColor }]} />
            <Text style={[styles.dividerText, { color: placeholderColor }]}>or</Text>
            <View style={[styles.dividerLine, { backgroundColor: placeholderColor }]} />
          </View>

          <Pressable onPress={handleCreateAccount}>
            <GoldGradientBorder borderWidth={1.5} borderRadius={12} backgroundColor={backgroundColor} style={styles.secondaryButton}>
              <View style={styles.secondaryButtonInner}>
                <Text style={[styles.secondaryButtonText, { color: textColor }]}>Create account</Text>
              </View>
            </GoldGradientBorder>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>

      <ForgotPasswordModal
        visible={forgotPasswordVisible}
        onClose={() => setForgotPasswordVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 40,
  },
  backButton: {
    marginBottom: 24,
  },
  backArrow: {
    fontSize: 22,
  },
  header: {
    alignItems: 'center',
    marginBottom: 28,
  },
  motto: {
    fontSize: 15,
    fontWeight: '500',
    marginTop: 6,
  },
  heading: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 4,
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
  passwordRow: {
    position: 'relative',
    justifyContent: 'center',
  },
  passwordInput: {
    paddingRight: 44,
  },
  eyeButton: {
    position: 'absolute',
    right: 14,
    top: 14,
  },
  errorText: {
    color: '#D64545',
    fontSize: 12,
    marginTop: -10,
    marginBottom: 12,
  },
  forgotPasswordLink: {
    alignSelf: 'flex-end',
    marginBottom: 20,
  },
  forgotPasswordText: {
    fontSize: 13,
    fontWeight: '500',
  },
  primaryButton: {
    backgroundColor: COLORS.teal,
    borderWidth: 1.5,
    borderColor: COLORS.gold,
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
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    opacity: 0.3,
  },
  dividerText: {
    marginHorizontal: 12,
    fontSize: 12,
  },
  secondaryButton: {
    height: 56,
  },
  // Was referenced (line ~188) but never actually defined — the "Create
  // account" button's text rendered with no centering/layout at all as a
  // result, sitting top-left instead of centered. Confirmed live
  // 2026-08-12 from a real device screenshot. This was ALSO showing up
  // as a persistent TS2551 typecheck error throughout this session,
  // mistakenly treated as a harmless pre-existing/unrelated error rather
  // than investigated — it was the exact cause of a real visible bug.
  secondaryButtonInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
