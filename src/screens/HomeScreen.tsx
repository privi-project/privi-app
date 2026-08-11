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
import { BrandMark } from '@/components/BrandMark';
import { GoldGradientText, GoldGradientBorder } from '@/components/GoldGradient';
import { BellIcon, SearchIcon, HeartIcon } from '@/components/NavIcons';
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
import { fetchMyNotifications } from '@/services/notifications';
import { fetchActiveSeasonBanner, SeasonBanner as SeasonBannerData } from '@/services/banners';
import { useAuthStore } from '@/store/auth';

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
  const [favouritesOnly, setFavouritesOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [notificationsVisible, setNotificationsVisible] = useState(false);
  const [hasNotifications, setHasNotifications] = useState(false);
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

  const loadData = useCallback(async () => {
    try {
      const [cats, memberLocation] = await Promise.all([
        fetchCategories(),
        user ? getMemberLocation(user.id) : Promise.resolve(null),
      ]);
      setCategories(cats);

      const [biz, favIds] = await Promise.all([
        fetchBusinesses({
          categoryIds: effectiveCategoryIds,
          searchQuery: activeQuery ?? undefined,
          memberLocation,
          maxDistanceMiles: selectedDistance,
          accessibleOnly,
        }),
        user ? fetchFavouriteIds(user.id) : Promise.resolve(new Set<string>()),
      ]);
      setBusinesses(biz);
      setFavouriteIds(favIds);
    } catch (e) {
      console.error('Failed to load homepage data', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user, effectiveCategoryIds, activeQuery, selectedDistance, accessibleOnly]);

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

  useEffect(() => {
    if (!user) return;
    fetchMyNotifications()
      .then((n) => setHasNotifications(n.length > 0))
      .catch(() => setHasNotifications(false));
  }, [user]);

  // Season banner is not member-specific and not affected by search/filter
  // state — fetch once on mount. Admin Portal keeps it off (is_active=false)
  // until the founder creates and publishes one, so null here is the
  // normal, expected state, not an error.
  useEffect(() => {
    fetchActiveSeasonBanner()
      .then(setSeasonBanner)
      .catch((e) => console.error('Failed to load season banner', e));
  }, []);

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
        <View style={styles.headerSpacer} />
        <BrandMark size="sm" on={isDark ? 'dark' : 'light'} />
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
                placeholder="Search businesses, towns or categories"
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

        {loading ? (
          <ActivityIndicator style={{ marginTop: 40 }} color={COLORS.teal} />
        ) : displayedBusinesses.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={[styles.emptyTitle, { color: textColor }]}>No businesses found</Text>
            <Text style={[styles.emptySubtitle, { color: placeholderColor }]}>
              {favouritesOnly
                ? 'No favourites match your other filters yet.'
                : 'Try changing your search or explore different categories.'}
            </Text>
          </View>
        ) : (
          <FlatList
            data={displayedBusinesses}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={COLORS.gold} />
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
        )}
      </Animated.View>

      <NotificationPanel
        visible={notificationsVisible}
        onClose={() => setNotificationsVisible(false)}
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
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
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
    paddingHorizontal: 20,
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
