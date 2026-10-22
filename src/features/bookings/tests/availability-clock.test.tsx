// @vitest-environment happy-dom
import React from 'react';
import { act, cleanup, renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppState } from 'react-native';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { httpClient } from '@/shared/api';
import { useBookingAvailability } from '../model/use-booking-availability';
import { useBookingFlow } from '../model/use-booking-flow';
import { serverClock } from '../lib/server-clock';
import { getBookingAvailability } from '../api/bookings.api';
import { bookingOperationEngine } from '../model/booking-operation-engine';

vi.mock('@/features/auth', () => ({useSession: () => ({identity:{id:'client'},status:'authenticated',memberships:[],selectedShopId:null})}));
vi.mock('@/features/barbershop', () => ({barbershopApi:{getBarbershop: async () => ({id:'shop',timezone:'America/Sao_Paulo'})}}));
vi.mock('@/shared/operations/operation-attempt-store', () => ({operationAttemptStore:{clearResolved:async () => undefined}}));

const clients: QueryClient[] = [];
const base = Date.parse('2030-01-15T12:00:00.000Z');
const first = {start:'2030-01-15T12:00:01.000Z',end:'2030-01-15T12:30:01.000Z'};
const later = {start:'2030-01-15T12:30:00.000Z',end:'2030-01-15T13:00:00.000Z'};
const params = {date:'2030-01-15',serviceIds:['cut'],barbermanId:'barber'};
let slots = [first,later];
let failing = false;

function wrapper() {
  const client = new QueryClient({defaultOptions:{queries:{retry:false,gcTime:Infinity}}});
  client.setQueryData(['services','public','shop'], {items:[{id:'cut',title:'Corte',priceInCents:4000,durationInMinutes:30,isActive:true}]});
  clients.push(client);
  return ({children}:{children:React.ReactNode}) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
async function flush(ms = 30) { await act(async () => { await vi.advanceTimersByTimeAsync(ms); }); }

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(base);
  serverClock.clear();
  slots = [first,later];
  failing = false;
  vi.spyOn(httpClient,'get').mockImplementation(async (path) => {
    if (path.includes('/availability?')) {
      if (failing) throw new Error('offline');
      return {slots:[...slots],serverTime:new Date(base + performance.now()).toISOString()} as never;
    }
    if (path.includes('/professionals')) return {professionals:[{id:'barber',name:'Fixture barber',role:'BARBERMAN'}]} as never;
    if (path.includes('/services')) return {items:[{id:'cut',title:'Corte',priceInCents:4000,durationInMinutes:30,isActive:true}]} as never;
    throw new Error(`Unexpected fixture request: ${path}`);
  });
});
afterEach(() => {
  cleanup(); clients.forEach(client => client.clear()); clients.length=0;
  serverClock.clear(); vi.restoreAllMocks(); vi.useRealTimers();
});

describe('Live availability clock', () => {
  it('excludes elapsed and exact-now slots even when the device wall clock is wrong', async () => {
    slots = [{start:'2030-01-15T11:30:00Z',end:'2030-01-15T12:00:00Z'}, {start:'2030-01-15T12:00:00Z',end:'2030-01-15T12:30:00Z'}, later];
    vi.setSystemTime('2040-01-01');
    const {result} = renderHook(() => useBookingAvailability('shop',params,true), {wrapper:wrapper()});
    await flush();
    expect(result.current.slots).toEqual([later]);
    expect(result.current.serverNow! - base).toBeLessThan(1000);
  });

  it('expires a slot while the screen remains open without waiting for another HTTP response', async () => {
    const {result} = renderHook(() => useBookingAvailability('shop',params,true), {wrapper:wrapper()});
    await flush();
    expect(result.current.slots).toHaveLength(2);
    await flush(1100);
    expect(result.current.slots).toEqual([later]);
    expect(httpClient.get).toHaveBeenCalledTimes(1);
  });

  it('refreshes an independent second session after another client books', async () => {
    const a = renderHook(() => useBookingAvailability('shop',params,true), {wrapper:wrapper()});
    const b = renderHook(() => useBookingAvailability('shop',params,true), {wrapper:wrapper()});
    await flush();
    expect(a.result.current.slots).toContainEqual(later);
    expect(b.result.current.slots).toContainEqual(later);
    slots = [];
    await flush(15_100);
    expect(b.result.current.slots).toEqual([]);
  });

  it('hides cached offers on refresh error and recovers with explicit retry', async () => {
    const {result} = renderHook(() => useBookingAvailability('shop',params,true), {wrapper:wrapper()});
    await flush(); failing=true;
    await act(async () => { await result.current.refetch(); });
    await flush();
    expect(result.current.slots).toEqual([]);
    expect(result.current.isError).toBe(true);
    failing=false;
    await act(async () => { await result.current.refetch(); });
    await flush();
    expect(result.current.slots).toContainEqual(later);
  });

  it('rejects a response without an authoritative clock', async () => {
    vi.mocked(httpClient.get).mockResolvedValueOnce({slots:[later]});
    await expect(getBookingAvailability('shop',params)).rejects.toThrow('sincronizar');
    expect(serverClock.hasValidReference()).toBe(false);
  });

  it('does not synchronize a delayed response from a previous session generation', async () => {
    let resolve!: (value: unknown) => void;
    vi.mocked(httpClient.get).mockImplementationOnce(() => new Promise(r => {resolve=r;}) as never);
    const pending = getBookingAvailability('shop',params);
    serverClock.clear();
    resolve({slots:[later],serverTime:new Date(base).toISOString()});
    await pending;
    expect(serverClock.hasValidReference()).toBe(false);
  });
});

