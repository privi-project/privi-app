import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Share, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { COLORS } from '@/constants/colors';
import { GoldGradientText, GoldGradientBorder } from '@/components/GoldGradient';
import { ChevronLeftIcon, GiftIcon } from '@/components/NavIcons';
import { fetchReferralSummary, referralRewardCap, ReferredMember } from '@/services/referrals';
import { fetchAppLinks } from '@/services/appLinks';
import { useAuthStore } from '@/store/auth';
import { useAppColorScheme } from '@/hooks/useAppColorScheme';

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
  const [plan, setPlan] = useState<'monthly' | 'annual'>('monthly');
  const [referred, setReferred] = useState<ReferredMember[]>([]);
  // Referral Programme Terms is now a section within Terms & Conditions
  // rather than its own page (folded in 2026-08-26), so this links to
  // termsUrl. Falls back to the last-known-good hardcoded URL inside
  // fetchAppLinks itself on any failure, so this is never left null in
  // practice.
  const [termsUrl, setTermsUrl] = useState<string | null>(null);

  const load = useCallback(async () => {
    fetchAppLinks().then((links) => setTermsUrl(links.termsUrl));
    if (!user) {
      setLoading(false);
      return;
    }
    const summary = await fetchReferralSummary(user.id);
    setReferralCode(summary.referralCode);
    setPlan(summary.plan);
    setReferred(summary.referred);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  // Months earned, not a £ figure — stays correct even if pricing ever
  // changes, and "3 free months earned" is just as motivating as a price
  // without needing the app to know what the current monthly rate is.
  const rewardedCount = referred.filter((m) => m.status === 'rewarded').length;
  // 1 for monthly, 12 for annual (see referralRewardCap's own comment) —
  // referring itself is unlimited, only how many rewards can be banked
  // at once is capped.
  const rewardCap = referralRewardCap(plan);

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
              Refer a friend, get a free month
            </Text>
            <Text style={[styles.explainerBody, { color: subColor }]}>
              Share your code with a friend, and their second month is free once they join. When
              their first payment clears, you get a free month too. There&apos;s no limit on how
              many friends you can refer, but you can only have{' '}
              {rewardCap === 1 ? '1 free month' : `up to ${rewardCap} free months' worth`} banked
              from referrals at a time. Once that&apos;s used, referring again starts earning
              rewards straight away.
            </Text>
          </View>

          {referred.length > 0 && (
            <View style={styles.statsRow}>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>{referred.length}</Text>
                <Text style={[styles.statLabel, { color: subColor }]}>
                  {referred.length === 1 ? 'Friend referred' : 'Friends referred'}
                </Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>{rewardedCount}</Text>
                <Text style={[styles.statLabel, { color: subColor }]}>
                  {rewardedCount === 1 ? 'Free month earned' : 'Free months earned'}
                </Text>
              </View>
            </View>
          )}

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
                    member.status === 'rewarded'
                      ? styles.statusBadgeRewarded
                      : member.status === 'capped'
                        ? styles.statusBadgeCapped
                        : styles.statusBadgePending,
                  ]}
                >
                  <Text
                    style={[
                      styles.statusBadgeText,
                      { color: member.status === 'capped' ? subColor : textColor },
                    ]}
                  >
                    {member.status === 'rewarded'
                      ? 'Reward earned'
                      : member.status === 'capped'
                        ? 'Already banked'
                        : 'Pending'}
                  </Text>
                </View>
              </View>
            ))
          )}

          <Pressable
            style={styles.termsLink}
            onPress={() => termsUrl && WebBrowser.openBrowserAsync(termsUrl)}
          >
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
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.gold,
    borderRadius: 14,
    paddingVertical: 16,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.gold,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
    textAlign: 'center',
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
  // Deliberately muted/neutral, not gold (pending) or teal (rewarded) —
  // this isn't a call to action or a celebration, just a factual "this
  // one didn't add anything new" state.
  statusBadgeCapped: {
    borderWidth: 1,
    borderColor: 'rgba(156,163,175,0.4)',
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
