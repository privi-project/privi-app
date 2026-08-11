import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  ActivityIndicator,
  Linking,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { COLORS } from '@/constants/colors';
import { useAppColorScheme } from '@/hooks/useAppColorScheme';
import { GoldGradientText, GoldGradientBorder } from '@/components/GoldGradient';
import { ChevronLeftIcon, AccountIcon, MailIcon, MapPinIcon, CalendarIcon, CardIcon } from '@/components/NavIcons';
import { ChangePasswordModal } from '@/components/ChangePasswordModal';
import { fetchProfile, updateProfile, Profile } from '@/services/profile';
import { validatePostcodePrefix } from '@/services/location';
import { fetchSubscriptionInfo, SubscriptionInfo } from '@/services/subscription';
import { useAuthStore } from '@/store/auth';
import { noOutline } from '@/utils/webStyles';

export default function PersonalInformationScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const colorScheme = useAppColorScheme();
  const isDark = colorScheme === 'dark';

  const [original, setOriginal] = useState<Profile | null>(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [preferredLocation, setPreferredLocation] = useState('');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [changePasswordVisible, setChangePasswordVisible] = useState(false);
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [subscriptionLoading, setSubscriptionLoading] = useState(false);

  const backgroundColor = isDark ? COLORS.charcoal : COLORS.ivory;
  const textColor = isDark ? COLORS.ivory : COLORS.charcoal;
  const subColor = isDark ? '#9CA3AF' : COLORS.mediumGray;
  const placeholderColor = isDark ? '#9CA3AF' : COLORS.mediumGray;
  const inputBg = isDark ? COLORS.charcoal : COLORS.white;

  const load = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const profile = await fetchProfile(user.id);
    if (profile) {
      setOriginal(profile);
      setFirstName(profile.first_name);
      setLastName(profile.last_name);
      setPreferredLocation(profile.preferred_area ?? '');
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setSubscriptionLoading(true);
    fetchSubscriptionInfo()
      .then(setSubscription)
      .catch(() => setSubscription(null))
      .finally(() => setSubscriptionLoading(false));
  }, []);

  const isDirty =
    !!original &&
    (firstName !== original.first_name ||
      lastName !== original.last_name ||
      preferredLocation !== (original.preferred_area ?? ''));

  const handleSave = async () => {
    if (!user || !isDirty) return;
    setError('');
    setSaved(false);
    setSaving(true);
    try {
      const update: Parameters<typeof updateProfile>[1] = {
        first_name: firstName,
        last_name: lastName,
      };

      if (preferredLocation !== (original?.preferred_area ?? '')) {
        const result = await validatePostcodePrefix(preferredLocation);
        if (!result.valid) {
          setError("We couldn't find that postcode prefix. Please check and try again.");
          setSaving(false);
          return;
        }
        update.preferred_area = result.prefix;
        update.preferred_area_lat = result.latitude;
        update.preferred_area_lng = result.longitude;
      }

      await updateProfile(user.id, update);

      setOriginal({
        first_name: firstName,
        last_name: lastName,
        preferred_area: update.preferred_area ?? original?.preferred_area ?? null,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      setError('Something went wrong saving your details. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleManageSubscription = () => {
    if (subscription?.portalUrl) {
      Linking.openURL(subscription.portalUrl);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor }]}>
        <ActivityIndicator color={COLORS.teal} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor }]}>
      <View style={styles.header}>
        <Pressable hitSlop={12} onPress={() => router.back()}>
          <ChevronLeftIcon color={COLORS.gold} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: textColor }]}>Personal Information</Text>
        <View style={styles.headerSpacer} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <GoldGradientText style={styles.sectionHeading}>PERSONAL DETAILS</GoldGradientText>

        <Field
          label="First Name"
          icon={<AccountIcon color={COLORS.gold} size={18} />}
          value={firstName}
          onChangeText={setFirstName}
          textColor={textColor}
          placeholderColor={placeholderColor}
          inputBg={inputBg}
        />
        <Field
          label="Last Name"
          icon={<AccountIcon color={COLORS.gold} size={18} />}
          value={lastName}
          onChangeText={setLastName}
          textColor={textColor}
          placeholderColor={placeholderColor}
          inputBg={inputBg}
        />
        <ReadOnlyField
          label="Email Address"
          icon={<MailIcon color={COLORS.gold} size={18} />}
          value={user?.email ?? ''}
          textColor={subColor}
          inputBg={inputBg}
        />
        <Field
          label="Postcode Prefix"
          icon={<MapPinIcon color={COLORS.gold} size={18} />}
          value={preferredLocation}
          onChangeText={setPreferredLocation}
          textColor={textColor}
          placeholderColor={placeholderColor}
          inputBg={inputBg}
          autoCapitalize="characters"
        />
        <Text style={[styles.helperText, { color: subColor }]}>
          Only needed if you haven't enabled location access — it's how we show you nearby
          Member Benefits and notifications without it. If location access is already on, you
          can leave this as-is.
        </Text>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <Pressable
          style={[styles.primaryButton, !isDirty && styles.primaryButtonDisabled]}
          onPress={handleSave}
          disabled={!isDirty || saving}
        >
          {saving ? (
            <ActivityIndicator color={COLORS.ivory} />
          ) : (
            <Text style={styles.primaryButtonText}>{saved ? 'Saved' : 'Save Changes'}</Text>
          )}
        </Pressable>

        <Pressable onPress={() => setChangePasswordVisible(true)} style={styles.linkRow}>
          <GoldGradientText style={styles.link}>Change Password</GoldGradientText>
        </Pressable>
        <Pressable onPress={handleManageSubscription} style={styles.linkRow} disabled={subscriptionLoading}>
          <GoldGradientText style={styles.link}>
            {subscriptionLoading ? 'Loading subscription…' : 'Manage Subscription'}
          </GoldGradientText>
        </Pressable>

        <View style={styles.divider} />

        <GoldGradientText style={styles.sectionHeading}>MEMBERSHIP INFORMATION</GoldGradientText>

        <InfoRow
          icon={<CalendarIcon color={COLORS.gold} size={18} />}
          label="Membership Plan"
          value={
            subscription?.plan
              ? subscription.plan === 'monthly'
                ? 'Monthly'
                : 'Annual'
              : '—'
          }
          textColor={textColor}
          subColor={subColor}
        />
        {subscription?.renewalDate ? (
          <InfoRow
            icon={<CalendarIcon color={COLORS.gold} size={18} />}
            label="Renewal Date"
            value={new Date(subscription.renewalDate).toLocaleDateString('en-GB', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
            textColor={textColor}
            subColor={subColor}
          />
        ) : null}
        {subscription?.paymentMethodBrand && subscription?.paymentMethodLast4 ? (
          <InfoRow
            icon={<CardIcon color={COLORS.gold} size={18} />}
            label="Payment Method"
            value={`${capitalize(subscription.paymentMethodBrand)} ending ${subscription.paymentMethodLast4}`}
            textColor={textColor}
            subColor={subColor}
          />
        ) : null}
      </ScrollView>
      </KeyboardAvoidingView>

      <ChangePasswordModal
        visible={changePasswordVisible}
        onClose={() => setChangePasswordVisible(false)}
        email={user?.email ?? ''}
      />
    </View>
  );
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

interface FieldProps {
  label: string;
  icon: React.ReactNode;
  value: string;
  onChangeText: (v: string) => void;
  textColor: string;
  placeholderColor: string;
  inputBg: string;
  keyboardType?: 'default' | 'email-address';
  autoCapitalize?: 'none' | 'characters' | 'words' | 'sentences';
}

function Field({
  label,
  icon,
  value,
  onChangeText,
  textColor,
  placeholderColor,
  inputBg,
  keyboardType,
  autoCapitalize,
}: FieldProps) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={[styles.fieldLabel, { color: textColor }]}>{label}</Text>
      <GoldGradientBorder borderWidth={1} borderRadius={12} backgroundColor={inputBg} style={styles.fieldBorder}>
        <View style={styles.fieldInner}>
          {icon}
          <TextInput
            style={[styles.fieldInput, { color: textColor }, noOutline]}
            value={value}
            onChangeText={onChangeText}
            placeholderTextColor={placeholderColor}
            keyboardType={keyboardType}
            autoCapitalize={autoCapitalize}
          />
        </View>
      </GoldGradientBorder>
    </View>
  );
}

