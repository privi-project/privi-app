import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { GoogleMap, MarkerF, useLoadScript } from '@react-google-maps/api';
import { COLORS } from '@/constants/colors';
import { GoldGradientBorder } from '@/components/GoldGradient';
import { BrandMark } from '@/components/BrandMark';
import { BellIcon, MyLocationIcon } from '@/components/NavIcons';
import { NotificationPanel } from '@/components/NotificationPanel';
import { BusinessPreviewSheet } from '@/components/BusinessPreviewSheet';
import { BusinessPin, fetchBusinessPins, getMemberLocation } from '@/services/businesses';
import { fetchMyNotifications } from '@/services/notifications';
import { requestForegroundLocationPermission, getCurrentPosition } from '@/services/location';
import { openDirections } from '@/utils/mapsHandoff';
import { useAuthStore } from '@/store/auth';
import { useAppColorScheme } from '@/hooks/useAppColorScheme';

// This browser-preview-only stand-in for react-native-maps (which has no
// web renderer at all) uses the Google Maps JavaScript API instead of the
// native SDK, purely so the founder can actually see and tap pins while
// testing in this tool — the shipped app never runs this file (it only
// ships iOS/Android, where MapScreen.native.tsx's free native rendering is
// what's really used). Deliberately a second implementation rather than a
// react-native-maps/web polyfill, to keep native's free-rendering guarantee
// (app_map_cost_strategy memory) independent of whatever the web preview
// needs to work.
const LONDON_FALLBACK = { lat: 51.5074, lng: -0.1278 };

