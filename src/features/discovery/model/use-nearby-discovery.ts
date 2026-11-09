import { useDiscovery } from './use-discovery';

/** Proximidade mantém referência geográfica mesmo sem um limite radial. */
export function useNearbyDiscovery(options: Parameters<typeof useDiscovery>[0]) {
  return useDiscovery({ ...options, proximityOnly: true });
}
