import React, { useState } from 'react';
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
import { COLORS } from '@/constants/colors';
import { Wordmark } from '@/components/BrandMark';
import { GoldGradientBorder } from '@/components/GoldGradient';
import {
  requestForegroundLocationPermission,
  getCurrentPosition,
  validatePostcodePrefix,
} from '@/services/location';
import { supabase } from '@/services/supabase';
import { useAuthStore } from '@/store/auth';
import { markLocationSetupComplete } from '@/utils/firstLaunch';
import { useAppColorScheme } from '@/hooks/useAppColorScheme';
import { noOutline } from '@/utils/webStyles';

type Step = 'permission' | 'fallback-form';

/**
 * One-time, first-launch flow (per PRIVI_Website_Design_Brief.md Section 7):
 * offers live location; if declined, a mandatory Preferred Area fallback
 * form appears instead, validated against a live UK postcode-lookup API.
 * Every member ends up with either live GPS or a stored Preferred Area
 * before ever reaching Home — the Admin Portal's notification targeting
 * depends on this being true.
 */
export default function LocationSetupScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const colorScheme = useAppColorScheme();
  const theme = colorScheme === 'dark' ? 'dark' : 'light';
  const isDark = theme === 'dark';

  const [step, setStep] = useState<Step>('permission');
  const [postcode, setPostcode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const backgroundColor = isDark ? COLORS.charcoal : COLORS.ivory;
  const textColor = isDark ? COLORS.ivory : COLORS.charcoal;
  const placeholderColor = isDark ? '#9CA3AF' : COLORS.mediumGray;
  const inputBg = isDark ? COLORS.charcoal : COLORS.white;

  const goToHome = async () => {
    if (user) await markLocationSetupComplete(user.id);
    router.replace('/home');
  };

  const handleAllowLocation = async () => {
    setLoading(true);
    const granted = await requestForegroundLocationPermission();

    if (granted) {
      try {
        await getCurrentPosition();
        // Live GPS is used directly by Map/Home at render time — nothing to
        // persist server-side for GPS-granted members (see backend schema notes).
        setLoading(false);
        await goToHome();
      } catch {
        setLoading(false);
        setError('Could not get your location. Please try again or set a Preferred Area.');
      }
    } else {
      setLoading(false);
      setStep('fallback-form');
    }
  };

  const handleSkip = () => {
    setStep('fallback-form');
  };

  const handleSubmitPostcode = async () => {
    setError('');
    if (!postcode.trim()) {
      setError('Please enter your postcode prefix.');
      return;
    }

    setLoading(true);
    const result = await validatePostcodePrefix(postcode);

    if (!result.valid) {
      setLoading(false);
      setError("We couldn't find that postcode prefix. Please check and try again.");
      return;
    }

    if (!user) {
      setLoading(false);
      setError('Something went wrong. Please try signing in again.');
      return;
    }

    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        preferred_area: result.prefix,
        preferred_area_lat: result.latitude,
        preferred_area_lng: result.longitude,
      })
      .eq('id', user.id);

    setLoading(false);

    if (updateError) {
      setError('Could not save your Preferred Area. Please try again.');
      return;
    }

    await goToHome();
  };

  return (
    <View style={[styles.container, { backgroundColor }]}>
      <View style={styles.header}>
        <Wordmark size="sm" on={isDark ? 'dark' : 'light'} />
      </View>

      {step === 'permission' ? (
        <View style={styles.content}>
          <Text style={[styles.heading, { color: textColor }]}>Find offers near you</Text>
          <Text style={[styles.subheading, { color: placeholderColor }]}>
            Privi uses your location to show Member Benefits nearby, wherever you are — not just
            near home.
          </Text>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <Pressable
            style={[styles.primaryButton, loading && styles.primaryButtonDisabled]}
            onPress={handleAllowLocation}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={COLORS.ivory} />
            ) : (
              <Text style={styles.primaryButtonText}>Allow location access</Text>
            )}
          </Pressable>

          <Pressable onPress={handleSkip} disabled={loading}>
            <GoldGradientBorder borderWidth={1.5} borderRadius={12} backgroundColor={backgroundColor} style={styles.secondaryButton} fillHeight>
              <View style={styles.secondaryButtonInner}>
                <Text style={[styles.secondaryButtonText, { color: textColor }]}>Not now</Text>
              </View>
            </GoldGradientBorder>
          </Pressable>
        </View>
      ) : (
        <KeyboardAvoidingView style={styles.content} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <Text style={[styles.heading, { color: textColor }]}>Set your Preferred Area</Text>
          <Text style={[styles.subheading, { color: placeholderColor }]}>
            Since location access wasn't granted, tell us the area you consider home so we can
            still notify you about nearby Member Benefits.
          </Text>

          <Text style={[styles.label, { color: textColor }]}>Postcode prefix</Text>
          <GoldGradientBorder borderWidth={1} borderRadius={12} backgroundColor={inputBg} style={styles.inputWrap} fillHeight>
            <TextInput
              style={[styles.input, { color: textColor }, noOutline]}
              placeholder="e.g. SE25, LS1, EH1"
              placeholderTextColor={placeholderColor}
              value={postcode}
              onChangeText={setPostcode}
              autoCapitalize="characters"
              editable={!loading}
            />
          </GoldGradientBorder>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <Pressable
            style={[styles.primaryButton, loading && styles.primaryButtonDisabled]}
            onPress={handleSubmitPostcode}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={COLORS.ivory} />
            ) : (
              <Text style={styles.primaryButtonText}>Continue</Text>
            )}
          </Pressable>
        </ScrollView>
        </KeyboardAvoidingView>
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
  content: {
    flex: 1,
  },
  heading: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 10,
  },
  subheading: {
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 28,
    lineHeight: 19,
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
    marginBottom: 12,
    textAlign: 'center',
  },
  primaryButton: {
    backgroundColor: COLORS.teal,
    borderRadius: 12,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  primaryButtonDisabled: {
    opacity: 0.7,
  },
  primaryButtonText: {
    color: COLORS.ivory,
    fontSize: 15,
    fontWeight: '600',
  },
  secondaryButton: {
    height: 56,
  },
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