// Same visual container as Field (matches its position between other
// editable rows exactly) but renders the value as static Text instead of
// a TextInput — email is shown but not member-editable in-app (Privi_app
// scope decision: only name/postcode/password are self-serve; an email
// change needs to go through support since it's also the sign-in
// identity and Stripe's billing contact).
function ReadOnlyField({
  label,
  icon,
  value,
  textColor,
  inputBg,
}: {
  label: string;
  icon: React.ReactNode;
  value: string;
  textColor: string;
  inputBg: string;
}) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={[styles.fieldLabel, { color: textColor }]}>{label}</Text>
      <GoldGradientBorder borderWidth={1} borderRadius={12} backgroundColor={inputBg} style={styles.fieldBorder}>
        <View style={styles.fieldInner}>
          {icon}
          <Text style={[styles.fieldInput, { color: textColor }]}>{value}</Text>
        </View>
      </GoldGradientBorder>
    </View>
  );
}

function InfoRow({
  icon,
  label,
  value,
  textColor,
  subColor,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  textColor: string;
  subColor: string;
}) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoRowLeft}>
        {icon}
        <Text style={[styles.infoLabel, { color: subColor }]}>{label}</Text>
      </View>
      <Text style={[styles.infoValue, { color: textColor }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  headerSpacer: {
    width: 24,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  sectionHeading: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 14,
  },
  fieldGroup: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 6,
  },
  fieldBorder: {},
  fieldInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  fieldInput: {
    flex: 1,
    fontSize: 14,
  },
  helperText: {
    fontSize: 11,
    lineHeight: 16,
    marginTop: -10,
    marginBottom: 16,
  },
  errorText: {
    color: '#D64545',
    fontSize: 12,
    marginBottom: 12,
  },
  primaryButton: {
    backgroundColor: COLORS.teal,
    borderWidth: 1.5,
    borderColor: COLORS.gold,
    borderRadius: 12,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  primaryButtonDisabled: {
    opacity: 0.5,
  },
  primaryButtonText: {
    color: COLORS.ivory,
    fontSize: 15,
    fontWeight: '600',
  },
  linkRow: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  link: {
    fontSize: 13,
    fontWeight: '600',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: COLORS.gold,
    marginVertical: 20,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(150,150,150,0.2)',
  },
  infoRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  infoLabel: {
    fontSize: 13,
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '600',
  },
});
