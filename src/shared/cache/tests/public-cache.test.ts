import { describe, it, expect, vi } from 'vitest';
import { QueryClient } from '@tanstack/react-query';
import {
  attachPublicQueryCachePersistence,
  hydratePersistedPublicQueries,
  persistAllowlistedPublicQueries,
  purgePersistedPublicCache,
  PUBLIC_CACHE_STORAGE_KEY,
  PUBLIC_CACHE_MAX_AGE_MS,
  PUBLIC_CACHE_SCHEMA_VERSION,
  PUBLIC_CACHE_MAX_BYTES,
  isAllowlistedPublicQueryKey,
  utf8Bytes,
} from '../public-query-persister';
import type { PublicCacheStorage } from '../public-cache-storage';
import { invalidateCatalogConsumers } from '../catalog-invalidation';

function memory() {
  const data = new Map<string, string>();
  const storage: PublicCacheStorage = {
    getItem: async (key) => data.get(key) ?? null,
    setItem: async (key, value) => {
      data.set(key, value);
    },
    removeItem: async (key) => {
      data.delete(key);
    },
  };
  return { data, storage };
}
const key = ['barbershop', 'public', 'shop'];
const now = 2000000;
const client = () =>
  new QueryClient({ defaultOptions: { queries: { gcTime: Infinity, retry: false } } });

