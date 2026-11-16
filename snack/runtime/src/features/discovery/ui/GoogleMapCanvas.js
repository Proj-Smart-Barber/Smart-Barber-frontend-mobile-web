import React, { useEffect, useRef, useState } from 'react';
import { Platform, StyleSheet, View, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ENV } from '../../../shared/config/env';
import { useTheme } from '../../../shared/theme';
import { Text } from '../../../shared/ui/Text';
let NativeMapView = null;
let NativeMarker = null;
let PROVIDER_GOOGLE = null;
if (Platform.OS !== 'web') {
    try {
        const maps = require('react-native-maps');
        NativeMapView = maps.default || maps.MapView;
        NativeMarker = maps.Marker;
        PROVIDER_GOOGLE = maps.PROVIDER_GOOGLE;
    }
    catch {
        NativeMapView = null;
        NativeMarker = null;
        PROVIDER_GOOGLE = null;
    }
}
let googleMapsLoaderPromise = null;
const authFailureListeners = new Set();
let hasAuthFailed = false;
let authFailureReason = null;
export function getGoogleMapsAuthFailureState() {
    return { hasAuthFailed, reason: authFailureReason };
}
export function registerGmAuthFailureListener(listener) {
    authFailureListeners.add(listener);
    return () => {
        authFailureListeners.delete(listener);
    };
}
export function notifyGmAuthFailure(reason) {
    hasAuthFailed = true;
    authFailureReason =
        reason ||
            'Autorização da chave do Google Maps não permitida para este domínio ou origem (Referer). Exibindo mapa de contingência.';
    googleMapsLoaderPromise = null;
    authFailureListeners.forEach((listener) => {
        try {
            listener(authFailureReason);
        }
        catch (err) {
            console.error('[GoogleMapCanvas] Error in auth failure listener:', err);
        }
    });
}
function ensureGlobalGmAuthFailureHandler() {
    if (typeof window === 'undefined')
        return;
    const win = window;
    if (win.__smartBarberGmAuthHandlerInstalled)
        return;
    win.__smartBarberGmAuthHandlerInstalled = true;
    const previousHandler = typeof win.gm_authFailure === 'function' ? win.gm_authFailure : null;
    win.gm_authFailure = () => {
        notifyGmAuthFailure();
        if (previousHandler) {
            try {
                previousHandler();
            }
            catch (err) {
                console.error('[GoogleMapCanvas] Error in previous gm_authFailure handler:', err);
            }
        }
    };
}
export function loadGoogleMapsWebSdk(apiKey) {
    var _a, _b;
    if (typeof window === 'undefined' || typeof document === 'undefined') {
        return Promise.reject(new Error('Ambiente navegador indisponível.'));
    }
    ensureGlobalGmAuthFailureHandler();
    if (hasAuthFailed) {
        return Promise.reject(new Error(authFailureReason ||
            'Google Maps SDK indisponível: autorização recusada para este domínio.'));
    }
    const win = window;
    if ((_b = (_a = win.google) === null || _a === void 0 ? void 0 : _a.maps) === null || _b === void 0 ? void 0 : _b.Map) {
        return Promise.resolve(win.google.maps);
    }
    if (!apiKey) {
        return Promise.reject(new Error('Chave EXPO_PUBLIC_GOOGLE_MAPS_WEB_API_KEY não configurada.'));
    }
    if (googleMapsLoaderPromise) {
        return googleMapsLoaderPromise;
    }
    googleMapsLoaderPromise = new Promise((resolve, reject) => {
        var _a, _b;
        const existing = document.getElementById('smart-barber-google-maps-sdk');
        if (existing) {
            if (hasAuthFailed) {
                googleMapsLoaderPromise = null;
                reject(new Error(authFailureReason || 'Autorização do Google Maps recusada.'));
                return;
            }
            if ((_b = (_a = win.google) === null || _a === void 0 ? void 0 : _a.maps) === null || _b === void 0 ? void 0 : _b.Map) {
                resolve(win.google.maps);
                return;
            }
            existing.addEventListener('load', () => {
                var _a, _b;
                if (hasAuthFailed) {
                    googleMapsLoaderPromise = null;
                    reject(new Error(authFailureReason || 'Autorização do Google Maps recusada.'));
                }
                else if ((_b = (_a = win.google) === null || _a === void 0 ? void 0 : _a.maps) === null || _b === void 0 ? void 0 : _b.Map) {
                    resolve(win.google.maps);
                }
                else {
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
            var _a, _b;
            if (hasAuthFailed) {
                googleMapsLoaderPromise = null;
                reject(new Error(authFailureReason || 'Autorização do Google Maps recusada.'));
            }
            else if ((_b = (_a = win.google) === null || _a === void 0 ? void 0 : _a.maps) === null || _b === void 0 ? void 0 : _b.Map) {
                resolve(win.google.maps);
            }
            else {
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
    hasAuthFailed = false;
    authFailureReason = null;
    authFailureListeners.clear();
    if (typeof window !== 'undefined') {
        const win = window;
        delete win.gm_authFailure;
        delete win.__smartBarberGmAuthHandlerInstalled;
        if (typeof document !== 'undefined') {
            const existing = document.getElementById('smart-barber-google-maps-sdk');
            if (existing) {
                existing.remove();
            }
        }
    }
}
export function GoogleMapCanvas({ markers, selectedMarkerId, onSelectMarker, userCoordinates, draggablePin, onPinDragEnd, height = 240, testID = 'google-map-canvas', }) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
    const { colors, radius } = useTheme();
    const containerRef = useRef(null);
    const mapInstanceRef = useRef(null);
    const markerRefs = useRef([]);
    const draggableMarkerRef = useRef(null);
    const [sdkState, setSdkState] = useState(() => {
        var _a, _b;
        if (Platform.OS !== 'web')
            return 'fallback';
        if (hasAuthFailed)
            return 'fallback';
        const win = typeof window !== 'undefined' ? window : undefined;
        if ((_b = (_a = win === null || win === void 0 ? void 0 : win.google) === null || _a === void 0 ? void 0 : _a.maps) === null || _b === void 0 ? void 0 : _b.Map)
            return 'ready';
        return ENV.GOOGLE_MAPS_WEB_API_KEY ? 'loading' : 'fallback';
    });
    const [sdkErrorReason, setSdkErrorReason] = useState(() => {
        if (Platform.OS !== 'web') {
            return 'Pré-visualização nativa em modo esquemático (Google Maps SDK nativo requer build com chave nativa).';
        }
        if (hasAuthFailed) {
            return (authFailureReason ||
                'Autorização da chave do Google Maps não permitida para este domínio ou origem (Referer). Exibindo mapa de contingência.');
        }
        if (!ENV.GOOGLE_MAPS_WEB_API_KEY) {
            return 'Chave EXPO_PUBLIC_GOOGLE_MAPS_WEB_API_KEY ausente no ambiente local. Exibindo mapa interativo de contingência.';
        }
        return null;
    });
    useEffect(() => {
        var _a, _b;
        if (Platform.OS !== 'web')
            return;
        ensureGlobalGmAuthFailureHandler();
        if (hasAuthFailed) {
            setSdkState('fallback');
            setSdkErrorReason(authFailureReason ||
                'Autorização da chave do Google Maps não permitida para este domínio ou origem (Referer). Exibindo mapa de contingência.');
            if (mapInstanceRef.current) {
                markerRefs.current.forEach((m) => { var _a; return (_a = m === null || m === void 0 ? void 0 : m.setMap) === null || _a === void 0 ? void 0 : _a.call(m, null); });
                markerRefs.current = [];
                if (draggableMarkerRef.current) {
                    (_b = (_a = draggableMarkerRef.current) === null || _a === void 0 ? void 0 : _a.setMap) === null || _b === void 0 ? void 0 : _b.call(_a, null);
                    draggableMarkerRef.current = null;
                }
                mapInstanceRef.current = null;
            }
            return;
        }
        const unregister = registerGmAuthFailureListener((reason) => {
            var _a, _b;
            setSdkState('fallback');
            setSdkErrorReason(reason ||
                'Autorização da chave do Google Maps não permitida para este domínio ou origem (Referer). Exibindo mapa de contingência.');
            if (mapInstanceRef.current) {
                markerRefs.current.forEach((m) => { var _a; return (_a = m === null || m === void 0 ? void 0 : m.setMap) === null || _a === void 0 ? void 0 : _a.call(m, null); });
                markerRefs.current = [];
                if (draggableMarkerRef.current) {
                    (_b = (_a = draggableMarkerRef.current) === null || _a === void 0 ? void 0 : _a.setMap) === null || _b === void 0 ? void 0 : _b.call(_a, null);
                    draggableMarkerRef.current = null;
                }
                mapInstanceRef.current = null;
            }
        });
        return () => {
            unregister();
        };
    }, []);
    useEffect(() => {
        var _a, _b;
        if (Platform.OS !== 'web') {
            setSdkState('fallback');
            return;
        }
        if (hasAuthFailed) {
            setSdkState('fallback');
            setSdkErrorReason(authFailureReason ||
                'Autorização da chave do Google Maps não permitida para este domínio ou origem (Referer). Exibindo mapa de contingência.');
            return;
        }
        const win = typeof window !== 'undefined' ? window : undefined;
        if ((_b = (_a = win === null || win === void 0 ? void 0 : win.google) === null || _a === void 0 ? void 0 : _a.maps) === null || _b === void 0 ? void 0 : _b.Map) {
            setSdkState('ready');
            setSdkErrorReason(null);
            return;
        }
        if (!ENV.GOOGLE_MAPS_WEB_API_KEY) {
            setSdkState('fallback');
            setSdkErrorReason('Chave EXPO_PUBLIC_GOOGLE_MAPS_WEB_API_KEY não configurada. Exibindo visualização geográfica de contingência.');
            return;
        }
        let cancelled = false;
        setSdkState('loading');
        loadGoogleMapsWebSdk(ENV.GOOGLE_MAPS_WEB_API_KEY)
            .then(() => {
            if (!cancelled) {
                if (hasAuthFailed) {
                    setSdkState('fallback');
                    setSdkErrorReason(authFailureReason ||
                        'Autorização da chave do Google Maps não permitida para este domínio ou origem (Referer). Exibindo mapa de contingência.');
                }
                else {
                    setSdkState('ready');
                    setSdkErrorReason(null);
                }
            }
        })
            .catch((err) => {
            if (!cancelled) {
                setSdkState('fallback');
                setSdkErrorReason(err instanceof Error
                    ? err.message
                    : 'Google Maps SDK indisponível no momento.');
            }
        });
        return () => {
            cancelled = true;
        };
    }, []);
    useEffect(() => {
        var _a, _b, _c;
        if (Platform.OS !== 'web' || sdkState !== 'ready' || !containerRef.current) {
            return;
        }
        const gmaps = (_a = window.google) === null || _a === void 0 ? void 0 : _a.maps;
        if (!(gmaps === null || gmaps === void 0 ? void 0 : gmaps.Map))
            return;
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
        }
        else {
            mapInstanceRef.current.setCenter(defaultCenter);
        }
        // Limpar marcadores anteriores
        markerRefs.current.forEach((m) => { var _a; return (_a = m === null || m === void 0 ? void 0 : m.setMap) === null || _a === void 0 ? void 0 : _a.call(m, null); });
        markerRefs.current = [];
        if (draggableMarkerRef.current) {
            (_c = (_b = draggableMarkerRef.current).setMap) === null || _c === void 0 ? void 0 : _c.call(_b, null);
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
                pinMarker.addListener('dragend', (event) => {
                    var _a, _b, _c, _d;
                    const lat = (_b = (_a = event === null || event === void 0 ? void 0 : event.latLng) === null || _a === void 0 ? void 0 : _a.lat) === null || _b === void 0 ? void 0 : _b.call(_a);
                    const lng = (_d = (_c = event === null || event === void 0 ? void 0 : event.latLng) === null || _c === void 0 ? void 0 : _c.lng) === null || _d === void 0 ? void 0 : _d.call(_c);
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
        return () => {
            var _a, _b;
            markerRefs.current.forEach((m) => { var _a; return (_a = m === null || m === void 0 ? void 0 : m.setMap) === null || _a === void 0 ? void 0 : _a.call(m, null); });
            markerRefs.current = [];
            if (draggableMarkerRef.current) {
                (_b = (_a = draggableMarkerRef.current).setMap) === null || _b === void 0 ? void 0 : _b.call(_a, null);
                draggableMarkerRef.current = null;
            }
        };
    }, [sdkState, markers, userCoordinates, draggablePin, onSelectMarker, onPinDragEnd]);
    const nudgePin = (dLat, dLng) => {
        if (!draggablePin || !onPinDragEnd)
            return;
        onPinDragEnd({
            latitude: Number((draggablePin.latitude + dLat).toFixed(6)),
            longitude: Number((draggablePin.longitude + dLng).toFixed(6)),
        });
    };
    return (<View testID={testID} style={[
            styles.wrapper,
            {
                minHeight: height,
                borderColor: colors.border.subtle,
                backgroundColor: colors.surface.input,
                borderRadius: radius.md,
            },
        ]}>
      {Platform.OS !== 'web' && NativeMapView ? (<View style={[styles.sdkSurface, { height }]} testID={`${testID}-native-surface`}>
          <NativeMapView provider={PROVIDER_GOOGLE} style={StyleSheet.absoluteFill} initialRegion={{
                latitude: (_e = (_b = (_a = draggablePin === null || draggablePin === void 0 ? void 0 : draggablePin.latitude) !== null && _a !== void 0 ? _a : userCoordinates === null || userCoordinates === void 0 ? void 0 : userCoordinates.latitude) !== null && _b !== void 0 ? _b : (_d = (_c = markers[0]) === null || _c === void 0 ? void 0 : _c.coordinates) === null || _d === void 0 ? void 0 : _d.latitude) !== null && _e !== void 0 ? _e : -23.55052,
                longitude: (_k = (_g = (_f = draggablePin === null || draggablePin === void 0 ? void 0 : draggablePin.longitude) !== null && _f !== void 0 ? _f : userCoordinates === null || userCoordinates === void 0 ? void 0 : userCoordinates.longitude) !== null && _g !== void 0 ? _g : (_j = (_h = markers[0]) === null || _h === void 0 ? void 0 : _h.coordinates) === null || _j === void 0 ? void 0 : _j.longitude) !== null && _k !== void 0 ? _k : -46.633308,
                latitudeDelta: draggablePin ? 0.005 : 0.05,
                longitudeDelta: draggablePin ? 0.005 : 0.05,
            }}>
            {draggablePin ? (<NativeMarker coordinate={{
                    latitude: draggablePin.latitude,
                    longitude: draggablePin.longitude,
                }} draggable={Boolean(onPinDragEnd)} onDragEnd={(e) => {
                    var _a;
                    const coord = (_a = e === null || e === void 0 ? void 0 : e.nativeEvent) === null || _a === void 0 ? void 0 : _a.coordinate;
                    if (coord && onPinDragEnd) {
                        onPinDragEnd({
                            latitude: coord.latitude,
                            longitude: coord.longitude,
                        });
                    }
                }} title="Localização comercial da barbearia"/>) : null}
            {markers.map((item) => (<NativeMarker key={item.id} coordinate={{
                    latitude: item.coordinates.latitude,
                    longitude: item.coordinates.longitude,
                }} title={item.title} description={item.subtitle} onPress={() => onSelectMarker === null || onSelectMarker === void 0 ? void 0 : onSelectMarker(item.id)}/>))}
          </NativeMapView>
        </View>) : Platform.OS === 'web' && sdkState === 'ready' ? (<View ref={containerRef} testID={`${testID}-sdk-surface`} style={[styles.sdkSurface, { height }]}/>) : (<View style={[styles.fallbackSurface, { minHeight: height }]}>
          <View style={styles.fallbackHeader}>
            <View style={styles.attributionBadge}>
              <Ionicons name="map-outline" size={14} color={colors.brand.primary}/>
              <Text variant="caption" weight="bold" color={colors.text.primary}>
                Google Maps
              </Text>
            </View>
            {userCoordinates && (<Text variant="caption" color={colors.text.secondary}>
                GPS: {userCoordinates.latitude.toFixed(4)}, {userCoordinates.longitude.toFixed(4)}
              </Text>)}
          </View>

          {sdkErrorReason && (<Text variant="caption" color={colors.text.secondary} style={styles.reasonText}>
              {sdkErrorReason}
            </Text>)}

          {draggablePin ? (<View style={[
                    styles.draggablePinPanel,
                    {
                        borderColor: colors.border.subtle,
                        backgroundColor: colors.surface.default,
                        borderRadius: radius.sm,
                    },
                ]}>
              <View style={styles.pinCoordsRow}>
                <Ionicons name="location" size={18} color={colors.brand.primary}/>
                <Text variant="caption" weight="bold" color={colors.text.primary}>
                  Pino selecionado: {draggablePin.latitude.toFixed(6)},{' '}
                  {draggablePin.longitude.toFixed(6)}
                </Text>
              </View>

              {onPinDragEnd && (<View style={styles.nudgeRow}>
                  <Pressable accessibilityRole="button" accessibilityLabel="Ajustar pino para o norte" onPress={() => nudgePin(0.0002, 0)} style={[
                        styles.nudgeButton,
                        {
                            borderColor: colors.border.default,
                            backgroundColor: colors.surface.input,
                            borderRadius: radius.sm,
                        },
                    ]}>
                    <Text variant="caption" weight="semibold" color={colors.text.primary}>
                      Norte (+20m)
                    </Text>
                  </Pressable>
                  <Pressable accessibilityRole="button" accessibilityLabel="Ajustar pino para o sul" onPress={() => nudgePin(-0.0002, 0)} style={[
                        styles.nudgeButton,
                        {
                            borderColor: colors.border.default,
                            backgroundColor: colors.surface.input,
                            borderRadius: radius.sm,
                        },
                    ]}>
                    <Text variant="caption" weight="semibold" color={colors.text.primary}>
                      Sul (-20m)
                    </Text>
                  </Pressable>
                  <Pressable accessibilityRole="button" accessibilityLabel="Ajustar pino para o leste" onPress={() => nudgePin(0, 0.0002)} style={[
                        styles.nudgeButton,
                        {
                            borderColor: colors.border.default,
                            backgroundColor: colors.surface.input,
                            borderRadius: radius.sm,
                        },
                    ]}>
                    <Text variant="caption" weight="semibold" color={colors.text.primary}>
                      Leste (+20m)
                    </Text>
                  </Pressable>
                  <Pressable accessibilityRole="button" accessibilityLabel="Ajustar pino para o oeste" onPress={() => nudgePin(0, -0.0002)} style={[
                        styles.nudgeButton,
                        {
                            borderColor: colors.border.default,
                            backgroundColor: colors.surface.input,
                            borderRadius: radius.sm,
                        },
                    ]}>
                    <Text variant="caption" weight="semibold" color={colors.text.primary}>
                      Oeste (-20m)
                    </Text>
                  </Pressable>
                </View>)}
            </View>) : (<View style={styles.markersChipGrid}>
              {markers.map((marker) => {
                    const isSelected = selectedMarkerId === marker.id;
                    return (<Pressable key={marker.id} accessibilityRole="button" accessibilityLabel={`Marcador no mapa: ${marker.title}`} onPress={() => onSelectMarker === null || onSelectMarker === void 0 ? void 0 : onSelectMarker(marker.id)} style={[
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
                        ]}>
                    <Ionicons name="location" size={14} color={colors.brand.primary}/>
                    <Text variant="caption" weight="semibold" color={colors.text.primary} numberOfLines={1}>
                      {marker.title}
                    </Text>
                  </Pressable>);
                })}
            </View>)}
        </View>)}
    </View>);
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
