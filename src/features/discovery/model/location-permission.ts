import { Platform } from 'react-native';

export const LOCATION_PERMISSION_STORAGE_KEY =
  '@smart_barber:location_permission_status:v1';
const LEGACY_LOCATION_CACHE_KEY = '@smart_barber:cached_user_location';
const LAST_KNOWN_LOCATION_KEY = '@smart_barber:last_known_user_location:v1';

let memoryPermissionStatus: 'granted' | 'denied' | null = null;

export function resetPersistedLocationPermissionForTests(): void {
  memoryPermissionStatus = null;
}

export async function getPersistedLocationPermission(): Promise<
  'granted' | 'denied' | null
> {
  if (memoryPermissionStatus !== null) {
    return memoryPermissionStatus;
  }
  if (typeof process !== 'undefined' && process.env.NODE_ENV === 'test') {
    return memoryPermissionStatus;
  }
  if (Platform.OS === 'web') {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const stored = window.localStorage.getItem(
          LOCATION_PERMISSION_STORAGE_KEY,
        );
        if (stored === 'granted' || stored === 'denied') {
          memoryPermissionStatus = stored;
          return stored;
        }
        // Migração automática caso já exista coordenada salva no dispositivo
        const existingCoords =
          window.localStorage.getItem(LAST_KNOWN_LOCATION_KEY) ||
          window.localStorage.getItem(LEGACY_LOCATION_CACHE_KEY);
        if (existingCoords) {
          window.localStorage.setItem(
            LOCATION_PERMISSION_STORAGE_KEY,
            'granted',
          );
          memoryPermissionStatus = 'granted';
          return 'granted';
        }
      }
    } catch {}
    return memoryPermissionStatus;
  }
  try {
    const AsyncStorage =
      require('@react-native-async-storage/async-storage').default;
    const stored = await AsyncStorage.getItem(LOCATION_PERMISSION_STORAGE_KEY);
    if (stored === 'granted' || stored === 'denied') {
      memoryPermissionStatus = stored;
      return stored;
    }
    const existingCoords =
      (await AsyncStorage.getItem(LAST_KNOWN_LOCATION_KEY)) ||
      (await AsyncStorage.getItem(LEGACY_LOCATION_CACHE_KEY));
    if (existingCoords) {
      await AsyncStorage.setItem(LOCATION_PERMISSION_STORAGE_KEY, 'granted');
      memoryPermissionStatus = 'granted';
      return 'granted';
    }
  } catch {}
  return memoryPermissionStatus;
}

export async function setPersistedLocationPermission(
  status: 'granted' | 'denied' | null,
): Promise<void> {
  memoryPermissionStatus = status;
  if (typeof process !== 'undefined' && process.env.NODE_ENV === 'test') {
    return;
  }
  if (Platform.OS === 'web') {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        if (status === null) {
          window.localStorage.removeItem(LOCATION_PERMISSION_STORAGE_KEY);
        } else {
          window.localStorage.setItem(LOCATION_PERMISSION_STORAGE_KEY, status);
        }
      }
    } catch {}
    return;
  }
  try {
    const AsyncStorage =
      require('@react-native-async-storage/async-storage').default;
    if (status === null) {
      await AsyncStorage.removeItem(LOCATION_PERMISSION_STORAGE_KEY);
    } else {
      await AsyncStorage.setItem(LOCATION_PERMISSION_STORAGE_KEY, status);
    }
  } catch {}
}

export type ForegroundPermissionSnapshot = {
  status: 'undetermined' | 'granted' | 'denied' | 'unsupported';
  canAskAgain: boolean;
  servicesEnabled: boolean | null;
  approximate: boolean | null;
  coords?: {
    latitude: number;
    longitude: number;
    accuracyMeters: number | null;
    timestamp: number;
    isApproximate: boolean;
  } | null;
};

export interface LocationPermissionPort {
  get(): Promise<ForegroundPermissionSnapshot>;
  request(): Promise<ForegroundPermissionSnapshot>;
  openSettings(): Promise<'opened' | 'manual'>;
}

export interface LocationPermissionPortDeps {
  platform?: 'ios' | 'android' | 'web';
  expoLocation?: {
    getForegroundPermissionsAsync: () => Promise<any>;
    requestForegroundPermissionsAsync: () => Promise<any>;
    hasServicesEnabledAsync?: () => Promise<boolean>;
  } | null;
  navigatorPermissions?: {
    query: (query: { name: PermissionName }) => Promise<{ state: PermissionState }>;
  } | null;
  navigatorGeolocation?: {
    getCurrentPosition: (
      success: (pos: any) => void,
      error?: (err: any) => void,
      options?: any,
    ) => void;
  } | null;
  linking?: {
    openSettings: () => Promise<any>;
  } | null;
}