describe('Booking selection and confirmation', () => {
  function flow() {
    return renderHook(() => useBookingFlow({mode:'PERSONAL',shopId:'shop',initialServiceIds:['cut'],initialDate:params.date,initialProfessionalId:'barber'}), {wrapper:wrapper()});
  }
  const selection = (slot = later) => ({...slot,startTime:slot === first ? '09:00' : '09:30',slotStartAt:slot.start});

  it('clears an expired selection and returns review to the slot picker', async () => {
    const {result} = flow(); await flush();
    act(() => { result.current.selectSlot(selection(first)); result.current.goToStep('REVIEW'); });
    await flush(1100);
    expect(result.current.selectedSlot).toBeNull();
    expect(result.current.step).toBe('SLOT');
    expect(result.current.errorMessage).toContain('expirou');
  });

  it('rechecks availability before POST and preserves services when another client wins', async () => {
    const prepare = vi.spyOn(bookingOperationEngine,'prepare');
    const {result} = flow(); await flush();
    act(() => {result.current.selectSlot(selection()); result.current.goToStep('REVIEW');});
    slots=[];
    await act(async () => {await result.current.submitBooking();});
    await flush();
    expect(prepare).not.toHaveBeenCalled();
    expect(result.current.selectedSlot).toBeNull();
    expect(result.current.selectedServiceIds).toEqual(['cut']);
    expect(result.current.step).toBe('SLOT');
  });

  it('treats definitive SLOT_UNAVAILABLE as a new selection, even with an attempt requestId', async () => {
    vi.spyOn(bookingOperationEngine,'prepare').mockResolvedValue({} as never);
    vi.spyOn(bookingOperationEngine,'submit').mockRejectedValue({status:409,code:'SLOT_UNAVAILABLE',message:'Horário ocupado.',requestId:'attempt'});
    const {result} = flow(); await flush();
    act(() => {result.current.selectSlot(selection()); result.current.goToStep('REVIEW');});
    await act(async () => {await result.current.submitBooking();});
    await flush();
    expect(result.current.step).toBe('SLOT');
    expect(result.current.status).toBe('error');
    expect(result.current.uncertainKey).toBeNull();
  });

  it('preserves a future selection while checking availability on app resume', async () => {
    let onResume: ((state: 'active') => void) | undefined;
    vi.spyOn(AppState,'addEventListener').mockImplementation((_event, listener) => {
      onResume = listener;
      return {remove:vi.fn()};
    });
    const {result} = flow(); await flush();
    act(() => {result.current.selectSlot(selection());result.current.goToStep('REVIEW');});
    let resolve!: (value: unknown) => void;
    vi.mocked(httpClient.get).mockImplementationOnce(() => new Promise(r => {resolve=r;}) as never);
    act(() => {onResume?.('active');});
    await flush();
    expect(result.current.selectedSlot?.slotStartAt).toBe(later.start);
    await act(async () => {resolve({slots:[later],serverTime:new Date(base + performance.now()).toISOString()});});
    await flush();
    expect(result.current.selectedSlot?.slotStartAt).toBe(later.start);
  });
});
