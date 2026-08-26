import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Linking, ActivityIndicator } from 'react-native';
import { COLORS } from '@/constants/colors';
import { BrandIcon } from '@/components/BrandMark';
import { GoldGradientBorder } from '@/components/GoldGradient';
import { ShieldCheckIcon } from '@/components/NavIcons';
import { SignOutModal } from '@/components/SignOutModal';
import { useAppColorScheme } from '@/hooks/useAppColorScheme';
import { fetchSubscriptionInfo, fetchContinueMembershipLink } from '@/services/subscription';

/**
 * Landed on via (app)/_layout.tsx's entitlement gate — a member with no
 * current access (subscription genuinely cancelled, or complimentary
 * access expired with nothing set up in advance). Deliberately outside
 * the (tabs) group, so there's no tab bar and no way back into the app's
 * real content from here except by restoring access.
 *
 * Branches on whether this member has ever paid before (portalUrl is
 * only ever set once a Stripe customer exists — see api/app/
 * subscription): a lapsed PAID member reactivates via Stripe's own
 * Billing Portal, exactly like "Manage Subscription" elsewhere in the
 * app; a complimentary-only member (never held a real subscription) goes
 * through continue-membership-link instead. Either way, opened with
 * Linking.openURL — the real external browser, never an in-app browser
 * overlay. Payment always happens on the actual Privi website.
 */
export default function AccessEndedScreen() {
  const colorScheme = useAppColorScheme();
  const isDark = colorScheme === 'dark';
  const backgroundColor = isDark ? COLORS.charcoal : COLORS.ivory;
  const textColor = isDark ? COLORS.ivory : COLORS.charcoal;
  const subColor = isDark ? '#9CA3AF' : COLORS.mediumGray;

  const [loading, setLoading] = useState(true);
  const [hasPaidBefore, setHasPaidBefore] = useState(false);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState(false);
  const [signOutVisible, setSignOutVisible] = useState(false);

  useEffect(() => {
    fetchSubscriptionInfo().then((info) => {
      setHasPaidBefore(Boolean(info?.portalUrl));
      setLoading(false);
    });
  }, []);

  const handleContinue = useCallback(async () => {
    setWorking(true);
    setError(false);
    try {
      if (hasPaidBefore) {
        const info = await fetchSubscriptionInfo();
        if (info?.portalUrl) {
          await Linking.openURL(info.portalUrl);
          return;
        }
      } else {
        const url = await fetchContinueMembershipLink();
        if (url) {
          await Linking.openURL(url);
          return;
        }
      }
      setError(true);
    } finally {
      setWorking(false);
    }
  }, [hasPaidBefore]);

  return (
    <View style={[styles.container, { backgroundColor }]}>
      <BrandIcon size="md" style={styles.icon} />

      <View style={styles.iconBadge}>
        <ShieldCheckIcon color={COLORS.gold} size={26} />
      </View>

      {loading ? (
        <ActivityIndicator color={COLORS.teal} style={{ marginTop: 20 }} />
      ) : (
        <>
          <Text style={[styles.title, { color: textColor }]}>
            {hasPaidBefore ? 'Your membership has ended' : 'Your complimentary access has ended'}
          </Text>
          <Text style={[styles.body, { color: subColor }]}>
            {hasPaidBefore
              ? "Your Privi subscription is no longer active. Manage or restart it on the Privi website — you'll be taken there now."
              : "Your complimentary Privi access has come to an end. You can pick up right where you left off — sign up on the Privi website and you'll be taken there now."}
          </Text>

          {error && (
            <Text style={styles.error}>
              Something went wrong opening the Privi website. Please try again in a moment.
            </Text>
          )}

          <GoldGradientBorder backgroundColor={COLORS.teal} borderRadius={8} style={styles.buttonWrap}>
            <Pressable style={styles.primaryButton} onPress={handleContinue} disabled={working}>
              {working ? (
                <ActivityIndicator color={COLORS.ivory} />
              ) : (
                <Text style={styles.primaryButtonText}>
                  {hasPaidBefore ? 'Manage subscription' : 'Continue my membership'}
                </Text>
              )}
            </Pressable>
          </GoldGradientBorder>
        </>
      )}

      <Pressable onPress={() => setSignOutVisible(true)} hitSlop={12} style={styles.signOutLink}>
        <Text style={[styles.signOutText, { color: subColor }]}>Sign out</Text>
      </Pressable>

      <SignOutModal visible={signOutVisible} onClose={() => setSignOutVisible(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  icon: {
    marginBottom: 20,
  },
  iconBadge: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1.5,
    borderColor: COLORS.gold,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  body: {
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    marginBottom: 24,
  },
  error: {
    fontSize: 12,
    color: '#E56B6B',
    textAlign: 'center',
    marginBottom: 16,
  },
  buttonWrap: {
    width: '100%',
  },
  primaryButton: {
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: COLORS.ivory,
    fontSize: 15,
    fontWeight: '600',
  },
  signOutLink: {
    marginTop: 28,
  },
  signOutText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
