import React, { useEffect, useRef, useState } from 'react';
import { Platform, StyleSheet, View, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ENV } from '@/shared/config/env';
import { useTheme } from '@/shared/theme';
import { Text } from '@/shared/ui/Text';
import type { GeoPoint } from '../api/discovery.contract';

export interface MapMarkerItem {
  id: string;
  title: string;
  subtitle?: string;
  coordinates: GeoPoint;
}

export interface GoogleMapCanvasProps {
  markers: MapMarkerItem[];
  selectedMarkerId?: string | null;
  onSelectMarker?: (id: string) => void;
  userCoordinates?: GeoPoint | null;
  draggablePin?: GeoPoint | null;
  onPinDragEnd?: (point: GeoPoint) => void;
  height?: number;
  testID?: string;
}

let NativeMapView: any = null;
let NativeMarker: any = null;
let PROVIDER_GOOGLE: any = null;

if (Platform.OS !== 'web') {
  try {
    const maps = require('react-native-maps');
    NativeMapView = maps.default || maps.MapView;
    NativeMarker = maps.Marker;
    PROVIDER_GOOGLE = maps.PROVIDER_GOOGLE;
  } catch {
    NativeMapView = null;
    NativeMarker = null;
    PROVIDER_GOOGLE = null;
  }
}

let googleMapsLoaderPromise: Promise<any> | null = null;

