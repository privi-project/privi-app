import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Linking,
} from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { COLORS } from '@/constants/colors';
import { GoldGradientText, GoldGradientBorder } from '@/components/GoldGradient';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  HeartIcon,
  MapPinIcon,
  PhoneIcon,
  ClockIcon,
  GlobeIcon,
  LocateIcon,
  AccessibilityIcon,
} from '@/components/NavIcons';
import { ActionSheet } from '@/components/ActionSheet';
import { OfferTypeIcon } from '@/components/OfferTypeIcon';
import { ConfirmModal } from '@/components/ConfirmModal';
import { BottomNavBar } from '@/components/BottomNavBar';
import {
  BusinessDetail,
  BusinessLocationDetail,
  fetchBusinessDetail,
  fetchFavouriteIds,
  addFavourite,
  removeFavourite,
  getMemberLocation,
  formatOpeningHoursToday,
} from '@/services/businesses';
import { OfferSummary, fetchBusinessOffers } from '@/services/offers';
import { openDirections } from '@/utils/mapsHandoff';
import { useAuthStore } from '@/store/auth';
import { useAppColorScheme } from '@/hooks/useAppColorScheme';

export default function BusinessScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const colorScheme = useAppColorScheme();
  const isDark = colorScheme === 'dark';

  const [business, setBusiness] = useState<BusinessDetail | null>(null);
  const [offers, setOffers] = useState<OfferSummary[]>([]);
  const [isFavourite, setIsFavourite] = useState(false);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  // Which location the "View on Map" / "Get directions" flow is currently
  // for — generalised (2026-08-13) from a plain boolean so the SAME
  // ActionSheet + ConfirmModal below work for the primary address AND
  // any location opened from the new "Other locations" list, rather than
  // duplicating the whole flow per location.
  const [activeLocationSheet, setActiveLocationSheet] = useState<BusinessLocationDetail | null>(null);
  const [callConfirmVisible, setCallConfirmVisible] = useState(false);
  // Separate from activeLocationSheet on purpose — ActionSheet nulls that
  // out (via onClose) BEFORE the tapped item's onPress runs, so by the
  // time ConfirmModal re-renders (reading state fresh, unlike the
  // already-closed-over item.onPress) activeLocationSheet would already
  // be null. This is set explicitly when "Get directions" is tapped,
  // capturing the location at that moment, and stays stable until the
  // confirm modal itself closes.
  const [directionsLocation, setDirectionsLocation] = useState<BusinessLocationDetail | null>(null);
  const [directionsConfirmVisible, setDirectionsConfirmVisible] = useState(false);
  const [otherLocationsExpanded, setOtherLocationsExpanded] = useState(false);

  const backgroundColor = isDark ? COLORS.charcoal : COLORS.ivory;
  const textColor = isDark ? COLORS.ivory : COLORS.charcoal;
  const subColor = isDark ? '#9CA3AF' : COLORS.mediumGray;
  // Teal never varies by theme — always the exact brand teal.
  const cardBg = COLORS.teal;

  const load = useCallback(async () => {
    if (!id) return;
    setFailed(false);
    try {
      const memberLocation = user ? await getMemberLocation(user.id) : null;
      const [detail, businessOffers, favIds] = await Promise.all([
        fetchBusinessDetail(id, memberLocation),
        fetchBusinessOffers(id),
        user ? fetchFavouriteIds(user.id) : Promise.resolve(new Set<string>()),
      ]);
      if (!detail) {
        setFailed(true);
      } else {
        setBusiness(detail);
        setOffers(businessOffers);
        setIsFavourite(favIds.has(id));
      }
    } catch (e) {
      console.error('Failed to load business', e);
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, [id, user]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  // Business detail was fetched once on mount and never again — editing an
  // offer's redeem_where (or anything else about the business) in the
  // Admin Portal while a member already has this screen open under them
  // in the stack would never show up without a full app restart. Same
  // pattern as HomeScreen's own focus refresh: load() doesn't toggle the
  // spinner itself (only the mount effect above does), so this refreshes
  // silently rather than flashing a loading screen every time you come
  // back to a business you've already viewed.
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const handleToggleFavourite = async () => {
    if (!user || !business) return;
    const next = !isFavourite;
    setIsFavourite(next);
    try {
      if (next) {
        await addFavourite(user.id, business.id);
      } else {
        await removeFavourite(user.id, business.id);
      }
    } catch {
      setIsFavourite(!next);
    }
  };

  const addressLinesFor = (loc: BusinessLocationDetail | null | undefined): string | null => {
    if (!loc) return null;
    if (loc.formatted_address) return loc.formatted_address;
    return [loc.address_line1, loc.city, loc.postcode].filter(Boolean).join(', ') || null;
  };
  const addressLines = addressLinesFor(business?.location);

  const openingHoursText = formatOpeningHoursToday(business?.location?.opening_hours ?? null);

  if (loading) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor }]}>
        <ActivityIndicator color={COLORS.teal} />
      </View>
    );
  }

  if (failed || !business) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor }]}>
        <Text style={[styles.emptyTitle, { color: textColor }]}>Unable to load business details</Text>
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
        <Pressable hitSlop={12} onPress={handleToggleFavourite}>
          <HeartIcon color={COLORS.gold} filled={isFavourite} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {business.logo_url ? (
          <Image source={{ uri: business.logo_url }} style={styles.logo} />
        ) : (
          <View style={[styles.logo, styles.logoFallback]} />
        )}

        <Text style={[styles.name, { color: textColor }]}>{business.name}</Text>
        {business.short_description ? (
          <Text style={[styles.descriptor, { color: subColor }]}>{business.short_description}</Text>
        ) : null}

        <View style={styles.infoBlock}>
          {addressLines && (
            <>
              <Pressable style={styles.infoRow} onPress={() => setActiveLocationSheet(business.location)}>
                <MapPinIcon color={COLORS.gold} size={18} />
                <Text style={[styles.infoText, { color: textColor }]} numberOfLines={2}>
                  {addressLines}
                </Text>
                <ChevronRightIcon color={COLORS.gold} size={18} />
              </Pressable>
              <Text style={[styles.addressHint, { color: subColor }]}>Tap for directions</Text>
            </>
          )}
          {business.location?.is_accessible && (
            // Per-location, not per-business (2026-08-14) — a national
            // business can have some accessible branches and some that
            // aren't, so this only reflects the specific location shown
            // above, not the business as a whole.
            <View style={styles.infoRow}>
              <AccessibilityIcon color={COLORS.gold} size={18} />
              <Text style={[styles.infoText, { color: textColor }]}>Wheelchair / step-free accessible</Text>
            </View>
          )}
          {openingHoursText && (
            // Display only, per the mockup — no tap action and no chevron,
            // unlike the rows around it.
            <View style={styles.infoRow}>
              <ClockIcon color={COLORS.gold} size={18} />
              <Text style={[styles.infoText, { color: textColor }]}>{openingHoursText}</Text>
            </View>
          )}
          {business.location?.phone && (
            <Pressable style={styles.infoRow} onPress={() => setCallConfirmVisible(true)}>
              <PhoneIcon color={COLORS.gold} size={18} />
              <Text style={[styles.infoText, { color: textColor }]}>{business.location.phone}</Text>
              <ChevronRightIcon color={COLORS.gold} size={18} />
            </Pressable>
          )}
          {business.location?.website_url && (
            <Pressable
              style={styles.infoRow}
              onPress={() => WebBrowser.openBrowserAsync(business.location!.website_url!)}
            >
              <GlobeIcon color={COLORS.gold} size={18} />
              <Text style={[styles.infoText, { color: textColor }]}>Visit website</Text>
              <ChevronRightIcon color={COLORS.gold} size={18} />
            </Pressable>
          )}

          {/* 2026-08-13: fetchBusinessDetail already fetched every active
              location for this business — it just used to discard all but
              the nearest before returning. Expands in place (not a modal/
              sheet) per founder's request; tapping an entry opens the same
              View on Map / Get directions ActionSheet the primary address
              uses, just parametrised by whichever location was tapped. */}
          {business.otherLocations.length > 0 && (
            <>
              <Pressable
                style={styles.infoRow}
                onPress={() => setOtherLocationsExpanded((e) => !e)}
              >
                <MapPinIcon color={COLORS.gold} size={18} />
                <Text style={[styles.infoText, { color: textColor }]}>
                  Other locations ({business.otherLocations.length})
                </Text>
                <View style={{ transform: [{ rotate: otherLocationsExpanded ? '90deg' : '0deg' }] }}>
                  <ChevronRightIcon color={COLORS.gold} size={18} />
                </View>
              </Pressable>

              {otherLocationsExpanded && (
                <View style={styles.otherLocationsList}>
                  {business.otherLocations.map((loc) => (
                    <Pressable
                      key={loc.id}
                      style={styles.otherLocationRow}
                      onPress={() => setActiveLocationSheet(loc)}
                    >
                      <Text style={[styles.otherLocationText, { color: textColor }]} numberOfLines={2}>
                        {addressLinesFor(loc)}
                      </Text>
                      {loc.is_accessible && <AccessibilityIcon color={COLORS.gold} size={14} />}
                      <ChevronRightIcon color={COLORS.gold} size={16} />
                    </Pressable>
                  ))}
                </View>
              )}
            </>
          )}
        </View>

        {business.about_description ? (
          <>
            <View style={styles.divider} />
            <GoldGradientText style={styles.sectionHeading}>ABOUT</GoldGradientText>
            <Text style={[styles.aboutText, { color: textColor }]}>{business.about_description}</Text>
          </>
        ) : null}

        <View style={styles.divider} />
        <GoldGradientText style={styles.sectionHeading}>MEMBER BENEFITS</GoldGradientText>

        {offers.length === 0 ? (
          <Text style={[styles.noOffers, { color: subColor }]}>No current offers — check back soon.</Text>
        ) : (
          <View style={styles.offersList}>
            {offers.map((offer) => (
              <Pressable key={offer.id} onPress={() => router.push(`/offer/${offer.id}`)}>
                <GoldGradientBorder borderWidth={1.5} borderRadius={14} backgroundColor={cardBg}>
                  <View style={styles.offerCardInner}>
                    <View style={styles.offerIcon}>
                      <OfferTypeIcon offerType={offer.offer_type} color={COLORS.gold} size={16} />
                    </View>
                    <View style={styles.offerText}>
                      <View style={styles.offerTitleRow}>
                        <Text style={styles.offerTitle}>{offer.title}</Text>
                        {offer.redeem_where !== 'in_store' && (
                          <View style={styles.onlineBadge}>
                            <GlobeIcon color={COLORS.teal} size={11} />
                            <Text style={styles.onlineBadgeText}>
                              {offer.redeem_where === 'online' ? 'Online only' : '+ Online'}
                            </Text>
                          </View>
                        )}
                      </View>
                      {offer.value_summary &&
                      offer.value_summary.trim().toLowerCase() !== offer.title.trim().toLowerCase() ? (
                        <Text style={styles.offerSubtitle}>{offer.value_summary}</Text>
                      ) : null}
                      <GoldGradientText style={styles.discoverLink}>Discover offer →</GoldGradientText>
                    </View>
                  </View>
                </GoldGradientBorder>
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>

      <BottomNavBar />

      {activeLocationSheet?.latitude != null && activeLocationSheet?.longitude != null && (
        <ActionSheet
          visible={!!activeLocationSheet}
          onClose={() => setActiveLocationSheet(null)}
          items={[
            {
              key: 'map',
              icon: <MapPinIcon color={COLORS.gold} size={20} />,
              label: 'View on privi Map',
              sublabel: 'See this location on the map',
              onPress: () => router.push('/map'),
            },
            {
              key: 'directions',
              icon: <LocateIcon color={COLORS.gold} size={20} />,
              label: 'Get directions',
              sublabel: 'Open in your maps app',
              onPress: () => {
                setDirectionsLocation(activeLocationSheet);
                setDirectionsConfirmVisible(true);
              },
            },
          ]}
        />
      )}

      <ConfirmModal
        visible={callConfirmVisible}
        onClose={() => setCallConfirmVisible(false)}
        onConfirm={() => Linking.openURL(`tel:${business?.location?.phone}`)}
        icon={<PhoneIcon color={COLORS.gold} size={26} />}
        title="Make a call?"
        description={business?.location?.phone ?? undefined}
        confirmLabel="Call"
      />

      <ConfirmModal
        visible={directionsConfirmVisible}
        onClose={() => setDirectionsConfirmVisible(false)}
        onConfirm={() =>
          directionsLocation?.latitude != null &&
          directionsLocation?.longitude != null &&
          openDirections(directionsLocation.latitude, directionsLocation.longitude, business.name)
        }
        icon={<LocateIcon color={COLORS.gold} size={26} />}
        title="Get directions?"
        description={`You'll be taken to your phone's maps app for directions to ${business?.name ?? 'this business'}.`}
        confirmLabel="Get directions"
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 12,
  },
  scrollContent: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  logo: {
    width: 96,
    height: 96,
    borderRadius: 18,
    backgroundColor: COLORS.charcoal,
    marginBottom: 16,
  },
  logoFallback: {
    backgroundColor: COLORS.charcoal,
  },
  name: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
  },
  descriptor: {
    fontSize: 13,
    marginTop: 4,
    marginBottom: 20,
    textAlign: 'center',
  },
  infoBlock: {
    alignSelf: 'stretch',
    marginBottom: 24,
    gap: 4,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
  },
  addressHint: {
    fontSize: 11,
    marginTop: -6,
    marginBottom: 4,
    marginLeft: 30,
  },
  otherLocationsList: {
    marginLeft: 30,
    marginTop: -4,
    marginBottom: 4,
    gap: 2,
  },
  otherLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
  },
  otherLocationText: {
    flex: 1,
    fontSize: 12,
  },
  divider: {
    alignSelf: 'stretch',
    height: StyleSheet.hairlineWidth,
    backgroundColor: COLORS.gold,
    marginVertical: 20,
  },
  sectionHeading: {
    alignSelf: 'flex-start',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  aboutText: {
    alignSelf: 'stretch',
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 24,
  },
  noOffers: {
    alignSelf: 'flex-start',
    fontSize: 13,
  },
  offersList: {
    alignSelf: 'stretch',
    gap: 12,
  },
  offerCardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  offerIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  offerText: {
    flex: 1,
  },
  offerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 2,
  },
  offerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.ivory,
  },
  onlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: 'rgba(111,167,161,0.2)',
  },
  onlineBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.teal,
    letterSpacing: 0.2,
  },
  offerSubtitle: {
    fontSize: 12,
    color: 'rgba(247,246,242,0.85)',
    marginBottom: 4,
  },
  discoverLink: {
    fontSize: 12,
    fontWeight: '600',
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
