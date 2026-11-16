export const VALID_DISCOVERY_MODES = ['ALL', 'NEARBY'];
export const VALID_DISCOVERY_RADII = [5, 10, 25, 50];
export const DEFAULT_NEARBY_FILTER_SELECTION = {
    mode: 'ALL',
    radiusKm: 10,
};
/**
 * Normaliza seleção de filtros locais para Perto de você.
 * Garante que modo pertença a ALL ou NEARBY (default: ALL).
 * Garante que raio pertença a 5, 10, 25 ou 50 km (default: 10).
 */
export function normalizeNearbyFilterSelection(value) {
    const mode = (value === null || value === void 0 ? void 0 : value.mode) === 'NEARBY' || (value === null || value === void 0 ? void 0 : value.mode) === 'ALL'
        ? value.mode
        : 'ALL';
    const radiusCandidate = value === null || value === void 0 ? void 0 : value.radiusKm;
    const radiusKm = radiusCandidate === 5 ||
        radiusCandidate === 10 ||
        radiusCandidate === 25 ||
        radiusCandidate === 50
        ? radiusCandidate
        : 10;
    return { mode, radiusKm };
}
