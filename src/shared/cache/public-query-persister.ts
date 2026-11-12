import { utf8Bytes } from '../lib/utf8-size';
export { utf8Bytes } from '../lib/utf8-size';
import { dehydrate, hydrate, type QueryClient, type QueryKey } from '@tanstack/react-query';
import { publicCacheStorage, type PublicCacheStorage } from './public-cache-storage';

export const PUBLIC_CACHE_STORAGE_KEY = 'smartbarber.public-query-cache';
export const PUBLIC_CACHE_SCHEMA_VERSION = '2026-11-11-v2';
export const PUBLIC_CACHE_MAX_AGE_MS = 30 * 60 * 1000; // 30 minutes
export const PUBLIC_CACHE_MAX_BYTES = 256 * 1024; // 256 KB
export const PUBLIC_CACHE_MAX_QUERIES = 20;
export const PUBLIC_CATALOG_OPTIONS = { staleTime: 2 * 60_000, gcTime: PUBLIC_CACHE_MAX_AGE_MS };

/**
 * Strict allowlist for public, non-sensitive, non-geolocated catalog queries.
 * Private queries (/me, /bookings, /notifications, /finance, /nearby, tokens, coords)
 * are NEVER allowed to be persisted.
 */
export function isAllowlistedPublicQueryKey(key: QueryKey): boolean {
  if (!Array.isArray(key) || key.length !== 3) return false;
  return (
    ((key[0] === 'barbershop' || key[0] === 'services') &&
      key[1] === 'public' &&
      typeof key[2] === 'string' &&
      key[2].length > 0) ||
    (key[0] === 'barbershop' &&
      typeof key[1] === 'string' &&
      key[1] !== 'public' &&
      key[1].length > 0 &&
      key[2] === 'professionals')
  );
}

function pick(source: unknown, fields: readonly string[]): Record<string, unknown> | null {
  if (!source || typeof source !== 'object' || Array.isArray(source)) return null;
  const result: Record<string, unknown> = {};
  for (const field of fields) {
    const value = (source as Record<string, unknown>)[field];
    if (typeof value === 'string' && /url$/i.test(field)) {
      try {
        const url = new URL(value);
        if (
          !['https:', 'http:'].includes(url.protocol) ||
          url.username ||
          url.password ||
          /x-amz-|signature|token|credential|key-pair-id/i.test(url.search)
        ) {
          result[field] = null;
          continue;
        }
      } catch {
        result[field] = null;
        continue;
      }
    }
    if (
      value === null ||
      typeof value === 'boolean' ||
      (typeof value === 'string' && value.length <= 4000) ||
      (typeof value === 'number' && Number.isFinite(value))
    )
      result[field] = value;
  }
  return typeof result.id === 'string' ? result : null;
}

// Project every write AND restore. A public key never permits arbitrary DTO fields.
export function selectPublicSnapshot(key: QueryKey, data: unknown): unknown {
  if (!isAllowlistedPublicQueryKey(key)) return undefined;
  if (key[0] === 'services') {
    if (!data || typeof data !== 'object') return undefined;
    const value = data as { items?: unknown[]; total?: number; page?: number; limit?: number };
    if (!Array.isArray(value.items) || value.items.length > 100) return undefined;
    const fields = [
      'id',
      'barbershopId',
      'title',
      'description',
      'imageUrl',
      'isFeatured',
      'featuredOrder',
      'priceInCents',
      'durationInMinutes',
      'isActive',
      'createdAt',
      'updatedAt',
    ];
    const items = value.items
      .map((item) => pick(item, fields))
      .filter((item) => item?.isActive === true);
    return {
      items,
      total: Number(value.total) || items.length,
      page: Number(value.page) || 1,
      limit: Number(value.limit) || 100,
    };
  }
  if (key[2] === 'professionals') {
    if (!Array.isArray(data) || data.length > 100) return undefined;
    return data.map((item) => pick(item, ['id', 'name', 'avatarUrl'])).filter(Boolean);
  }
  return pick(data, [
    'id',
    'name',
    'timezone',
    'location',
    'description',
    'avatarUrl',
    'coverUrl',
    'googleMapsUrl',
    'rating',
    'reviewCount',
  ]);
}

const storageWrites = new WeakMap<PublicCacheStorage, Promise<unknown>>();
function enqueueWrite(storage: PublicCacheStorage, work: () => Promise<void>): Promise<void> {
  const next = (storageWrites.get(storage) ?? Promise.resolve()).catch(() => {}).then(work);
  storageWrites.set(storage, next);
  return next;
}

export async function purgePersistedPublicCache(
  storage: PublicCacheStorage = publicCacheStorage,
): Promise<void> {
  try {
    await enqueueWrite(storage, () => storage.removeItem(PUBLIC_CACHE_STORAGE_KEY));
  } catch {
    /* Ignore storage removal errors */
  }
}

