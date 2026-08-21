import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  Pressable,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { COLORS } from '@/constants/colors';
import { useAppColorScheme } from '@/hooks/useAppColorScheme';
import { Wordmark } from '@/components/BrandMark';
import { BellIcon, HeartIcon } from '@/components/NavIcons';
import { NotificationPanel } from '@/components/NotificationPanel';
import {
  FavouriteBusinessCard,
  fetchFavouriteBusinesses,
  removeFavourite,
} from '@/services/businesses';
import { useAuthStore } from '@/store/auth';
import { useNotificationDot } from '@/hooks/useNotificationDot';

export default function FavouritesScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const colorScheme = useAppColorScheme();
  const isDark = colorScheme === 'dark';

  const [favourites, setFavourites] = useState<FavouriteBusinessCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [notificationsVisible, setNotificationsVisible] = useState(false);
  const { hasNotifications, refresh: refreshNotificationDot } = useNotificationDot();

  const backgroundColor = isDark ? COLORS.charcoal : COLORS.ivory;
  const textColor = isDark ? COLORS.ivory : COLORS.charcoal;
  const subColor = isDark ? '#9CA3AF' : COLORS.mediumGray;
  const cardBg = isDark ? '#1E2126' : COLORS.white;

  const load = useCallback(async () => {
    if (!user) {
      setFavourites([]);
      setLoading(false);
      setRefreshing(false);
      return;
    }
    try {
      const data = await fetchFavouriteBusinesses(user.id);
      setFavourites(data);
    } catch (e) {
      console.error('Failed to load favourites', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  // Tab screens stay mounted when you switch away — a plain useEffect only
  // runs once on first mount, so a favourite added from Home while this
  // tab was already mounted (e.g. earlier in the session) never showed up
  // here until a full app reload. useFocusEffect re-runs every time this
  // tab is actually focused, not just the first time it's ever shown.
  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load();
    }, [load])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    load();
  };

  const handleRemove = async (businessId: string) => {
    if (!user) return;
    const previous = favourites;
    setFavourites(favourites.filter((f) => f.id !== businessId));
    try {
      await removeFavourite(user.id, businessId);
    } catch (e) {
      setFavourites(previous);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor }]}>
      <View style={styles.header}>
        {/* 2026-08-21: header icon removed (see SplashAnimation.tsx /
            HomeScreen.tsx for why) — plain 3-way flex balance instead of
            the absolute-overlay trick. */}
        <View style={styles.headerSpacer} />
        <View style={styles.headerWordmark}>
          <Wordmark size="sm" on={isDark ? 'dark' : 'light'} />
        </View>
        <Pressable
          style={styles.bellButton}
          onPress={() => setNotificationsVisible(true)}
          hitSlop={12}
        >
          <BellIcon color={COLORS.gold} />
          {hasNotifications && <View style={styles.notificationDot} />}
        </Pressable>
      </View>

      <Text style={[styles.title, { color: textColor }]}>Favourites</Text>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={COLORS.teal} />
      ) : favourites.length === 0 ? (
        <View style={styles.emptyState}>
          <HeartIcon color={COLORS.gold} size={32} />
          <Text style={[styles.emptyTitle, { color: textColor }]}>No favourites yet</Text>
          <Text style={[styles.emptySubtitle, { color: subColor }]}>
            Tap the heart on any business to save it here.
          </Text>
        </View>
      ) : (
        <FlatList
          data={favourites}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={COLORS.gold} />
          }
          renderItem={({ item }) => (
            <Pressable
              style={[styles.row, { backgroundColor: cardBg }]}
              onPress={() => router.push(`/business/${item.id}`)}
            >
              {item.logo_url ? (
                <Image source={{ uri: item.logo_url }} style={styles.logo} />
              ) : (
                <View style={[styles.logo, styles.logoFallback]} />
              )}
              <View style={styles.rowText}>
                <Text style={[styles.rowName, { color: textColor }]} numberOfLines={1}>
                  {item.name}
                </Text>
                {item.categoryLabel ? (
                  <Text style={[styles.rowCategory, { color: subColor }]} numberOfLines={1}>
                    {item.categoryLabel}
                  </Text>
                ) : null}
              </View>
              <Pressable hitSlop={10} onPress={() => handleRemove(item.id)} style={styles.heartButton}>
                <HeartIcon color={COLORS.gold} filled size={22} />
              </Pressable>
            </Pressable>
          )}
        />
      )}

      <NotificationPanel
        visible={notificationsVisible}
        onClose={() => {
          setNotificationsVisible(false);
          refreshNotificationDot();
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 56,
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
  title: {
    fontSize: 22,
    fontWeight: '700',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
    gap: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.gold,
    borderRadius: 14,
    padding: 12,
    gap: 12,
  },
  logo: {
    width: 48,
    height: 48,
    borderRadius: 10,
    backgroundColor: COLORS.charcoal,
  },
  logoFallback: {
    backgroundColor: COLORS.charcoal,
  },
  rowText: {
    flex: 1,
  },
  rowName: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  rowCategory: {
    fontSize: 12,
  },
  heartButton: {
    padding: 4,
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 40,
    gap: 10,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  emptySubtitle: {
    fontSize: 12,
    textAlign: 'center',
  },
});
