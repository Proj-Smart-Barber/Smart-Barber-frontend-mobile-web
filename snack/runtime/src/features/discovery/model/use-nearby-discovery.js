import { useDiscovery } from './use-discovery';
/** Proximidade mantém referência geográfica mesmo sem um limite radial. */
export function useNearbyDiscovery(options) {
    return useDiscovery({ ...options, proximityOnly: true });
}
