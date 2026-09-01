import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  Image,
  TextInput,
  StyleSheet,
  Pressable,
  FlatList,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Animated,
  Easing,
  Linking,
  Platform,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { COLORS } from '@/constants/colors';
import { useAppColorScheme } from '@/hooks/useAppColorScheme';
import { HOME_HEADER_TOP_PADDING } from '@/constants/animations';
import { Wordmark } from '@/components/BrandMark';
import { GoldGradientText, GoldGradientBorder } from '@/components/GoldGradient';
import { BellIcon, SearchIcon, HeartIcon, GlobeIcon } from '@/components/NavIcons';
import { CategoryIcon } from '@/components/CategoryIcon';
import { NotificationPanel } from '@/components/NotificationPanel';
import { FilterModal } from '@/components/FilterModal';
import { SeasonBanner } from '@/components/SeasonBanner';
import {
  Category,
  BusinessCard,
  fetchCategories,
  fetchBusinesses,
  fetchFavouriteIds,
  addFavourite,
  removeFavourite,
  getMemberLocation,
} from '@/services/businesses';
import { fetchActiveSeasonBanner, SeasonBanner as SeasonBannerData } from '@/services/banners';
import { useAuthStore } from '@/store/auth';
import { useHomeResetStore } from '@/store/homeReset';
import { useNotificationDot } from '@/hooks/useNotificationDot';
import { triggerHaptic } from '@/lib/haptics';

// Matches search_bar_animation.html exactly: bar contracts 100%->70% over
// 0.4s while the filter bubble scales/fades into the space it leaves
// behind, results fade in ~250ms after the bar starts contracting.
const BAR_ANIM_DURATION = 400;
const RESULTS_FADE_DELAY = 250;
const RESULTS_FADE_DURATION = 250;
const EASE = Easing.bezier(0.45, 0, 0.2, 1);
const FILTER_BUTTON_WIDTH = 42;
const FILTER_GAP = 8;