export async function hydratePersistedPublicQueries(
  client: QueryClient,
  now = Date.now(),
  storage: PublicCacheStorage = publicCacheStorage,
): Promise<number> {
  try {
    const raw = await storage.getItem(PUBLIC_CACHE_STORAGE_KEY);
    if (!raw) return 0;
    if (utf8Bytes(raw) > PUBLIC_CACHE_MAX_BYTES) throw new Error('Cache size exceeded');
    const parsed = JSON.parse(raw);
    if (
      parsed.version !== PUBLIC_CACHE_SCHEMA_VERSION ||
      !Number.isFinite(parsed.savedAt) ||
      parsed.savedAt > now ||
      now - parsed.savedAt > PUBLIC_CACHE_MAX_AGE_MS ||
      !Array.isArray(parsed.queries) ||
      parsed.queries.length > PUBLIC_CACHE_MAX_QUERIES
    )
      throw new Error('Invalid snapshot');
    let count = 0;
    for (const query of parsed.queries) {
      const updatedAt = query?.state?.dataUpdatedAt;
      if (
        !isAllowlistedPublicQueryKey(query?.queryKey) ||
        !Number.isFinite(updatedAt) ||
        updatedAt > now ||
        now - updatedAt > PUBLIC_CACHE_MAX_AGE_MS
      )
        continue;
      const data = selectPublicSnapshot(query.queryKey, query.state.data);
      if (data == null) continue;
      client.setQueryDefaults(query.queryKey, PUBLIC_CATALOG_OPTIONS);
      // TanStack hydration retains newer in-memory responses over older disk data.
      hydrate(client, {
        mutations: [],
        queries: [
          {
            queryKey: query.queryKey,
            queryHash: JSON.stringify(query.queryKey),
            state: {
              data,
              dataUpdatedAt: updatedAt,
              dataUpdateCount: 1,
              error: null,
              errorUpdatedAt: 0,
              errorUpdateCount: 0,
              fetchFailureCount: 0,
              fetchFailureReason: null,
              fetchMeta: null,
              isInvalidated: query.state.needsRefresh === true,
              status: 'success',
              fetchStatus: 'idle',
            },
          },
        ],
      });
      count++;
    }
    return count;
  } catch {
    await purgePersistedPublicCache(storage);
    return 0;
  }
}

// TanStack marks refresh errors invalidated too. Track explicit invalidations separately.
const watchedClients = new WeakSet<QueryClient>();
const explicitInvalidations = new WeakMap<QueryClient, Set<string>>();

export async function persistAllowlistedPublicQueries(
  client: QueryClient,
  now = Date.now(),
  storage: PublicCacheStorage = publicCacheStorage,
): Promise<boolean> {
  try {
    const state = dehydrate(client, {
      shouldDehydrateMutation: () => false,
      shouldDehydrateQuery: (query) =>
        isAllowlistedPublicQueryKey(query.queryKey) &&
        query.state.data !== undefined &&
        !explicitInvalidations.get(client)?.has(query.queryHash) &&
        (watchedClients.has(client) || !query.state.isInvalidated) &&
        query.state.dataUpdatedAt <= now &&
        now - query.state.dataUpdatedAt <= PUBLIC_CACHE_MAX_AGE_MS,
    });
    const queries = state.queries
      .sort((a, b) => b.state.dataUpdatedAt - a.state.dataUpdatedAt)
      .slice(0, PUBLIC_CACHE_MAX_QUERIES)
      .map((query) => ({
        queryKey: query.queryKey,
        state: {
          data: selectPublicSnapshot(query.queryKey, query.state.data),
          dataUpdatedAt: query.state.dataUpdatedAt,
          needsRefresh: query.state.status === 'error' || query.state.isInvalidated,
        },
      }))
      .filter((query) => query.state.data != null);
    let serialized = JSON.stringify({
      version: PUBLIC_CACHE_SCHEMA_VERSION,
      savedAt: now,
      queries,
    });
    while (utf8Bytes(serialized) > PUBLIC_CACHE_MAX_BYTES && queries.length) {
      queries.pop();
      serialized = JSON.stringify({ version: PUBLIC_CACHE_SCHEMA_VERSION, savedAt: now, queries });
    }
    await enqueueWrite(storage, () => storage.setItem(PUBLIC_CACHE_STORAGE_KEY, serialized));
    return true;
  } catch {
    return false;
  }
}

export function attachPublicQueryCachePersistence(
  client: QueryClient,
  storage: PublicCacheStorage = publicCacheStorage,
): () => void {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let stopped = false;
  const invalidated=explicitInvalidations.get(client) ?? new Set<string>();
  explicitInvalidations.set(client,invalidated);watchedClients.add(client);
  const unsubscribe = client.getQueryCache().subscribe((event) => {
    if (!event?.query || !isAllowlistedPublicQueryKey(event.query.queryKey)) return;
    if (event.type === 'updated' && event.action.type === 'invalidate') {
      invalidated.add(event.query.queryHash);void purgePersistedPublicCache(storage);
    }
    if ((event.type === 'updated' && event.action.type === 'success') || event.type === 'removed') invalidated.delete(event.query.queryHash);
    clearTimeout(timer);
    timer = setTimeout(() => {
      if (!stopped) void persistAllowlistedPublicQueries(client, Date.now(), storage);
    }, 500);
  });
  return () => {
    stopped = true;
    watchedClients.delete(client);
    clearTimeout(timer);
    unsubscribe();
  };
}
