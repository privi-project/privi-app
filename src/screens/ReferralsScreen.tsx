import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Share, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { COLORS } from '@/constants/colors';
import { GoldGradientText, GoldGradientBorder } from '@/components/GoldGradient';
import { ChevronLeftIcon, GiftIcon } from '@/components/NavIcons';
import { fetchReferralSummary, ReferredMember } from '@/services/referrals';
import { useAuthStore } from '@/store/auth';
import { useAppColorScheme } from '@/hooks/useAppColorScheme';

// Not fetched from system_settings — no screen in the App currently
// wires those admin-configured URLs up dynamically (Support & Settings'
// own Help Centre link is the same hardcoded-constant pattern), so this
// matches how every other legal link already works today rather than
// being the one screen that does it differently.
const REFERRAL_TERMS_URL = 'https://privi.info/legal/referral-program-terms';

export default function ReferralsScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const colorScheme = useAppColorScheme();
  const isDark = colorScheme === 'dark';
  const backgroundColor = isDark ? COLORS.charcoal : COLORS.ivory;
  const textColor = isDark ? COLORS.ivory : COLORS.charcoal;
  const subColor = isDark ? '#9CA3AF' : COLORS.mediumGray;
  const [loading, setLoading] = useState(true);
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [referred, setReferred] = useState<ReferredMember[]>([]);

  const load = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    const summary = await fetchReferralSummary(user.id);
    setReferralCode(summary.referralCode);
    setReferred(summary.referred);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  const handleShare = () => {
    if (!referralCode) return;
    Share.share({
      message: `Join Privi and get your second month free — use my code ${referralCode} when you sign up at privi.info/signup`,
    });
  };

  return (
    <View style={[styles.container, { backgroundColor }]}>
      <View style={styles.header}>
        <Pressable hitSlop={12} onPress={() => router.back()}>
          <ChevronLeftIcon color={COLORS.gold} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: textColor }]}>Referrals</Text>
        <View style={styles.headerSpacer} />
      </View>

      {loading ? (
        <ActivityIndicator color={COLORS.teal} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.explainer}>
            <GiftIcon color={COLORS.gold} size={28} />
            <Text style={[styles.explainerTitle, { color: textColor }]}>
              Give a friend their second month free
            </Text>
            <Text style={[styles.explainerBody, { color: subColor }]}>
              Share your code below. When a friend joins Privi using it, their second month is on
              us — and once their first payment goes through, you get a free month too. There&apos;s
              no limit — refer as many friends as you like.
            </Text>
          </View>

          <Text style={styles.sectionHeading}>YOUR CODE</Text>
          {referralCode ? (
            <GoldGradientBorder borderWidth={1.5} borderRadius={14} backgroundColor={COLORS.teal} style={styles.codeBorder}>
              <View style={styles.codeCard}>
                <Text style={styles.codeText}>{referralCode}</Text>
                <Pressable style={styles.shareButton} onPress={handleShare} hitSlop={8}>
                  <Text style={styles.shareButtonText}>Share</Text>
                </Pressable>
              </View>
            </GoldGradientBorder>
          ) : (
            <Text style={[styles.emptyText, { color: subColor }]}>
              Your code isn&apos;t ready yet — check back shortly.
            </Text>
          )}

          <Text style={[styles.sectionHeading, styles.sectionHeadingSpaced]}>YOUR REFERRALS</Text>
          {referred.length === 0 ? (
            <Text style={[styles.emptyText, { color: subColor }]}>
              Nobody&apos;s used your code yet — once they do, they&apos;ll show up here.
            </Text>
          ) : (
            referred.map((member) => (
              <View key={member.id} style={styles.referralRow}>
                <Text style={[styles.referralName, { color: textColor }]}>
                  {member.firstName || 'A new member'}
                </Text>
                <View
                  style={[
                    styles.statusBadge,
                    member.status === 'rewarded' ? styles.statusBadgeRewarded : styles.statusBadgePending,
                  ]}
                >
                  <Text style={[styles.statusBadgeText, { color: textColor }]}>
                    {member.status === 'rewarded' ? 'Reward earned' : 'Pending'}
                  </Text>
                </View>
              </View>
            ))
          )}

          <Pressable style={styles.termsLink} onPress={() => WebBrowser.openBrowserAsync(REFERRAL_TERMS_URL)}>
            <GoldGradientText style={styles.termsLinkText}>Referral Programme Terms</GoldGradientText>
          </Pressable>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  explainer: {
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 8,
    gap: 8,
  },
  explainerTitle: {
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  explainerBody: {
    fontSize: 13,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 19,
  },
  sectionHeading: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
    color: COLORS.gold,
    marginBottom: 12,
  },
  sectionHeadingSpaced: {
    marginTop: 28,
  },
  codeBorder: {},
  codeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 18,
  },
  codeText: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: 3,
    color: COLORS.ivory,
  },
  shareButton: {
    borderWidth: 1,
    borderColor: COLORS.gold,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  shareButtonText: {
    color: COLORS.gold,
    fontSize: 13,
    fontWeight: '700',
  },
  emptyText: {
    fontSize: 13,
    color: '#9CA3AF',
  },
  referralRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  referralName: {
    fontSize: 14,
    fontWeight: '600',
  },
  statusBadge: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusBadgeRewarded: {
    backgroundColor: 'rgba(111,167,161,0.2)',
  },
  statusBadgePending: {
    borderWidth: 1,
    borderColor: COLORS.gold,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  termsLink: {
    alignItems: 'center',
    marginTop: 32,
  },
  termsLinkText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