function createNativeLocationPermissionPort(
  deps?: LocationPermissionPortDeps,
): LocationPermissionPort {
  const getExpoLocation = () => {
    if (deps?.expoLocation !== undefined) {
      return deps.expoLocation;
    }
    try {
      return require('expo-location');
    } catch {
      return null;
    }
  };

  const getLinking = () => {
    if (deps?.linking !== undefined) {
      return deps.linking;
    }
    try {
      return require('react-native').Linking;
    } catch {
      return null;
    }
  };

  const mapNativeResponse = async (
    expoLocation: any,
    perm: any,
  ): Promise<ForegroundPermissionSnapshot> => {
    let servicesEnabled: boolean | null = null;
    try {
      if (typeof expoLocation?.hasServicesEnabledAsync === 'function') {
        servicesEnabled = await expoLocation.hasServicesEnabledAsync();
      }
    } catch {
      servicesEnabled = null;
    }

    let approximate: boolean | null = null;
    if (perm?.android) {
      if (perm.android.accuracy === 'coarse') approximate = true;
      else if (perm.android.accuracy === 'fine') approximate = false;
    } else if (perm?.ios) {
      if (perm.ios.accuracy === 'reduced') approximate = true;
      else if (perm.ios.accuracy === 'full') approximate = false;
    }

    const status: ForegroundPermissionSnapshot['status'] =
      perm?.status === 'granted'
        ? 'granted'
        : perm?.status === 'denied'
        ? 'denied'
        : 'undetermined';

    const canAskAgain =
      typeof perm?.canAskAgain === 'boolean'
        ? perm.canAskAgain
        : status !== 'denied';

    return {
      status,
      canAskAgain,
      servicesEnabled,
      approximate,
    };
  };

  return {
    async get(): Promise<ForegroundPermissionSnapshot> {
      const expoLocation = getExpoLocation();
      if (!expoLocation || typeof expoLocation.getForegroundPermissionsAsync !== 'function') {
        return {
          status: 'unsupported',
          canAskAgain: false,
          servicesEnabled: null,
          approximate: null,
        };
      }
      try {
        const perm = await expoLocation.getForegroundPermissionsAsync();
        const mapped = await mapNativeResponse(expoLocation, perm);
        if (mapped.status === 'granted') {
          await setPersistedLocationPermission('granted');
        } else if (mapped.status === 'denied') {
          await setPersistedLocationPermission('denied');
        } else if (mapped.status === 'undetermined') {
          const persisted = await getPersistedLocationPermission();
          if (persisted === 'granted') {
            return {
              ...mapped,
              status: 'granted',
            };
          }
        }
        return mapped;
      } catch {
        return {
          status: 'unsupported',
          canAskAgain: false,
          servicesEnabled: null,
          approximate: null,
        };
      }
    },

    async request(): Promise<ForegroundPermissionSnapshot> {
      const expoLocation = getExpoLocation();
      if (!expoLocation || typeof expoLocation.requestForegroundPermissionsAsync !== 'function') {
        return {
          status: 'unsupported',
          canAskAgain: false,
          servicesEnabled: null,
          approximate: null,
        };
      }
      try {
        const perm = await expoLocation.requestForegroundPermissionsAsync();
        const mapped = await mapNativeResponse(expoLocation, perm);
        if (mapped.status === 'granted') {
          await setPersistedLocationPermission('granted');
        } else if (mapped.status === 'denied') {
          await setPersistedLocationPermission('denied');
        }
        return mapped;
      } catch {
        return {
          status: 'unsupported',
          canAskAgain: false,
          servicesEnabled: null,
          approximate: null,
        };
      }
    },

    async openSettings(): Promise<'opened' | 'manual'> {
      const linking = getLinking();
      if (linking && typeof linking.openSettings === 'function') {
        try {
          await linking.openSettings();
          return 'opened';
        } catch {
          return 'manual';
        }
      }
      return 'manual';
    },
  };
}

