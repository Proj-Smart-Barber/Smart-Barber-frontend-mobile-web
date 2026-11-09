import type { DiscoveryMode, DiscoveryRadius } from './discovery.types';

export interface NearbyFilterSelection {
  mode: DiscoveryMode;
  radiusKm: DiscoveryRadius;
}

export const VALID_DISCOVERY_MODES: readonly DiscoveryMode[] = ['ALL', 'NEARBY'] as const;
export const VALID_DISCOVERY_RADII: readonly DiscoveryRadius[] = [5, 10, 25, 50] as const;

export const DEFAULT_NEARBY_FILTER_SELECTION: NearbyFilterSelection = {
  mode: 'ALL',
  radiusKm: 10,
};

/**
 * Normaliza seleção de filtros locais para Perto de você.
 * Garante que modo pertença a ALL ou NEARBY (default: ALL).
 * Garante que raio pertença a 5, 10, 25 ou 50 km (default: 10).
 */
export function normalizeNearbyFilterSelection(
  value?: Partial<NearbyFilterSelection> | null,
): NearbyFilterSelection {
  const mode: DiscoveryMode =
    value?.mode === 'NEARBY' || value?.mode === 'ALL'
      ? value.mode
      : 'ALL';

  const radiusCandidate = value?.radiusKm;
  const radiusKm: DiscoveryRadius =
    radiusCandidate === 5 ||
    radiusCandidate === 10 ||
    radiusCandidate === 25 ||
    radiusCandidate === 50
      ? radiusCandidate
      : 10;

  return { mode, radiusKm };
}
