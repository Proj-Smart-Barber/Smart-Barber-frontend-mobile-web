import type { PublicShop } from '../api/discovery.contract';
import type { LocationSession } from './location-provider';

export type DiscoveryMode = 'ALL' | 'NEARBY';
export type DiscoveryRadius = 5 | 10 | 25 | 50;

export interface DiscoveryFilters {
  mode: DiscoveryMode;
  radiusKm: DiscoveryRadius;
  searchQuery: string;
}

export interface UseDiscoveryViewModel {
  filters: DiscoveryFilters;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  setMode: (mode: DiscoveryMode) => void;
  setRadiusKm: (radius: DiscoveryRadius) => void;
  items: PublicShop[];
  isLoading: boolean;
  isFetchingNextPage: boolean;
  hasNextPage: boolean;
  fetchNextPage: () => void;
  error: Error | null;
  isServiceUnavailable: boolean;
  refetch: () => void;
  locationSession: LocationSession;
  requestLocation: () => Promise<void>;
}