export function loadGoogleMapsWebSdk(apiKey: string): Promise<any> {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return Promise.reject(new Error('Ambiente navegador indisponível.'));
  }

  const win = window as any;
  if (win.google?.maps?.Map) {
    return Promise.resolve(win.google.maps);
  }

  if (!apiKey) {
    return Promise.reject(
      new Error('Chave EXPO_PUBLIC_GOOGLE_MAPS_WEB_API_KEY não configurada.'),
    );
  }

  if (googleMapsLoaderPromise) {
    return googleMapsLoaderPromise;
  }

  googleMapsLoaderPromise = new Promise((resolve, reject) => {
    const existing = document.getElementById('smart-barber-google-maps-sdk');
    if (existing) {
      if (win.google?.maps?.Map) {
        resolve(win.google.maps);
        return;
      }
      existing.addEventListener('load', () => {
        if (win.google?.maps?.Map) {
          resolve(win.google.maps);
        } else {
          googleMapsLoaderPromise = null;
          reject(new Error('Google Maps SDK carregou sem construtor Map.'));
        }
      });
      existing.addEventListener('error', () => {
        googleMapsLoaderPromise = null;
        reject(new Error('Falha ao carregar o script do Google Maps.'));
      });
      return;
    }

    const script = document.createElement('script');
    script.id = 'smart-barber-google-maps-sdk';
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&v=weekly`;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      if (win.google?.maps?.Map) {
        resolve(win.google.maps);
      } else {
        googleMapsLoaderPromise = null;
        reject(new Error('Google Maps SDK indisponível após carregamento.'));
      }
    };
    script.onerror = () => {
      googleMapsLoaderPromise = null;
      reject(new Error('Não foi possível carregar o Google Maps SDK.'));
    };
    document.head.appendChild(script);
  });

  return googleMapsLoaderPromise;
}

export function resetGoogleMapsLoaderForTests() {
  googleMapsLoaderPromise = null;
}

export function GoogleMapCanvas({
  markers,
  selectedMarkerId,
  onSelectMarker,
  userCoordinates,
  draggablePin,
  onPinDragEnd,
  height = 240,
  testID = 'google-map-canvas',
}: GoogleMapCanvasProps) {
  const { colors, radius } = useTheme();
  const containerRef = useRef<any>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRefs = useRef<any[]>([]);
  const draggableMarkerRef = useRef<any>(null);

  const [sdkState, setSdkState] = useState<'idle' | 'loading' | 'ready' | 'fallback'>(() => {
    if (Platform.OS !== 'web') return 'fallback';
    const win = typeof window !== 'undefined' ? (window as any) : undefined;
    if (win?.google?.maps?.Map) return 'ready';
    return ENV.GOOGLE_MAPS_WEB_API_KEY ? 'loading' : 'fallback';
  });

  const [sdkErrorReason, setSdkErrorReason] = useState<string | null>(() => {
    if (Platform.OS !== 'web') {
      return 'Pré-visualização nativa em modo esquemático (Google Maps SDK nativo requer build com chave nativa).';
    }
    if (!ENV.GOOGLE_MAPS_WEB_API_KEY) {
      return 'Chave EXPO_PUBLIC_GOOGLE_MAPS_WEB_API_KEY ausente no ambiente local. Exibindo mapa interativo de contingência.';
    }
    return null;
  });

  useEffect(() => {
    if (Platform.OS !== 'web') {
      setSdkState('fallback');
      return;
    }

    const win = typeof window !== 'undefined' ? (window as any) : undefined;
    if (win?.google?.maps?.Map) {
      setSdkState('ready');
      setSdkErrorReason(null);
      return;
    }

    if (!ENV.GOOGLE_MAPS_WEB_API_KEY) {
      setSdkState('fallback');
      setSdkErrorReason(
        'Chave EXPO_PUBLIC_GOOGLE_MAPS_WEB_API_KEY não configurada. Exibindo visualização geográfica de contingência.',
      );
      return;
    }

    let cancelled = false;
    setSdkState('loading');

    loadGoogleMapsWebSdk(ENV.GOOGLE_MAPS_WEB_API_KEY)
      .then(() => {
        if (!cancelled) {
          setSdkState('ready');
          setSdkErrorReason(null);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setSdkState('fallback');
          setSdkErrorReason(
            err instanceof Error
              ? err.message
              : 'Google Maps SDK indisponível no momento.',
          );
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'web' || sdkState !== 'ready' || !containerRef.current) {
      return;
    }

    const gmaps = (window as any).google?.maps;
    if (!gmaps?.Map) return;

    const defaultCenter = draggablePin
      ? { lat: draggablePin.latitude, lng: draggablePin.longitude }
      : userCoordinates
      ? { lat: userCoordinates.latitude, lng: userCoordinates.longitude }
      : markers[0]
      ? { lat: markers[0].coordinates.latitude, lng: markers[0].coordinates.longitude }
      : { lat: -23.55052, lng: -46.633308 };

    if (!mapInstanceRef.current) {
      mapInstanceRef.current = new gmaps.Map(containerRef.current, {
        center: defaultCenter,
        zoom: draggablePin ? 17 : 13,
        mapId: ENV.GOOGLE_MAPS_MAP_ID || undefined,
        disableDefaultUI: false,
        streetViewControl: false,
        mapTypeControl: false,
      });
    } else {
      mapInstanceRef.current.setCenter(defaultCenter);
    }

    // Limpar marcadores anteriores
    markerRefs.current.forEach((m) => m?.setMap?.(null));
    markerRefs.current = [];

    if (draggableMarkerRef.current) {
      draggableMarkerRef.current.setMap?.(null);
      draggableMarkerRef.current = null;
    }

    const map = mapInstanceRef.current;

    if (draggablePin) {
      const pinMarker = new gmaps.Marker({
        position: { lat: draggablePin.latitude, lng: draggablePin.longitude },
        map,
        draggable: Boolean(onPinDragEnd),
        title: 'Localização comercial da barbearia',
      });

      if (onPinDragEnd && pinMarker.addListener) {
        pinMarker.addListener('dragend', (event: any) => {
          const lat = event?.latLng?.lat?.();
          const lng = event?.latLng?.lng?.();
          if (typeof lat === 'number' && typeof lng === 'number') {
            onPinDragEnd({ latitude: lat, longitude: lng });
          }
        });
      }

      draggableMarkerRef.current = pinMarker;
    }

    markers.forEach((item) => {
      const marker = new gmaps.Marker({
        position: {
          lat: item.coordinates.latitude,
          lng: item.coordinates.longitude,
        },
        map,
        title: item.title,
      });

      if (onSelectMarker && marker.addListener) {
        marker.addListener('click', () => {
          onSelectMarker(item.id);
        });
      }

      markerRefs.current.push(marker);
    });
  }, [sdkState, markers, userCoordinates, draggablePin, onSelectMarker, onPinDragEnd]);

  const nudgePin = (dLat: number, dLng: number) => {
    if (!draggablePin || !onPinDragEnd) return;
    onPinDragEnd({
      latitude: Number((draggablePin.latitude + dLat).toFixed(6)),
      longitude: Number((draggablePin.longitude + dLng).toFixed(6)),
    });
  };

  return (
    <View
      testID={testID}
      style={[
        styles.wrapper,
        {
          minHeight: height,
          borderColor: colors.border.subtle,
          backgroundColor: colors.surface.input,
          borderRadius: radius.md,
        },
      ]}
    >
      {Platform.OS !== 'web' && NativeMapView ? (
        <View style={[styles.sdkSurface, { height }]} testID={`${testID}-native-surface`}>
          <NativeMapView
            provider={PROVIDER_GOOGLE}
            style={StyleSheet.absoluteFill}
            initialRegion={{
              latitude:
                draggablePin?.latitude ??
                userCoordinates?.latitude ??
                markers[0]?.coordinates?.latitude ??
                -23.55052,
              longitude:
                draggablePin?.longitude ??
                userCoordinates?.longitude ??
                markers[0]?.coordinates?.longitude ??
                -46.633308,
              latitudeDelta: draggablePin ? 0.005 : 0.05,
              longitudeDelta: draggablePin ? 0.005 : 0.05,
            }}
          >
            {draggablePin ? (
              <NativeMarker
                coordinate={{
                  latitude: draggablePin.latitude,
                  longitude: draggablePin.longitude,
                }}
                draggable={Boolean(onPinDragEnd)}
                onDragEnd={(e: any) => {
                  const coord = e?.nativeEvent?.coordinate;
                  if (coord && onPinDragEnd) {
                    onPinDragEnd({
                      latitude: coord.latitude,
                      longitude: coord.longitude,
                    });
                  }
                }}
                title="Localização comercial da barbearia"
              />
            ) : null}
            {markers.map((item) => (
              <NativeMarker
                key={item.id}
                coordinate={{
                  latitude: item.coordinates.latitude,
                  longitude: item.coordinates.longitude,
                }}
                title={item.title}
                description={item.subtitle}
                onPress={() => onSelectMarker?.(item.id)}
              />
            ))}
          </NativeMapView>
        </View>
      ) : Platform.OS === 'web' && sdkState === 'ready' ? (
        <View
          ref={containerRef}
          testID={`${testID}-sdk-surface`}
          style={[styles.sdkSurface, { height }]}
        />
      ) : (
        <View style={[styles.fallbackSurface, { minHeight: height }]}>
          <View style={styles.fallbackHeader}>
            <View style={styles.attributionBadge}>
              <Ionicons name="map-outline" size={14} color={colors.brand.primary} />
              <Text variant="caption" weight="bold" color={colors.text.primary}>
                Google Maps
              </Text>
            </View>
            {userCoordinates && (
              <Text variant="caption" color={colors.text.secondary}>
                GPS: {userCoordinates.latitude.toFixed(4)}, {userCoordinates.longitude.toFixed(4)}
              </Text>
            )}
          </View>

          {sdkErrorReason && (
            <Text variant="caption" color={colors.text.secondary} style={styles.reasonText}>
              {sdkErrorReason}
            </Text>
          )}

          {draggablePin ? (
            <View
              style={[
                styles.draggablePinPanel,
                {
                  borderColor: colors.border.subtle,
                  backgroundColor: colors.surface.default,
                  borderRadius: radius.sm,
                },
              ]}
            >
              <View style={styles.pinCoordsRow}>
                <Ionicons name="location" size={18} color={colors.brand.primary} />
                <Text variant="caption" weight="bold" color={colors.text.primary}>
                  Pino selecionado: {draggablePin.latitude.toFixed(6)},{' '}
                  {draggablePin.longitude.toFixed(6)}
                </Text>
              </View>

              {onPinDragEnd && (
                <View style={styles.nudgeRow}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Ajustar pino para o norte"
                    onPress={() => nudgePin(0.0002, 0)}
                    style={[
                      styles.nudgeButton,
                      {
                        borderColor: colors.border.default,
                        backgroundColor: colors.surface.input,
                        borderRadius: radius.sm,
                      },
                    ]}
                  >
                    <Text variant="caption" weight="semibold" color={colors.text.primary}>
                      Norte (+20m)
                    </Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Ajustar pino para o sul"
                    onPress={() => nudgePin(-0.0002, 0)}
                    style={[
                      styles.nudgeButton,
                      {
                        borderColor: colors.border.default,
                        backgroundColor: colors.surface.input,
                        borderRadius: radius.sm,
                      },
                    ]}
                  >
                    <Text variant="caption" weight="semibold" color={colors.text.primary}>
                      Sul (-20m)
                    </Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Ajustar pino para o leste"
                    onPress={() => nudgePin(0, 0.0002)}
                    style={[
                      styles.nudgeButton,
                      {
                        borderColor: colors.border.default,
                        backgroundColor: colors.surface.input,
                        borderRadius: radius.sm,
                      },
                    ]}
                  >
                    <Text variant="caption" weight="semibold" color={colors.text.primary}>
                      Leste (+20m)
                    </Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Ajustar pino para o oeste"
                    onPress={() => nudgePin(0, -0.0002)}
                    style={[
                      styles.nudgeButton,
                      {
                        borderColor: colors.border.default,
                        backgroundColor: colors.surface.input,
                        borderRadius: radius.sm,
                      },
                    ]}
                  >
                    <Text variant="caption" weight="semibold" color={colors.text.primary}>
                      Oeste (-20m)
                    </Text>
                  </Pressable>
                </View>
              )}
            </View>
          ) : (
            <View style={styles.markersChipGrid}>
              {markers.map((marker) => {
                const isSelected = selectedMarkerId === marker.id;
                return (
                  <Pressable
                    key={marker.id}
                    accessibilityRole="button"
                    accessibilityLabel={`Marcador no mapa: ${marker.title}`}
                    onPress={() => onSelectMarker?.(marker.id)}
                    style={[
                      styles.markerChip,
                      {
                        borderColor: isSelected
                          ? colors.brand.primary
                          : colors.border.subtle,
                        backgroundColor: isSelected
                          ? colors.surface.selected
                          : colors.surface.default,
                        borderRadius: radius.sm,
                      },
                    ]}
                  >
                    <Ionicons
                      name="location"
                      size={14}
                      color={colors.brand.primary}
                    />
                    <Text
                      variant="caption"
                      weight="semibold"
                      color={colors.text.primary}
                      numberOfLines={1}
                    >
                      {marker.title}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 12,
  },
  sdkSurface: {
    width: '100%',
  },
  fallbackSurface: {
    padding: 12,
    justifyContent: 'space-between',
    gap: 10,
  },
  fallbackHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
  },
  attributionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  reasonText: {
    fontSize: 11,
  },
  markersChipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  markerChip: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 44,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    gap: 6,
  },
  draggablePinPanel: {
    padding: 10,
    borderWidth: 1,
    gap: 8,
  },
  pinCoordsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  nudgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  nudgeButton: {
    minHeight: 44,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
