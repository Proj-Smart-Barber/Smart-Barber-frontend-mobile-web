import { it, expect, vi, beforeEach } from 'vitest';
const http = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock('@/shared/api/http-client', () => ({ httpClient: http }));
import { resolveBookingContext } from '@/features/bookings/model/resolve-booking-context';
import { getBookingById } from '@/features/bookings/api/bookings.api';
import { BookingOperationEngine } from '@/features/bookings/model/booking-operation-engine';
import { ServerClock } from '@/features/bookings/lib/server-clock';
import { OperationLifecycleBridgeController } from '@/shared/operations/OperationLifecycleBridge';
import { ApiError } from '@/shared/api/api-errors';
beforeEach(() => { new OperationLifecycleBridgeController({ actorId: 'actor-A', sessionState: 'authenticated' }); });

const booking: any = {
  id: 'booking-1', barbershopId: 'shop-A', barbermanId: 'barber-B',
  customerId: 'client-C', createdByUserId: 'owner-D', status: 'CONFIRMED',
  version: 1, services: [],
  capabilities: { cancel: { allowed: true }, reschedule: { allowed: true } },
};
it('BARBERMAN real não pode acessar agenda de colega', () => {
  const result = resolveBookingContext({ actorId: 'barber-A', requestedScope: 'UNIT',
    selectedMembership: { id: 'shop-A', role: 'BARBERMAN', state: 'ACTIVE' }, booking });
  expect(result.canAccess).toBe(false);
});
it('papel desconhecido não autoriza operação UNIT', () => {
  const result = resolveBookingContext({ actorId: 'unknown-role-user', requestedScope: 'UNIT',
    selectedMembership: { id: 'shop-A', role: 'UNKNOWN_ROLE', state: 'ACTIVE' }, booking });
  expect(result.canAccess).toBe(false);
});
it('criar reserva para cliente não concede acesso PERSONAL ao criador', () => {
  const result = resolveBookingContext({ actorId: 'owner-D', requestedScope: 'PERSONAL', booking });
  expect(result.canAccess).toBe(false);
});
it('capabilities ausentes não são fabricadas a partir de CONFIRMED', () => {
  const result = resolveBookingContext({ actorId: 'owner-D', requestedScope: 'UNIT',
    selectedMembership: { id: 'shop-A', role: 'OWNER', state: 'ACTIVE' },
    booking: { ...booking, capabilities: undefined } });
  expect(result.canCancel).toBe(false);
  expect(result.canComplete).toBe(false);
});
it('adapter de detalhe transmite scope UNIT ao servidor', async () => {
  http.get.mockResolvedValue({ booking });
  await (getBookingById as any)('booking-1', 'UNIT');
  expect(http.get).toHaveBeenLastCalledWith('/api/bookings/booking-1', { params: { scope: 'UNIT' } });
});
it('resposta tardia após logout não regrava payload da conta antiga', async () => {
  const store: any = {
    save: vi.fn().mockResolvedValue(undefined), read: vi.fn().mockResolvedValue(null),
    clearPayloadsOnLogout: vi.fn().mockResolvedValue(undefined),
  };
  const clock = new ServerClock(() => 1000);
  clock.syncWithServer('2026-10-12T12:00:00.000Z');
  const bridge = new OperationLifecycleBridgeController({ actorId: 'actor-A', sessionState: 'authenticated', store });
  let finish!: (value: any) => void;
  const deferred = new Promise<any>(resolve => { finish = resolve; });
  const transport = { createBooking: vi.fn(() => deferred) };
  const engine = new BookingOperationEngine({ serverClock: clock, store, transport });
  const prepared = await engine.prepare({ action: 'CREATE', actorId: 'actor-A', scope: 'PERSONAL',
    shopId: 'shop-A', serviceIds: ['service-1'], barbermanId: 'barber-B', date: '2026-11-01',
    startTime: '10:00', expectedTotalPriceInCents: 5000, expectedDurationInMinutes: 30 });
  const request = engine.submit(prepared);
  await vi.waitFor(() => expect(transport.createBooking).toHaveBeenCalledTimes(1));
  bridge.handleSessionUpdate(null, 'unauthenticated');
  await bridge.waitForCleanup();
  store.save.mockClear();
  finish({ booking, serverTime: '2026-10-12T12:00:01.000Z' });
  await expect(request).rejects.toThrow('SESSION_CHANGED');
  const writesWithPayload = store.save.mock.calls.filter(([, record]: any[]) => record.payload !== undefined);
  expect(writesWithPayload).toHaveLength(0);
});
it('503 após envio mantém tentativa incerta até prova do servidor', async () => {
  const store: any = { save: vi.fn().mockResolvedValue(undefined) };
  const clock = new ServerClock(() => 1000);
  clock.syncWithServer('2026-10-12T12:00:00.000Z');
  const transport = { cancelBooking: vi.fn().mockRejectedValue(new ApiError('Unavailable', 503)) };
  const engine = new BookingOperationEngine({ serverClock: clock, store, transport });
  const prepared = await engine.prepare({ action: 'CANCEL', actorId: 'actor-A', scope: 'PERSONAL',
    bookingId: 'booking-1', expectedVersion: 1 });
  await expect(engine.submit(prepared)).rejects.toThrow('Unavailable');
  expect(store.save.mock.calls.at(-1)?.[1].status).toBe('uncertain');
});
it('uma referência incerta impede preparar outra chave', async () => {
  const store: any = { listReferences: vi.fn().mockResolvedValue([{requestId:'previous-key',status:'uncertain'}]),
    read: vi.fn().mockResolvedValue({status:'uncertain'}), save: vi.fn() };
  const clock = new ServerClock(() => 1000); clock.syncWithServer('2026-10-12T12:00:00.000Z');
  const engine = new BookingOperationEngine({store,serverClock:clock});
  await expect(engine.prepare({action:'CANCEL',actorId:'actor-A',scope:'PERSONAL',bookingId:'b1',expectedVersion:1})).rejects.toMatchObject({requestId:'previous-key'});
  expect(store.save).not.toHaveBeenCalled();
});
