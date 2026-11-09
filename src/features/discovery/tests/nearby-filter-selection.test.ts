import { describe, it, expect } from 'vitest';
import {
  normalizeNearbyFilterSelection,
  DEFAULT_NEARBY_FILTER_SELECTION,
} from '../model/nearby-filter-selection';

describe('normalizeNearbyFilterSelection', () => {
  it('returns default ALL with 10km when input is undefined or null', () => {
    expect(normalizeNearbyFilterSelection()).toEqual(DEFAULT_NEARBY_FILTER_SELECTION);
    expect(normalizeNearbyFilterSelection(null)).toEqual(DEFAULT_NEARBY_FILTER_SELECTION);
  });

  it('normalizes invalid mode to ALL', () => {
    expect(normalizeNearbyFilterSelection({ mode: 'CUSTOM' as any, radiusKm: 25 })).toEqual({
      mode: 'ALL',
      radiusKm: 25,
    });
  });

  it('normalizes invalid radius to 10', () => {
    expect(normalizeNearbyFilterSelection({ mode: 'NEARBY', radiusKm: 99 as any })).toEqual({
      mode: 'NEARBY',
      radiusKm: 10,
    });
    expect(normalizeNearbyFilterSelection({ mode: 'ALL', radiusKm: 0 as any })).toEqual({
      mode: 'ALL',
      radiusKm: 10,
    });
  });

  it('preserves valid modes and radii (5, 10, 25, 50 km)', () => {
    expect(normalizeNearbyFilterSelection({ mode: 'NEARBY', radiusKm: 5 })).toEqual({
      mode: 'NEARBY',
      radiusKm: 5,
    });
    expect(normalizeNearbyFilterSelection({ mode: 'NEARBY', radiusKm: 50 })).toEqual({
      mode: 'NEARBY',
      radiusKm: 50,
    });
    expect(normalizeNearbyFilterSelection({ mode: 'ALL', radiusKm: 10 })).toEqual({
      mode: 'ALL',
      radiusKm: 10,
    });
  });
});