function createWebLocationPermissionPort(
  deps?: LocationPermissionPortDeps,
): LocationPermissionPort {
  const getPermissions = () => {
    if (deps?.navigatorPermissions !== undefined) {
      return deps.navigatorPermissions;
    }
    if (typeof navigator !== 'undefined' && navigator.permissions) {
      return navigator.permissions;
    }
    return null;
  };

  const getGeolocation = () => {
    if (deps?.navigatorGeolocation !== undefined) {
      return deps.navigatorGeolocation;
    }
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      return navigator.geolocation;
    }
    return null;
  };

  return {
    async get(): Promise<ForegroundPermissionSnapshot> {
      const geo = getGeolocation();
      if (!geo) {
        return {
          status: 'unsupported',
          canAskAgain: false,
          servicesEnabled: null,
          approximate: null,
        };
      }

      const persisted = await getPersistedLocationPermission();

      const permissions = getPermissions();
      if (permissions && typeof permissions.query === 'function') {
        try {
          const res = await permissions.query({ name: 'geolocation' as PermissionName });
          if (res.state === 'granted') {
            await setPersistedLocationPermission('granted');
            return {
              status: 'granted',
              canAskAgain: true,
              servicesEnabled: true,
              approximate: null,
            };
          }
          if (res.state === 'denied') {
            await setPersistedLocationPermission('denied');
            return {
              status: 'denied',
              canAskAgain: false,
              servicesEnabled: null,
              approximate: null,
            };
          }
          // Em iOS Safari / PWA standalone e alguns WebViews Android, permissions.query retorna 'prompt'
          // mesmo após o usuário já ter permitido no app. Respeita a permissão já salva no dispositivo.
          if (persisted === 'granted') {
            return {
              status: 'granted',
              canAskAgain: true,
              servicesEnabled: true,
              approximate: null,
            };
          }
          return {
            status: 'undetermined',
            canAskAgain: true,
            servicesEnabled: null,
            approximate: null,
          };
        } catch {
          // Permite fallback se permissions.query falhar (ex.: iOS WebKit)
        }
      }

      if (persisted === 'granted') {
        return {
          status: 'granted',
          canAskAgain: true,
          servicesEnabled: true,
          approximate: null,
        };
      }

      // Ausência da Permissions API sem permissão persistida anterior:
      return {
        status: 'undetermined',
        canAskAgain: true,
        servicesEnabled: null,
        approximate: null,
      };
    },

    async request(): Promise<ForegroundPermissionSnapshot> {
      const geo = getGeolocation();
      if (!geo) {
        return {
          status: 'unsupported',
          canAskAgain: false,
          servicesEnabled: null,
          approximate: null,
        };
      }

      return new Promise<ForegroundPermissionSnapshot>((resolve) => {
        geo.getCurrentPosition(
          async (pos: any) => {
            await setPersistedLocationPermission('granted');
            const lat = pos?.coords?.latitude;
            const lng = pos?.coords?.longitude;
            const accuracy = pos?.coords?.accuracy ?? null;
            const hasCoords =
              typeof lat === 'number' &&
              typeof lng === 'number' &&
              !Number.isNaN(lat) &&
              !Number.isNaN(lng);

            resolve({
              status: 'granted',
              canAskAgain: true,
              servicesEnabled: true,
              approximate:
                accuracy !== null && typeof accuracy === 'number'
                  ? accuracy > 1000
                  : null,
              coords: hasCoords
                ? {
                    latitude: lat,
                    longitude: lng,
                    accuracyMeters: accuracy,
                    timestamp: Date.now(),
                    isApproximate:
                      accuracy !== null &&
                      typeof accuracy === 'number' &&
                      accuracy > 1000,
                  }
                : null,
            });
          },
          async (err: any) => {
            if (err?.code === 1 || err?.code === err?.PERMISSION_DENIED) {
              await setPersistedLocationPermission('denied');
              resolve({
                status: 'denied',
                canAskAgain: false,
                servicesEnabled: null,
                approximate: null,
              });
              return;
            }

            // POSITION_UNAVAILABLE (2) ou TIMEOUT (3)
            let status: ForegroundPermissionSnapshot['status'] = 'undetermined';
            const persisted = await getPersistedLocationPermission();
            if (persisted === 'granted') {
              status = 'granted';
            } else {
              const permissions = getPermissions();
              if (permissions && typeof permissions.query === 'function') {
                try {
                  const res = await permissions.query({ name: 'geolocation' as PermissionName });
                  if (res.state === 'granted') {
                    status = 'granted';
                    await setPersistedLocationPermission('granted');
                  }
                } catch {}
              }
            }

            resolve({
              status,
              canAskAgain: true,
              servicesEnabled: err?.code === 2 ? false : null,
              approximate: null,
            });
          },
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 60000,
          },
        );
      });
    },

    async openSettings(): Promise<'opened' | 'manual'> {
      return 'manual';
    },
  };
}

export function createLocationPermissionPort(
  deps?: LocationPermissionPortDeps,
): LocationPermissionPort {
  const currentPlatform = deps?.platform ?? Platform.OS;

  if (currentPlatform === 'web') {
    return createWebLocationPermissionPort(deps);
  }

  return createNativeLocationPermissionPort(deps);
}
