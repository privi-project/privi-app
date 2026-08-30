import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator, Platform, useWindowDimensions } from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import * as ScreenCapture from 'expo-screen-capture';
import { COLORS } from '@/constants/colors';
import { ChevronLeftIcon, ClockIcon, GiftIcon, ShieldCheckIcon, FlagIcon } from '@/components/NavIcons';
import { GoldGradientText, GoldGradientBorder } from '@/components/GoldGradient';
import { BottomNavBar } from '@/components/BottomNavBar';
import { OfferTypeIcon } from '@/components/OfferTypeIcon';
import { OfferDetail, fetchOfferDetail } from '@/services/offers';
import { OfferReportReason, reportOffer } from '@/services/offerReports';
import { useAppColorScheme } from '@/hooks/useAppColorScheme';
import { ActionSheet } from '@/components/ActionSheet';
import { FloatingModal } from '@/components/FloatingModal';
import { Barcode128 } from '@/components/Barcode128';

// Combines redemption_method (how the code/barcode is presented) with
// redeem_where (where it can be used) into one accurate instruction —
// previously fixed per redemption_method only, which was actively wrong
// for an online offer ("show this code before payment" makes no sense
// when there's no in-person payment moment). This is now the ONLY place
// online/in-person is stated on this screen — a separate WHERE row was
// removed 2026-08-18 for saying the same thing twice, redundantly.
function getRedeemInstructions(offer: Pick<OfferDetail, 'redemption_method' | 'redeem_where'>): string {
  const noun = offer.redemption_method === 'barcode' ? 'barcode' : 'code';

  if (offer.redeem_where === 'online') {
    return `Enter this ${noun} at checkout online.`;
  }
  if (offer.redeem_where === 'both') {
    return `Show this ${noun} in person, or enter it at checkout online.`;
  }
  return `Show this ${noun} before payment.`;
}

// Short, specific reasons rather than a raw "report" tap — the choice
// itself is the friction that keeps this from being an idle-tap button,
// and it gives an admin reviewing offer_reports something more useful
// than a bare count. Kept in this order deliberately: most-likely-genuine
// complaint first, catch-all last.
const REPORT_REASONS: { reason: OfferReportReason; label: string }[] = [
  { reason: 'not_honoured', label: "The business wouldn't honour this offer" },
  { reason: 'not_as_described', label: "The offer wasn't as described" },
  { reason: 'already_expired', label: 'The offer had already expired' },
  { reason: 'other', label: 'Something else' },
];

