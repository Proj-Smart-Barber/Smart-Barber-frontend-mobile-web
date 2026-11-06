import { Platform } from 'react-native';

export type ForegroundPermissionSnapshot = {
  status: 'undetermined' | 'granted' | 'denied' | 'unsupported';
  canAskAgain: boolean;
  servicesEnabled: boolean | null;
  approximate: boolean | null;
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
        return await mapNativeResponse(expoLocation, perm);
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
        return await mapNativeResponse(expoLocation, perm);
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

      const permissions = getPermissions();
      if (permissions && typeof permissions.query === 'function') {
        try {
          const res = await permissions.query({ name: 'geolocation' as PermissionName });
          const status: ForegroundPermissionSnapshot['status'] =
            res.state === 'granted'
              ? 'granted'
              : res.state === 'denied'
              ? 'denied'
              : 'undetermined';
          return {
            status,
            canAskAgain: res.state !== 'denied',
            servicesEnabled: null,
            approximate: null,
          };
        } catch {
          // Permite fallback se permissions.query falhar
        }
      }

      // Ausência da Permissions API não significa granted nem denied:
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
          () => {
            resolve({
              status: 'granted',
              canAskAgain: true,
              servicesEnabled: true,
              approximate: null,
            });
          },
          async (err: any) => {
            if (err?.code === 1 || err?.code === err?.PERMISSION_DENIED) {
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
            const permissions = getPermissions();
            if (permissions && typeof permissions.query === 'function') {
              try {
                const res = await permissions.query({ name: 'geolocation' as PermissionName });
                if (res.state === 'granted') {
                  status = 'granted';
                }
              } catch {}
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