describe('public cache privacy and lifecycle', () => {
  it('persists only bounded public projections and never credentials or mutations', async () => {
    const { data, storage } = memory(),
      source = client();
    source.setQueryData(
      key,
      {
        id: 'shop',
        name: 'Loja',
        timezone: 'America/Sao_Paulo',
        ownerId: 'private-owner',
        cnpj: 'private-tax-id',
        token: 'private-token',
        nested: { secret: 'private-secret' },
      },
      { updatedAt: now },
    );
    for (const privateKey of [
      ['bookings', 'me', 'actor'],
      ['finance', 'actor', 'shop'],
      ['notifications', 'actor'],
      ['discovery', 'nearby', 1, 2],
      ['services', 'shop', { includeInactive: true }],
    ])
      source.setQueryData(privateKey, { secret: 'private-data' });
    await persistAllowlistedPublicQueries(source, now, storage);
    const raw = data.get(PUBLIC_CACHE_STORAGE_KEY)!;
    expect(raw).not.toMatch(/private-|token|ownerId|cnpj|mutations/);
    const target = client();
    expect(await hydratePersistedPublicQueries(target, now, storage)).toBe(1);
    expect(target.getQueryData(key)).toEqual({
      id: 'shop',
      name: 'Loja',
      timezone: 'America/Sao_Paulo',
    });
    source.clear();
    target.clear();
  });
  it('does not hydrate expired, future, corrupted or obsolete snapshots', async () => {
    const { data, storage } = memory(),
      target = client();
    for (const raw of [
      'bad-json',
      JSON.stringify({ version: 'old', savedAt: now, queries: [] }),
      JSON.stringify({ version: PUBLIC_CACHE_SCHEMA_VERSION, savedAt: now + 1, queries: [] }),
      JSON.stringify({
        version: PUBLIC_CACHE_SCHEMA_VERSION,
        savedAt: now - PUBLIC_CACHE_MAX_AGE_MS - 1,
        queries: [],
      }),
    ]) {
      data.set(PUBLIC_CACHE_STORAGE_KEY, raw);
      expect(await hydratePersistedPublicQueries(target, now, storage)).toBe(0);
      expect(data.has(PUBLIC_CACHE_STORAGE_KEY)).toBe(false);
    }
    target.clear();
  });
  it('keeps a newer network result when disk hydration finishes late', async () => {
    const { storage } = memory(),
      source = client(),
      target = client();
    source.setQueryData(key, { id: 'shop', name: 'old' }, { updatedAt: now });
    await persistAllowlistedPublicQueries(source, now, storage);
    target.setQueryData(key, { id: 'shop', name: 'new' }, { updatedAt: now + 1 });
    await hydratePersistedPublicQueries(target, now + 1, storage);
    expect(target.getQueryData(key)).toEqual({ id: 'shop', name: 'new' });
    source.clear();
    target.clear();
  });
  it('clears invalidated disk data before debounce and does not persist it again', async () => {
    vi.useFakeTimers();
    try {
      const { storage, data } = memory(),
        source = client();
      source.setQueryData(key, { id: 'shop', name: 'old' }, { updatedAt: Date.now() });
      await persistAllowlistedPublicQueries(source, Date.now(), storage);
      const detach = attachPublicQueryCachePersistence(source, storage);
      await source.invalidateQueries({ queryKey: key });
      await vi.advanceTimersByTimeAsync(501);
      const target = client();
      expect(await hydratePersistedPublicQueries(target, Date.now(), storage)).toBe(0);
      detach();
      await purgePersistedPublicCache(storage);
      expect(data.size).toBe(0);
      source.clear();
      target.clear();
    } finally {
      vi.useRealTimers();
    }
  });
  it('rejects private-shaped keys, limits bytes and survives quota denial', async () => {
    expect(isAllowlistedPublicQueryKey([...key, { token: 'hidden' }])).toBe(false);
    const { storage, data } = memory(),
      source = client();
    for (let i = 0; i < 30; i++)
      source.setQueryData(
        ['barbershop', 'public', 'shop-' + i],
        { id: 'shop-' + i, name: '😀'.repeat(900) },
        { updatedAt: now },
      );
    await persistAllowlistedPublicQueries(source, now, storage);
    expect(utf8Bytes(data.get(PUBLIC_CACHE_STORAGE_KEY)!)).toBeLessThanOrEqual(
      PUBLIC_CACHE_MAX_BYTES,
    );
    const blocked = {
      ...storage,
      setItem: async () => {
        throw new Error('QuotaExceeded');
      },
    };
    expect(await persistAllowlistedPublicQueries(source, now, blocked)).toBe(false);
    source.clear();
  });
  it('invalidates public services, availability, discovery and feed together', async () => {
    const source = client();
    const keys = [
      ['services', 'shop'],
      ['services', 'public', 'shop'],
      ['barbershop', 'shop', 'availability'],
      ['explore-feed', 'ALL'],
      ['discovery', 'all'],
    ];
    for (const k of keys) source.setQueryData(k, {});
    await invalidateCatalogConsumers(source, 'shop');
    for (const k of keys) expect(source.getQueryState(k)?.isInvalidated).toBe(true);
    source.clear();
  });
  it('keeps a previously successful public snapshot after a refresh fails',async () => {
    const {storage}=memory(),source=client(),restored=client();
    const detach=attachPublicQueryCachePersistence(source,storage);
    source.setQueryData(key,{id:'shop',name:'Saved catalog'},{updatedAt:Date.now()});
    await expect(source.fetchQuery({queryKey:key,queryFn:async()=>{throw new Error('offline');},staleTime:0,retry:false})).rejects.toThrow('offline');
    expect(source.getQueryState(key)?.status).toBe('error');
    expect(source.getQueryState(key)?.data).toEqual({id:'shop',name:'Saved catalog'});
    expect(source.getQueryState(key)?.isInvalidated).toBe(true);
    expect(await persistAllowlistedPublicQueries(source,Date.now(),storage)).toBe(true);
    expect(JSON.parse((await storage.getItem(PUBLIC_CACHE_STORAGE_KEY))!).queries).toHaveLength(1);
    expect(await hydratePersistedPublicQueries(restored,Date.now(),storage)).toBe(1);
    expect(restored.getQueryData(key)).toEqual({id:'shop',name:'Saved catalog'});
    expect(restored.getQueryState(key)?.isInvalidated).toBe(true);
    detach();source.clear();restored.clear();
  });

});
