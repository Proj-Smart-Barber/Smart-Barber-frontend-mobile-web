// @vitest-environment happy-dom
import React from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { renderHook, waitFor, cleanup, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useNearbyDiscovery } from '../model/use-nearby-discovery';
import { discoveryApi } from '../api/discovery.api';
import { locationStore } from '../model/location-provider';

afterEach(() => { cleanup(); locationStore.reset(); vi.restoreAllMocks(); });
function mount() {
  const client = new QueryClient({defaultOptions: {queries: {retry: false}}});
  return renderHook(() => useNearbyDiscovery({initialMode: 'ALL', actorId: 'test-actor'}), {
    wrapper: ({children}: React.PropsWithChildren) => <QueryClientProvider client={client}>{children}</QueryClientProvider>,
  });
}
const point = {latitude: -23.5, longitude: -46.6, timestamp: Date.now(), accuracyMeters: 10, isApproximate: false};
it('keeps user coordinates and sends null radius for the unlimited default', async () => {
  locationStore.updateSession({state: 'granted', coords: point});
  const nearby = vi.spyOn(discoveryApi, 'searchNearby').mockResolvedValue({items: [],total: 0,page: 1,limit: 20,hasNext:false,serverTime:new Date().toISOString()});
  const all = vi.spyOn(discoveryApi, 'searchAll');
  mount();
  await waitFor(() => expect(nearby).toHaveBeenCalledWith(expect.objectContaining({latitude: point.latitude, longitude:point.longitude, radiusKm:null}), expect.any(AbortSignal)));
  expect(all).not.toHaveBeenCalled();
});
it('does not request an unlabelled general list without coordinates or a manual query', async () => {
  locationStore.updateSession({state:'denied',coords:null});
  const all = vi.spyOn(discoveryApi,'searchAll');
  const nearby = vi.spyOn(discoveryApi,'searchNearby');
  mount();
  expect(all).not.toHaveBeenCalled(); expect(nearby).not.toHaveBeenCalled();
});
it('preserves a geographic service error instead of silently querying the general list', async () => {
  locationStore.updateSession({state:'granted',coords:point});
  vi.spyOn(discoveryApi,'searchNearby').mockRejectedValue(Object.assign(new Error('unavailable'),{isServiceUnavailable:true,statusCode:503}));
  const all = vi.spyOn(discoveryApi,'searchAll');
  const {result} = mount();
  await waitFor(() => expect(result.current.isServiceUnavailable).toBe(true));
  expect(all).not.toHaveBeenCalled();
});
it('recovering location does not activate a hidden default radius', async () => {
  locationStore.updateSession({state:'denied',coords:null});
  vi.spyOn(locationStore,'requestCurrentPosition').mockImplementation(async () => {
    locationStore.updateSession({state:'granted',coords:point});
    return locationStore.getSession();
  });
  const nearby=vi.spyOn(discoveryApi,'searchNearby').mockResolvedValue({items:[],total:0,page:1,limit:20,hasNext:false,serverTime:new Date().toISOString()});
  const {result}=mount();
  await act(async () => {await result.current.requestLocation();});
  await waitFor(()=>expect(nearby).toHaveBeenCalledWith(expect.objectContaining({radiusKm:null}), expect.any(AbortSignal)));
  expect(nearby.mock.calls.every(([request])=>request.radiusKm===null)).toBe(true);
});