// A single blanket "colour everything the same" geometry rule (the
// previous version) made roads invisible — they ended up the exact same
// colour as the base map fill, with only labels/pins still visible. A
// real dark style needs each layer (base, roads, water, POI) given its
// own distinct tone so roads actually read against the background.
const DARK_MAP_STYLE: google.maps.MapTypeStyle[] = [
  { elementType: 'geometry', stylers: [{ color: '#212226' }] },
  { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#8A8983' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#212226' }] },
  { featureType: 'administrative', elementType: 'geometry', stylers: [{ color: '#3A3A42' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#3A3A42' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#2A2A30' }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#9CA3AF' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#4A4A54' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#1A3A38' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#6FA7A1' }] },
];

// Light-mode equivalent of DARK_MAP_STYLE's poi/transit hiding, with none
// of the color overrides — was previously missing entirely (light mode
// passed `styles: undefined`, Google's untouched default style), so the
// map showed every default POI pin (parks, hospitals, golf clubs,
// supermarkets...) instead of only Privi's own pins. Confirmed real bug
// 2026-08-12, not a design choice — the intent (see DARK_MAP_STYLE) was
// always "hide other businesses' pins," just never applied outside dark
// mode. Same fix as MapScreen.native.tsx.
const LIGHT_MAP_STYLE: google.maps.MapTypeStyle[] = [
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
];
const MAP_LIBRARIES: 'places'[] = [];
const PIN_ASSET = require('../../assets/brand/privi-pin.png');
// react-native-web's Metro asset plugin resolves a require()'d image
// straight to a usable string/URI at bundle time for the web target —
// there's no numeric asset id to resolve via Image.resolveAssetSource the
// way native needs (that method isn't implemented on web at all, SSR or
// client). Handle both shapes defensively rather than assuming one.
const PIN_URL = typeof PIN_ASSET === 'string' ? PIN_ASSET : PIN_ASSET.uri;

export default function MapScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const colorScheme = useAppColorScheme();
  const isDark = colorScheme === 'dark';
  const mapRef = useRef<google.maps.Map | null>(null);

  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ?? '',
    libraries: MAP_LIBRARIES,
  });

  const [pins, setPins] = useState<BusinessPin[]>([]);
  const [center, setCenter] = useState<{ lat: number; lng: number } | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [notificationsVisible, setNotificationsVisible] = useState(false);
  const [hasNotifications, setHasNotifications] = useState(false);
  const [selectedPin, setSelectedPin] = useState<BusinessPin | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [businessPins, memberLocation] = await Promise.all([
          fetchBusinessPins(),
          user ? getMemberLocation(user.id) : Promise.resolve(null),
        ]);
        setPins(businessPins);
        setCenter(
          memberLocation
            ? { lat: memberLocation.latitude, lng: memberLocation.longitude }
            : LONDON_FALLBACK
        );
      } catch (e) {
        console.error('Failed to load map data', e);
        setCenter(LONDON_FALLBACK);
      } finally {
        setLoadingData(false);
      }
    })();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    fetchMyNotifications()
      .then((n) => setHasNotifications(n.length > 0))
      .catch(() => setHasNotifications(false));
  }, [user]);

  // Same purpose as the native screen's locate button: recentre Privi's own
  // map on the member, not "Get Directions" (which routes to a specific
  // business via the phone's own maps app instead). Browser geolocation via
  // expo-location's web shim, same call as native.
  const handleLocateMe = useCallback(async () => {
    const granted = await requestForegroundLocationPermission();
    if (!granted) return;
    try {
      const position = await getCurrentPosition();
      const next = { lat: position.latitude, lng: position.longitude };
      setCenter(next);
      mapRef.current?.panTo(next);
      mapRef.current?.setZoom(14);
    } catch (e) {
      console.error('Failed to locate member', e);
    }
  }, []);

  // Fit the viewport to whatever pins actually exist rather than trusting a
  // fixed zoom around the member — with a sparse/far-flung set of
  // businesses (all of testing so far, and early real launch too), a tight
  // zoom on the member's own location can leave every pin off-screen,
  // looking like there are no pins at all rather than "pan out to see them."
  useEffect(() => {
    if (!isLoaded || !mapRef.current || pins.length === 0) return;
    const bounds = new google.maps.LatLngBounds();
    if (center) bounds.extend(center);
    pins.forEach((pin) => bounds.extend({ lat: pin.latitude, lng: pin.longitude }));
    mapRef.current.fitBounds(bounds, 60);
  }, [isLoaded, pins, center]);

  const icon = useMemo(
    () =>
      isLoaded
        ? { url: PIN_URL, scaledSize: new google.maps.Size(32, 40), anchor: new google.maps.Point(16, 40) }
        : undefined,
    [isLoaded]
  );

  const backgroundColor = isDark ? COLORS.charcoal : COLORS.ivory;

  if (loadingData || !center) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor }]}>
        <ActivityIndicator color={COLORS.teal} />
      </View>
    );
  }

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

      <View style={styles.mapWrap}>
        {loadError ? (
          <View style={[styles.centered, StyleSheet.absoluteFill]}>
            <Text style={{ color: isDark ? COLORS.ivory : COLORS.charcoal, textAlign: 'center', paddingHorizontal: 30 }}>
              Map couldn't load. Check that the Maps JavaScript API is enabled for the configured Google Maps key.
            </Text>
          </View>
        ) : !isLoaded ? (
          <View style={[styles.centered, StyleSheet.absoluteFill]}>
            <ActivityIndicator color={COLORS.teal} />
          </View>
        ) : (
          <GoogleMap
            mapContainerStyle={{ width: '100%', height: '100%' }}
            center={center}
            zoom={13}
            onLoad={(map) => {
              mapRef.current = map;
            }}
            options={{
              disableDefaultUI: true,
              styles: isDark ? DARK_MAP_STYLE : LIGHT_MAP_STYLE,
            }}
          >
            {pins.map((pin) => (
              <MarkerF
                key={pin.id}
                position={{ lat: pin.latitude, lng: pin.longitude }}
                icon={icon}
                onClick={() => setSelectedPin(pin)}
              />
            ))}
          </GoogleMap>
        )}

        <Pressable style={styles.locateButton} onPress={handleLocateMe} hitSlop={6}>
          <GoldGradientBorder borderWidth={1.5} borderRadius={22} backgroundColor={COLORS.teal} style={styles.locateButtonBorder} fillHeight>
            <View style={styles.locateButtonInner}>
              <MyLocationIcon color={COLORS.gold} size={20} />
            </View>
          </GoldGradientBorder>
        </Pressable>
      </View>

      <NotificationPanel
        visible={notificationsVisible}
        onClose={() => setNotificationsVisible(false)}
      />

      <BusinessPreviewSheet
        visible={!!selectedPin}
        business={selectedPin}
        onClose={() => setSelectedPin(null)}
        onSeeOffers={() => selectedPin && router.push(`/business/${selectedPin.businessId}`)}
        onGetDirections={() =>
          selectedPin && openDirections(selectedPin.latitude, selectedPin.longitude, selectedPin.name)
        }
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
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 12,
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
  mapWrap: {
    flex: 1,
  },
  locateButton: {
    position: 'absolute',
    right: 16,
    bottom: 20,
    width: 44,
    height: 44,
  },
  locateButtonBorder: {
    flex: 1,
  },
  locateButtonInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