export default function OfferScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colorScheme = useAppColorScheme();
  const isDark = colorScheme === 'dark';

  const [offer, setOffer] = useState<OfferDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [reportSheetVisible, setReportSheetVisible] = useState(false);
  const [reportConfirmVisible, setReportConfirmVisible] = useState(false);
  const [reportError, setReportError] = useState(false);

  const backgroundColor = isDark ? COLORS.charcoal : COLORS.ivory;
  const textColor = isDark ? COLORS.ivory : COLORS.charcoal;
  const subColor = isDark ? '#9CA3AF' : COLORS.mediumGray;
  const cardBg = isDark ? '#1E2126' : COLORS.white;

  useEffect(() => {
    // The screenshot/recording block is a native-only capability — the web
    // module is an empty stub (no OS-level equivalent to hook), so this is
    // a no-op there rather than a real protection.
    if (Platform.OS === 'web') return;
    ScreenCapture.preventScreenCaptureAsync();
    return () => {
      ScreenCapture.allowScreenCaptureAsync();
    };
  }, []);

  const load = useCallback(async () => {
    if (!id) return;
    setFailed(false);
    try {
      const detail = await fetchOfferDetail(id);
      if (!detail) {
        setFailed(true);
      } else {
        setOffer(detail);
      }
    } catch (e) {
      console.error('Failed to load offer', e);
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  // Same staleness issue as BusinessScreen — an offer edited in the Admin
  // Portal (e.g. its redeem_where) while a member already has this screen
  // open under them in the stack never showed up without a full restart.
  // load() doesn't set loading itself (only the mount effect above does),
  // so this refreshes silently rather than flashing the spinner every
  // time you come back to an offer you've already viewed.
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const { width: windowWidth } = useWindowDimensions();
  // scrollContent padding (20*2) + redemptionCardInner padding (20*2) +
  // GoldGradientBorder's own border (~1.5*2) — the actual available width
  // inside the redemption card, so the barcode never overflows it.
  const barcodeMaxWidth = windowWidth - 83;

  const handleReportReason = async (reason: OfferReportReason) => {
    if (!offer) return;
    try {
      await reportOffer(offer.id, reason);
      setReportConfirmVisible(true);
    } catch (e) {
      console.error('Failed to report offer', e);
      setReportError(true);
    }
  };

  // Admin Portal lets value_summary be filled in independently of title —
  // when the two end up saying the same thing (a real case seen in
  // testing: title "25% off swimming", value_summary "25% Off Swimming"),
  // showing both reads as a rendering bug rather than admin data entry.
  // Only show value_summary when it actually adds something.
  const showValueSummary =
    !!offer?.value_summary &&
    offer.value_summary.trim().toLowerCase() !== (offer?.title ?? '').trim().toLowerCase();

  if (loading) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor }]}>
        <ActivityIndicator color={COLORS.teal} />
      </View>
    );
  }

  if (failed || !offer) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor }]}>
        <Text style={[styles.emptyTitle, { color: textColor }]}>Unable to load this offer</Text>
        <Text style={[styles.emptySubtitle, { color: subColor }]}>Please try again later.</Text>
        <Pressable onPress={load}>
          <GoldGradientBorder borderWidth={1.5} borderRadius={12} backgroundColor={COLORS.teal}>
            <View style={styles.retryButtonInner}>
              <Text style={styles.retryButtonText}>Try again</Text>
            </View>
          </GoldGradientBorder>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor }]}>
      <View style={styles.header}>
        <Pressable hitSlop={12} onPress={() => router.back()}>
          <ChevronLeftIcon color={COLORS.gold} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: textColor }]}>Offer</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <GoldGradientBorder borderWidth={1.5} borderRadius={16} backgroundColor={COLORS.teal} style={styles.summaryCard}>
          <View style={styles.summaryCardInner}>
            <View style={styles.summaryIcon}>
              <OfferTypeIcon offerType={offer.offer_type} color={COLORS.gold} size={22} />
            </View>
            <Text style={styles.summaryTitle}>{offer.title}</Text>
            {showValueSummary ? <Text style={styles.summarySubtitle}>{offer.value_summary}</Text> : null}
          </View>
        </GoldGradientBorder>

        {offer.availability && (
          <View style={styles.detailRow}>
            <ClockIcon color={COLORS.gold} size={20} />
            <View style={styles.detailText}>
              <Text style={[styles.detailLabel, { color: textColor }]}>VALID</Text>
              <Text style={[styles.detailBody, { color: subColor }]}>{offer.availability}</Text>
            </View>
          </View>
        )}

        <View style={styles.detailRow}>
          <GiftIcon color={COLORS.gold} size={20} />
          <View style={styles.detailText}>
            <Text style={[styles.detailLabel, { color: textColor }]}>HOW TO REDEEM</Text>
            <Text style={[styles.detailBody, { color: subColor }]}>
              {getRedeemInstructions(offer)}
            </Text>
          </View>
        </View>

        {offer.terms && (
          <View style={styles.detailRow}>
            <ShieldCheckIcon color={COLORS.gold} size={20} />
            <View style={styles.detailText}>
              <Text style={[styles.detailLabel, { color: textColor }]}>TERMS & CONDITIONS</Text>
              <Text style={[styles.detailBody, { color: subColor }]}>{offer.terms}</Text>
            </View>
          </View>
        )}

        {offer.redemption_value && (
          <GoldGradientBorder borderWidth={1.5} borderRadius={16} backgroundColor={cardBg} style={styles.redemptionCard}>
            <View style={styles.redemptionCardInner}>
              {offer.redemption_method === 'discount_code' ? (
                <>
                  <GoldGradientText style={styles.codeLabel}>YOUR CODE</GoldGradientText>
                  <Text style={[styles.codeText, { color: textColor }]}>{offer.redemption_value}</Text>
                </>
              ) : (
                <>
                  <Barcode128 value={offer.redemption_value} maxWidth={barcodeMaxWidth} />
                  <Text style={[styles.codeText, { color: textColor, marginTop: 12 }]}>
                    {offer.redemption_value}
                  </Text>
                </>
              )}
            </View>
          </GoldGradientBorder>
        )}

        <Pressable
          style={styles.reportRow}
          onPress={() => setReportSheetVisible(true)}
          hitSlop={8}
        >
          <FlagIcon color={subColor} size={14} />
          <Text style={[styles.reportRowText, { color: subColor }]}>Report an issue with this offer</Text>
        </Pressable>
      </ScrollView>

      <BottomNavBar />

      <ActionSheet
        visible={reportSheetVisible}
        onClose={() => setReportSheetVisible(false)}
        title="What went wrong?"
        items={REPORT_REASONS.map(({ reason, label }) => ({
          key: reason,
          icon: <FlagIcon color={COLORS.gold} size={20} />,
          label,
          onPress: () => handleReportReason(reason),
        }))}
      />

      <FloatingModal
        visible={reportConfirmVisible}
        onClose={() => setReportConfirmVisible(false)}
        icon={<FlagIcon color={COLORS.gold} size={24} />}
        title="Thanks for letting us know"
        description="We've logged this and our team will look into it."
      />

      <FloatingModal
        visible={reportError}
        onClose={() => setReportError(false)}
        icon={<FlagIcon color={COLORS.gold} size={24} />}
        title="Couldn't send that"
        description="Please check your connection and try again."
      />
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
    paddingHorizontal: 40,
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
    paddingBottom: 24,
  },
  summaryCard: {
    marginBottom: 20,
  },
  summaryCardInner: {
    padding: 20,
    alignItems: 'center',
  },
  summaryIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  summaryTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.ivory,
    textAlign: 'center',
  },
  summarySubtitle: {
    fontSize: 13,
    color: 'rgba(247,246,242,0.85)',
    marginTop: 4,
    textAlign: 'center',
  },
  detailRow: {
    flexDirection: 'row',
    gap: 14,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(150,150,150,0.25)',
  },
  detailText: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 3,
  },
  detailBody: {
    fontSize: 13,
    lineHeight: 18,
  },
  redemptionCard: {
    marginTop: 12,
  },
  reportRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 24,
    paddingVertical: 8,
  },
  reportRowText: {
    fontSize: 12,
    fontWeight: '500',
  },
  redemptionCardInner: {
    padding: 20,
    alignItems: 'center',
  },
  codeLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  codeText: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 1,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 6,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButtonInner: {
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  retryButtonText: {
    color: COLORS.ivory,
    fontSize: 14,
    fontWeight: '600',
  },
});
