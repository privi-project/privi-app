import React, { useEffect, useState, useRef, useCallback } from 'react';
import { View, Image, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { useRouter } from 'expo-router';
import { COLORS } from '@/constants/colors';
import { GoldGradientBorder } from '@/components/GoldGradient';
import { BrandMark } from '@/components/BrandMark';
import { BellIcon, MyLocationIcon } from '@/components/NavIcons';
import { NotificationPanel } from '@/components/NotificationPanel';
import { BusinessPreviewSheet } from '@/components/BusinessPreviewSheet';
import { BusinessPin, fetchBusinessPins, getMemberLocation } from '@/services/businesses';
import { requestForegroundLocationPermission, getCurrentPosition } from '@/services/location';
import { useNotificationDot } from '@/hooks/useNotificationDot';
import { openDirections } from '@/utils/mapsHandoff';
import { useAuthStore } from '@/store/auth';
import { useAppColorScheme } from '@/hooks/useAppColorScheme';

// London fallback — used only if the member has neither GPS permission nor
// a stored Preferred Area yet (shouldn't normally happen post first-launch,
// but the map still needs somewhere to open to).
const FALLBACK_REGION = { latitude: 51.5074, longitude: -0.1278, latitudeDelta: 0.08, longitudeDelta: 0.08 };

const PIN_ASSET = require('../../assets/brand/privi-pin.png');

// Same style as MapScreen.web.tsx's DARK_MAP_STYLE — react-native-maps'
// customMapStyle takes the identical Google Maps style JSON, just without
// the (web-only) google.maps.MapTypeStyle[] type import.
const DARK_MAP_STYLE = [
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
// passed `[]`, Google's untouched default style), so the map showed every
// default POI pin (parks, hospitals, golf clubs, supermarkets...) instead
// of only Privi's own pins. Confirmed real bug 2026-08-12, not a design
// choice — the intent (see DARK_MAP_STYLE) was always "hide other
// businesses' pins," just never applied outside dark mode.
const LIGHT_MAP_STYLE = [
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
];

export default function MapScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const colorScheme = useAppColorScheme();
  const isDark = colorScheme === 'dark';
  const mapRef = useRef<MapView>(null);

  const [pins, setPins] = useState<BusinessPin[]>([]);
  const [initialRegion, setInitialRegion] = useState<typeof FALLBACK_REGION | null>(null);
  const [loading, setLoading] = useState(true);
  const [notificationsVisible, setNotificationsVisible] = useState(false);
  const { hasNotifications, refresh: refreshNotificationDot } = useNotificationDot();
  const [selectedPin, setSelectedPin] = useState<BusinessPin | null>(null);
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [businessPins, memberLocation] = await Promise.all([
          fetchBusinessPins(),
          user ? getMemberLocation(user.id) : Promise.resolve(null),
        ]);
        setPins(businessPins);
        setInitialRegion(
          memberLocation
            ? { ...memberLocation, latitudeDelta: 0.05, longitudeDelta: 0.05 }
            : FALLBACK_REGION
        );
      } catch (e) {
        console.error('Failed to load map data', e);
        setInitialRegion(FALLBACK_REGION);
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);


  // A custom, branded locate control on both platforms — Android's own
  // Google Maps SDK offers a built-in one, but iOS/Apple Maps has no
  // equivalent via react-native-maps at all, so relying on the OS default
  // would mean Android members get a recentre button and iOS members don't.
  // This is a different action from "Get Directions" on a pin: this one
  // recentres Privi's own map on the member so they can browse what's
  // nearby (the map's whole purpose), Get Directions routes *to* a specific
  // business in the phone's own maps app — unrelated to this button.
  const handleLocateMe = useCallback(async () => {
    const granted = await requestForegroundLocationPermission();
    if (!granted) return;
    try {
      const position = await getCurrentPosition();
      mapRef.current?.animateToRegion(
        { ...position, latitudeDelta: 0.05, longitudeDelta: 0.05 },
        400
      );
    } catch (e) {
      console.error('Failed to locate member', e);
    }
  }, []);

  // Fit the viewport to whatever pins actually exist rather than trusting a
  // fixed zoom/delta around the member — with a sparse/far-flung set of
  // businesses (all of testing so far, and early real launch too), a tight
  // initialRegion around the member's own location can leave every pin
  // off-screen, looking like there are no pins at all rather than "pan out
  // to see them."
  useEffect(() => {
    if (!mapReady || pins.length === 0 || !mapRef.current) return;
    const coordinates = pins.map((pin) => ({ latitude: pin.latitude, longitude: pin.longitude }));
    if (initialRegion) coordinates.push({ latitude: initialRegion.latitude, longitude: initialRegion.longitude });
    mapRef.current.fitToCoordinates(coordinates, {
      edgePadding: { top: 60, right: 60, bottom: 60, left: 60 },
      animated: true,
    });
  }, [mapReady, pins]);

  const backgroundColor = isDark ? COLORS.charcoal : COLORS.ivory;

  if (loading || !initialRegion) {
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
        <MapView
          ref={mapRef}
          style={StyleSheet.absoluteFill}
          initialRegion={initialRegion}
          onMapReady={() => setMapReady(true)}
          showsUserLocation
          // Our own gold-bordered button below replaces this everywhere so
          // the control looks the same on iOS and Android instead of one
          // platform getting Google's default styling and the other none.
          showsMyLocationButton={false}
          // Pinch-to-zoom (native gesture, always on) is the intended way
          // to zoom — the on-screen +/- buttons are Android-only chrome on
          // top of that gesture, switched off per product decision.
          zoomControlEnabled={false}
          // customMapStyle only affects Google Maps (Android here, since no
          // PROVIDER_GOOGLE override on iOS) — Apple Maps on iOS already
          // switches to its own dark map automatically with the system
          // appearance, no code needed there.
          customMapStyle={isDark ? DARK_MAP_STYLE : LIGHT_MAP_STYLE}
        >
          {pins.map((pin) => (
            <Marker
              key={pin.id}
              coordinate={{ latitude: pin.latitude, longitude: pin.longitude }}
              onPress={() => setSelectedPin(pin)}
            >
              {/* Default anchor (0.5, 1) is bottom-centre — matches this
                  pin-drop shaped asset's point exactly, no extra prop needed. */}
              <Image source={PIN_ASSET} style={styles.pinImage} resizeMode="contain" />
            </Marker>
          ))}
        </MapView>

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
        onClose={() => {
          setNotificationsVisible(false);
          refreshNotificationDot();
        }}
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
  pinImage: {
    width: 32,
    height: 40,
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
