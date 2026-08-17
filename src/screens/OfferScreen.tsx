import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as ScreenCapture from 'expo-screen-capture';
import { COLORS } from '@/constants/colors';
import { ChevronLeftIcon, ClockIcon, GiftIcon, ShieldCheckIcon, PercentBadgeIcon, StorefrontIcon, GlobeIcon } from '@/components/NavIcons';
import { GoldGradientText, GoldGradientBorder } from '@/components/GoldGradient';
import { BottomNavBar } from '@/components/BottomNavBar';
import { OfferDetail, fetchOfferDetail } from '@/services/offers';
import { useAppColorScheme } from '@/hooks/useAppColorScheme';

// Fixed copy per redemption method — there's no separate "instructions"
// field in the schema, and this text is the same for every offer of a
// given method (Offer Page mockup, HOW TO REDEEM section).
const REDEEM_INSTRUCTIONS: Record<OfferDetail['redemption_method'], string> = {
  barcode: 'Show this offer before payment.',
  discount_code: 'Show this code before payment.',
};

// Separate from HOW TO REDEEM above — that's about presenting the code/
// barcode, this is about where it can actually be used. A business with a
// physical location can still take bookings/orders online.
const REDEEM_WHERE_LABELS: Record<OfferDetail['redeem_where'], string> = {
  in_store: 'In person',
  online: 'Online',
  both: 'In person or online',
};

// Deterministic decorative bar pattern from the code string — this is not
// a real scannable barcode encoding (staff read the printed digits, they
// don't scan the app screen), just a visual echo of the mockup's barcode
// graphic.
function barWidths(value: string): number[] {
  const widths: number[] = [];
  for (let i = 0; i < 40; i++) {
    const c = value.charCodeAt(i % Math.max(value.length, 1)) || 1;
    widths.push(1 + ((c + i * 7) % 3));
  }
  return widths;
}

export default function OfferScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colorScheme = useAppColorScheme();
  const isDark = colorScheme === 'dark';

  const [offer, setOffer] = useState<OfferDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

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
    setLoading(true);
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
    load();
  }, [load]);

  const bars = useMemo(() => barWidths(offer?.redemption_value ?? ''), [offer?.redemption_value]);

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
              <PercentBadgeIcon color={COLORS.gold} size={28} />
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
              {REDEEM_INSTRUCTIONS[offer.redemption_method]}
            </Text>
          </View>
        </View>

        <View style={styles.detailRow}>
          {offer.redeem_where === 'in_store' ? (
            <StorefrontIcon color={COLORS.gold} size={20} />
          ) : (
            <GlobeIcon color={COLORS.gold} size={20} />
          )}
          <View style={styles.detailText}>
            <Text style={[styles.detailLabel, { color: textColor }]}>WHERE</Text>
            <Text style={[styles.detailBody, { color: subColor }]}>
              {REDEEM_WHERE_LABELS[offer.redeem_where]}
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
                  <View style={styles.barcodeRow}>
                    {bars.map((w, i) => (
                      <View
                        key={i}
                        style={{ width: w, height: 56, backgroundColor: isDark ? COLORS.ivory : COLORS.charcoal }}
                      />
                    ))}
                  </View>
                  <Text style={[styles.codeText, { color: textColor, marginTop: 12 }]}>
                    {offer.redemption_value}
                  </Text>
                </>
              )}
            </View>
          </GoldGradientBorder>
        )}
      </ScrollView>

      <BottomNavBar />
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
  barcodeRow: {
    flexDirection: 'row',
    gap: 2,
    alignItems: 'center',
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