export default function HomeScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const colorScheme = useAppColorScheme();
  const isDark = colorScheme === 'dark';

  const [categories, setCategories] = useState<Category[]>([]);
  const [businesses, setBusinesses] = useState<BusinessCard[]>([]);
  const [favouriteIds, setFavouriteIds] = useState<Set<string>>(new Set());
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [selectedDistance, setSelectedDistance] = useState<number | null>(null);
  const [accessibleOnly, setAccessibleOnly] = useState(false);
  // Not a real category — a business isn't "in the online offers category,"
  // one of its OFFERS is online-redeemable (same reasoning as why
  // accessibility lives per-location, not per-business). Rendered as a
  // chip in the category row purely for visual prominence/one-tap access,
  // wired straight to fetchBusinesses' own onlineOfferOnly filter.
  const [onlineOfferOnly, setOnlineOfferOnly] = useState(false);
  const [favouritesOnly, setFavouritesOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [notificationsVisible, setNotificationsVisible] = useState(false);
  const { hasNotifications, refresh: refreshNotificationDot } = useNotificationDot();
  const [filterVisible, setFilterVisible] = useState(false);
  const [seasonBanner, setSeasonBanner] = useState<SeasonBannerData | null>(null);
  // Set only when the season banner (action_type='categories') is tapped —
  // takes priority over a single category-row selection, since a banner
  // can target several categories at once. Mutually exclusive with
  // selectedCategoryId: picking a category row clears this back to null.
  const [bannerCategoryIds, setBannerCategoryIds] = useState<string[] | null>(null);

  // Memoized: a plain `bannerCategoryIds ?? (selectedCategoryId ? [x] : null)`
  // literal creates a NEW array every render once a category is selected —
  // that new reference on every render fed straight into loadData's deps
  // below, recreating loadData every render, re-firing the load effect,
  // triggering another render... an infinite loop that looked like the
  // business list "flashing rapidly." Only recompute when the underlying
  // ids actually change.
  const effectiveCategoryIds = useMemo(
    () => bannerCategoryIds ?? (selectedCategoryId ? [selectedCategoryId] : null),
    [bannerCategoryIds, selectedCategoryId]
  );

  // Query text updates live as the member types, but it's only committed
  // (triggers a search) on submit — the bar itself, the category row, and
  // the business feed all stay exactly as-is while typing.
  const [queryInput, setQueryInput] = useState('');
  const [activeQuery, setActiveQuery] = useState<string | null>(null); // non-null once searched
  const hasSearched = activeQuery !== null;

  const searchAnim = useRef(new Animated.Value(0)).current;
  const resultsOpacity = useRef(new Animated.Value(1)).current;
  // Measured once the search row lays out — lets the bar's shrink be exact
  // pixels (its own width minus the gap and filter button), rather than an
  // arbitrary flex ratio, so the filter button reads as popping out of the
  // exact space the bar gives up instead of two independently-sized things
  // moving at once.
  const [rowWidth, setRowWidth] = useState(0);

  const backgroundColor = isDark ? COLORS.charcoal : COLORS.ivory;
  const textColor = isDark ? COLORS.ivory : COLORS.charcoal;
  const placeholderColor = isDark ? '#9CA3AF' : COLORS.mediumGray;
  // Teal never varies by theme — always the exact brand teal, unlike
  // surfaces such as inputs/cards that do legitimately shift shade.
  const cardBg = COLORS.teal;

  // REAL BUG FOUND 2026-08-22 (founder report: category/search results
  // occasionally "confused" — reproduced once, then not, on a retest of
  // the exact same steps). loadData had no guard against out-of-order
  // responses: every change to any of its dependencies (tapping a
  // category, clearing search, etc.) fires a brand new async loadData()
  // call, with nothing cancelling or ignoring whichever EARLIER call is
  // still in flight. If that earlier request happens to resolve LATER
  // than a newer one — easy on a real network, where response timing
  // isn't guaranteed to match request order — its stale results silently
  // overwrite the correct, current ones. That matches both symptoms
  // reported exactly: search "car" + tap Leisure showing "a mix of
  // businesses" instead of correctly empty (the old car-only search's
  // stale response arrived after the correct car+Leisure one), and
  // clearing search after that showing the full unfiltered list while
  // the Leisure chip stayed visually selected (an even older, no-filter
  // response arriving last, while selectedCategoryId itself — plain
  // synchronous state, untouched by fetch timing — correctly still said
  // Leisure). Not a dev-app-only lag artifact — this can happen in a
  // production build too, just less often, on any network where
  // responses don't arrive in the same order requests were sent. Fixed
  // with a request-generation guard: each call to loadData gets its own
  // id, and only the response matching the CURRENT (latest) id is ever
  // allowed to update state — anything older is silently dropped.
  const loadRequestId = useRef(0);

  const loadData = useCallback(async () => {
    const requestId = ++loadRequestId.current;
    try {
      const [cats, memberLocation] = await Promise.all([
        fetchCategories(),
        user ? getMemberLocation(user.id) : Promise.resolve(null),
      ]);
      if (requestId !== loadRequestId.current) return; // superseded — drop
      setCategories(cats);

      const [biz, favIds] = await Promise.all([
        fetchBusinesses({
          categoryIds: effectiveCategoryIds,
          searchQuery: activeQuery ?? undefined,
          memberLocation,
          maxDistanceMiles: selectedDistance,
          accessibleOnly,
          onlineOfferOnly,
        }),
        user ? fetchFavouriteIds(user.id) : Promise.resolve(new Set<string>()),
      ]);
      if (requestId !== loadRequestId.current) return; // superseded — drop
      setBusinesses(biz);
      setFavouriteIds(favIds);
    } catch (e) {
      if (requestId === loadRequestId.current) {
        console.error('Failed to load homepage data', e);
      }
    } finally {
      if (requestId === loadRequestId.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [user, effectiveCategoryIds, activeQuery, selectedDistance, accessibleOnly, onlineOfferOnly]);

  // Favourites-only narrows the already-fetched (category/search/distance/
  // accessibility-filtered) list client-side — favouriteIds is already
  // fetched every load anyway, so there's no need for a second query.
  const displayedBusinesses = useMemo(
    () => (favouritesOnly ? businesses.filter((b) => favouriteIds.has(b.id)) : businesses),
    [businesses, favouritesOnly, favouriteIds]
  );

  useEffect(() => {
    setLoading(true);
    loadData();
  }, [loadData]);

  // Home stays mounted while the member switches tabs — a favourite
  // toggled from the Favourites tab (or a Business page) never touches
  // loadData's own dependencies, so without this Home would keep showing
  // whatever favouriteIds it fetched on its last full load. Just refetch
  // the (cheap) favourite id set on focus rather than the whole business
  // list, since that part doesn't need to change.
  useFocusEffect(
    useCallback(() => {
      if (!user) return;
      fetchFavouriteIds(user.id)
        .then(setFavouriteIds)
        .catch(() => {});
    }, [user])
  );

  // Full business list (including featuredLevel) and the season banner are
  // BOTH set from the Admin Portal and neither is member-specific — a
  // founder marking a business featured or publishing a season banner
  // while the member's app is already open (Home stays mounted across tab
  // switches) previously never showed up without a full app reload, since
  // loadData()/fetchActiveSeasonBanner() only ran once on initial mount.
  // Confirmed live 2026-08-12. Same fix as the favourites-id refresh above
  // — re-check on every return to this tab, not just once ever. loadData()
  // itself doesn't toggle the loading spinner (only the mount-effect
  // wrapper above does), so this refreshes silently in the background
  // rather than flashing a spinner every time the member switches tabs.
  useFocusEffect(
    useCallback(() => {
      loadData();
      fetchActiveSeasonBanner()
        .then(setSeasonBanner)
        .catch((e) => console.error('Failed to load season banner', e));
    }, [loadData])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleSearchSubmit = () => {
    if (hasSearched) {
      // Bar's already contracted — the member tapped back in to edit their
      // query rather than hitting Clear first. Just re-run the search with
      // the new text, no need to replay the contraction animation.
      setActiveQuery(queryInput);
      return;
    }

    setActiveQuery(queryInput);

    Animated.timing(searchAnim, {
      toValue: 1,
      duration: BAR_ANIM_DURATION,
      easing: EASE,
      useNativeDriver: false,
    }).start();

    resultsOpacity.setValue(0);
    setTimeout(() => {
      Animated.timing(resultsOpacity, {
        toValue: 1,
        duration: RESULTS_FADE_DURATION,
        easing: EASE,
        useNativeDriver: true,
      }).start();
    }, RESULTS_FADE_DELAY);
  };

  const handleClearSearch = () => {
    setQueryInput('');
    setActiveQuery(null);
    setSelectedDistance(null);
    setAccessibleOnly(false);
    setFavouritesOnly(false);

    Animated.timing(searchAnim, {
      toValue: 0,
      duration: BAR_ANIM_DURATION,
      easing: EASE,
      useNativeDriver: false,
    }).start();
  };

  // Deleting all the way back to an empty query is treated the same as
  // tapping Clear — the member shouldn't have to hit Clear separately once
  // there's nothing left to search for.
  useEffect(() => {
    if (hasSearched && queryInput === '') {
      handleClearSearch();
    }
  }, [queryInput]);

  // Resets every active filter/search back to the default feed — tapping
  // a category or the season banner previously had no way back to this
  // state short of manually clearing search or deselecting the category.
  // Triggered either directly (header logo/wordmark tap below) or via
  // useHomeResetStore (Home tab icon tap, from the Tabs layout).
  const resetToDefaultHome = () => {
    handleClearSearch();
    setSelectedCategoryId(null);
    setBannerCategoryIds(null);
  };

  const resetSignal = useHomeResetStore((s) => s.resetSignal);
  useEffect(() => {
    if (resetSignal === 0) return; // 0 = initial store value, not a real tap
    resetToDefaultHome();
  }, [resetSignal]);

  const handleBannerPress = (banner: SeasonBannerData) => {
    if (banner.action_type === 'external_link' && banner.action_url) {
      Linking.openURL(banner.action_url);
    } else if (banner.action_type === 'categories' && banner.categoryIds.length > 0) {
      setSelectedCategoryId(null);
      setBannerCategoryIds(banner.categoryIds);
    }
  };

  const handleToggleFavourite = async (businessId: string) => {
    if (!user) return;
    triggerHaptic();
    const isFav = favouriteIds.has(businessId);
    const next = new Set(favouriteIds);
    if (isFav) {
      next.delete(businessId);
    } else {
      next.add(businessId);
    }
    setFavouriteIds(next);

    try {
      if (isFav) {
        await removeFavourite(user.id, businessId);
      } else {
        await addFavourite(user.id, businessId);
      }
    } catch (e) {
      // revert on failure
      setFavouriteIds(favouriteIds);
    }
  };

  const barWidth = searchAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [rowWidth, Math.max(rowWidth - FILTER_GAP - FILTER_BUTTON_WIDTH, 0)],
  });
  const filterMarginLeft = searchAnim.interpolate({ inputRange: [0, 1], outputRange: [0, FILTER_GAP] });
  const filterBubbleWidth = searchAnim.interpolate({ inputRange: [0, 1], outputRange: [0, FILTER_BUTTON_WIDTH] });
  const filterBubbleScale = searchAnim.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] });

  return (
    <View style={[styles.container, { backgroundColor }]}>
      <View style={styles.header}>
        {/* 2026-08-21: header icon removed (founder decision, once the
            splash animation stopped needing a top-left icon to land on —
            see SplashAnimation.tsx). Back to a plain 3-way flex balance:
            an invisible spacer matching the bell's own width on the left,
            wordmark centred (flex:1) in the middle, bell on the right —
            no absolute-positioning trick needed now that both sides are
            simple and equal-width again. */}
        <View style={styles.headerSpacer} />
        <Pressable onPress={resetToDefaultHome} hitSlop={8} style={styles.headerWordmark}>
          <Wordmark size="sm" on={isDark ? 'dark' : 'light'} />
        </Pressable>
        <Pressable
          style={styles.bellButton}
          onPress={() => setNotificationsVisible(true)}
          hitSlop={12}
        >
          <BellIcon color={COLORS.gold} />
          {hasNotifications && <View style={styles.notificationDot} />}
        </Pressable>
      </View>

      <View
        style={styles.searchRow}
        onLayout={(e) => setRowWidth(e.nativeEvent.layout.width)}
      >
        <Animated.View style={{ width: rowWidth ? barWidth : '100%' }}>
          {/* GoldGradientBorder itself isn't Animated — the width tween
              lives on the Animated.View above it instead, so the gradient
              border rides along without needing to be animatable itself. */}
          <GoldGradientBorder
            borderWidth={1}
            borderRadius={12}
            backgroundColor={isDark ? '#1E2126' : COLORS.white}
          >
            <View style={styles.searchBarInner}>
              <SearchIcon color={placeholderColor} />
              <TextInput
                style={[styles.searchInput, { color: textColor }]}
                // "Privi" as the verb here (2026-08-31, founder
                // direction) — the one real search box in the app,
                // the exact moment "Google it" describes. Kept the
                // full functional guidance (what you can actually
                // search for), just swapped the generic "Search" for
                // the brand verb — same quiet seeding as the
                // Favourites empty state, deliberately not everywhere.
                placeholder="Privi businesses, towns, categories or keywords"
                placeholderTextColor={placeholderColor}
                value={queryInput}
                onChangeText={setQueryInput}
                onSubmitEditing={handleSearchSubmit}
                returnKeyType="search"
                autoComplete="off"
                autoCorrect={false}
              />
            </View>
          </GoldGradientBorder>
        </Animated.View>

        {hasSearched && (
          <Animated.View
            style={{
              width: filterBubbleWidth,
              marginLeft: filterMarginLeft,
              opacity: searchAnim,
              transform: [{ scale: filterBubbleScale }],
            }}
          >
            <Pressable onPress={() => setFilterVisible(true)}>
              <GoldGradientBorder
                borderWidth={1.5}
                borderRadius={10}
                backgroundColor={COLORS.teal}
                style={styles.filterButton}
                fillHeight
              >
                <View style={styles.filterButtonInner}>
                  <Text style={styles.filterButtonIcon}>⚙</Text>
                </View>
              </GoldGradientBorder>
            </Pressable>
          </Animated.View>
        )}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoryScroll}
        contentContainerStyle={styles.categoryRow}
      >
        <Pressable
          key="online-offers"
          style={styles.categoryItem}
          onPress={() => setOnlineOfferOnly((v) => !v)}
        >
          <GoldGradientBorder
            borderWidth={1.5}
            borderRadius={26}
            backgroundColor={onlineOfferOnly ? COLORS.teal : backgroundColor}
            style={styles.categoryCircle}
            fillHeight
          >
            <View style={styles.categoryCircleContent}>
              {/* strokeWidth lightened to match the category icons beside
                  it — see GlobeIcon's own comment in NavIcons.tsx. */}
              <GlobeIcon size={26} color={COLORS.gold} strokeWidth={1.15} />
            </View>
          </GoldGradientBorder>
          <Text style={[styles.categoryLabel, { color: textColor }]} numberOfLines={2}>
            Redeem Codes Online
          </Text>
        </Pressable>

        {categories.map((cat) => {
          const isSelected = selectedCategoryId === cat.id;
          return (
            <Pressable
              key={cat.id}
              style={styles.categoryItem}
              onPress={() => {
                setBannerCategoryIds(null);
                setSelectedCategoryId(isSelected ? null : cat.id);
              }}
            >
              {isSelected ? (
                <GoldGradientBorder
                  borderWidth={1.5}
                  borderRadius={26}
                  backgroundColor={COLORS.teal}
                  style={styles.categoryCircle}
                  fillHeight
                >
                  <View style={styles.categoryCircleContent}>
                    <CategoryIcon slug={cat.slug} width={26} height={26} color={COLORS.gold} />
                  </View>
                </GoldGradientBorder>
              ) : (
                <GoldGradientBorder
                  borderWidth={1.5}
                  borderRadius={26}
                  backgroundColor={backgroundColor}
                  style={styles.categoryCircle}
                  fillHeight
                >
                  <View style={styles.categoryCircleContent}>
                    <CategoryIcon slug={cat.slug} width={26} height={26} color={COLORS.gold} />
                  </View>
                </GoldGradientBorder>
              )}
              <Text style={[styles.categoryLabel, { color: textColor }]} numberOfLines={2}>
                {cat.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <Animated.View style={[styles.resultsSection, { opacity: resultsOpacity }]}>
        {/* 2026-08-13: SeasonBanner + heading/results-row used to render
            here as fixed siblings above the FlatList, eating permanent
            vertical space instead of scrolling away with the cards below
            them (reported: "sits like a frozen pane"). Moved into the
            FlatList's own ListHeaderComponent so they scroll with
            everything else — ListEmptyComponent replaces the old
            loading/empty ternary so the header still shows during those
            states instead of disappearing along with the list. */}
        <FlatList
          data={loading ? [] : displayedBusinesses}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={COLORS.gold} />
          }
          ListHeaderComponent={
            <>
              {!hasSearched && seasonBanner && (
                <SeasonBanner banner={seasonBanner} onPress={handleBannerPress} />
              )}

              {hasSearched ? (
                <View style={styles.resultsRow}>
                  <Text style={[styles.resultsCount, { color: textColor }]}>
                    {loading
                      ? 'Searching…'
                      : `${displayedBusinesses.length} results${activeQuery ? ` for "${activeQuery}"` : ''}`}
                  </Text>
                  <Pressable onPress={handleClearSearch}>
                    <GoldGradientText style={styles.clearLink}>Clear</GoldGradientText>
                  </Pressable>
                </View>
              ) : (
                <GoldGradientText style={styles.sectionHeading}>EXPLORE BUSINESSES</GoldGradientText>
              )}
            </>
          }
          ListEmptyComponent={
            loading ? (
              <ActivityIndicator style={{ marginTop: 40 }} color={COLORS.teal} />
            ) : (
              <View style={styles.emptyState}>
                <Text style={[styles.emptyTitle, { color: textColor }]}>No businesses found</Text>
                <Text style={[styles.emptySubtitle, { color: placeholderColor }]}>
                  {favouritesOnly
                    ? 'No favourites match your other filters yet.'
                    : 'Try changing your search or explore different categories.'}
                </Text>
              </View>
            )
          }
          renderItem={({ item }) => (
              <Pressable
                style={[styles.businessCard, { backgroundColor: cardBg }]}
                onPress={() => router.push(`/business/${item.id}`)}
              >
                {item.logo_url ? (
                  <Image source={{ uri: item.logo_url }} style={styles.businessLogo} />
                ) : (
                  <View style={[styles.businessLogo, styles.businessLogoFallback]} />
                )}
                <View style={styles.businessInfo}>
                  {item.featuredLevel !== 'none' && (
                    <Text style={styles.featuredBadge}>★ FEATURED</Text>
                  )}
                  <Text style={styles.businessName} numberOfLines={1}>
                    {item.name}
                  </Text>
                  {item.short_description ? (
                    <Text style={styles.businessSubtitle} numberOfLines={1}>
                      {item.short_description}
                    </Text>
                  ) : null}
                  <GoldGradientText style={styles.discoverLink}>Discover Member Benefits →</GoldGradientText>
                </View>
                <Pressable
                  hitSlop={10}
                  onPress={() => handleToggleFavourite(item.id)}
                  style={styles.heartButton}
                >
                  <HeartIcon
                    color={COLORS.gold}
                    filled={favouriteIds.has(item.id)}
                    size={20}
                  />
                </Pressable>
              </Pressable>
            )}
          />
      </Animated.View>

      <NotificationPanel
        visible={notificationsVisible}
        onClose={() => {
          setNotificationsVisible(false);
          refreshNotificationDot();
        }}
      />

      <FilterModal
        visible={filterVisible}
        onClose={() => setFilterVisible(false)}
        selectedDistance={selectedDistance}
        accessibleOnly={accessibleOnly}
        favouritesOnly={favouritesOnly}
        onApply={(dist, accessible, favOnly) => {
          setSelectedDistance(dist);
          setAccessibleOnly(accessible);
          setFavouritesOnly(favOnly);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: HOME_HEADER_TOP_PADDING,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  headerSpacer: {
    width: 24,
  },
  headerWordmark: {
    flex: 1,
    alignItems: 'center',
  },
  bellButton: {
    width: 24,
    alignItems: 'flex-end',
  },
  notificationDot: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: COLORS.gold,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 16,
  },
  searchBarInner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    // react-native-web renders TextInput as a real <input> — Chrome draws
    // its own focus/autofill outline (the "orange box") on top of our own
    // gold border unless it's explicitly suppressed. No native equivalent
    // to worry about; this key is simply ignored on iOS/Android.
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : null),
  },
  filterButton: {
    width: 42,
    height: 42,
  },
  filterButtonInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterButtonIcon: {
    color: COLORS.ivory,
    fontSize: 18,
  },
  categoryScroll: {
    // Without this, the horizontal ScrollView flex-grows to fill leftover
    // vertical space from its flex:1 sibling (resultsSection) instead of
    // sizing to its own content — that's what produced the large gap
    // between the category row and the business feed below it.
    flexGrow: 0,
    flexShrink: 0,
  },
  categoryRow: {
    paddingHorizontal: 20,
    gap: 18,
    marginBottom: 20,
  },
  categoryItem: {
    alignItems: 'center',
    width: 64,
  },
  categoryCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    marginBottom: 6,
  },
  categoryCircleContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryLabel: {
    fontSize: 10,
    textAlign: 'center',
    fontWeight: '500',
  },
  resultsSection: {
    flex: 1,
  },
  resultsRow: {
    // No horizontal padding of its own (2026-08-13) — now rendered
    // inside the FlatList's ListHeaderComponent, so horizontal inset
    // comes from listContent's contentContainerStyle padding instead
    // (see the SeasonBanner scrolling fix above).
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  resultsCount: {
    fontSize: 13,
    fontWeight: '600',
  },
  clearLink: {
    fontSize: 13,
    fontWeight: '500',
  },
  sectionHeading: {
    // Same as resultsRow above — no self-padding, inherits from
    // listContent now that it's inside ListHeaderComponent.
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
    gap: 12,
  },
  businessCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: COLORS.gold,
    padding: 12,
    gap: 12,
  },
  businessLogo: {
    width: 48,
    height: 48,
    borderRadius: 10,
    backgroundColor: COLORS.charcoal,
  },
  businessLogoFallback: {
    backgroundColor: COLORS.charcoal,
  },
  businessInfo: {
    flex: 1,
  },
  featuredBadge: {
    fontSize: 9,
    fontWeight: '700',
    color: COLORS.gold,
    letterSpacing: 0.5,
    marginBottom: 3,
  },
  businessName: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.ivory,
    marginBottom: 2,
  },
  businessSubtitle: {
    fontSize: 11,
    color: 'rgba(247,246,242,0.85)',
    marginBottom: 4,
  },
  discoverLink: {
    fontSize: 11,
    fontWeight: '600',
  },
  heartButton: {
    padding: 4,
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 12,
    textAlign: 'center',
  },
});
