import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BookingOperationEngine } from '../model/booking-operation-engine';
import { resolveBookingContext } from '../model/resolve-booking-context';
import { ServerClock } from '../lib/server-clock';
import type { RescheduleBookingCommand } from '../model/booking-command.types';
import type { BookingDto } from '../api/bookings.dto';

describe('I4 — Fluxo de Remarcação e Isolamento de Operação (booking-reschedule-flow)', () => {
  let mockClock: ServerClock;
  let mockStore: any;
  let mockTransport: any;
  let engine: BookingOperationEngine;

  const mockOriginalBooking: BookingDto = {
    id: 'booking-reschedule-100',
    barbershopId: 'shop-alpha',
    barbermanId: 'barber-1',
    date: '2026-10-15',
    startTime: '10:00',
    endTime: '10:30',
    status: 'CONFIRMED',
    version: 3,
    services: [{ id: 'srv-1', title: 'Corte', priceInCents: 5000, durationInMinutes: 30 }],
    customer: { id: 'cust-99', name: 'Cliente Original', phoneNumber: '11999999999' },
  };

  beforeEach(() => {
    mockStore = {
      save: vi.fn().mockResolvedValue(undefined),
      read: vi.fn().mockResolvedValue(null),
      listReferences: vi.fn().mockResolvedValue([]),
      clearResolved: vi.fn().mockResolvedValue(undefined),
      clearPayloadsOnLogout: vi.fn().mockResolvedValue(undefined),
      clearAllForActor: vi.fn().mockResolvedValue(undefined),
    };

    mockClock = new ServerClock(() => 1000);
    mockClock.syncWithServer('2026-10-15T12:00:00.000Z');

    mockTransport = {
      createBooking: vi.fn(),
      createOperationalBooking: vi.fn(),
      rescheduleBooking: vi.fn().mockResolvedValue({
        booking: { ...mockOriginalBooking, version: 4, date: '2026-10-16', startTime: '14:00' },
        serverTime: '2026-10-15T12:05:00.000Z',
      }),
      cancelBooking: vi.fn(),
      transitionBookingStatus: vi.fn(),
    };

    engine = new BookingOperationEngine({
      serverClock: mockClock,
      store: mockStore,
      transport: mockTransport,
    });
  });

  it('em UNIT + bookingId dispara exclusivamente PATCH /reschedule e zeroPOST /bookings', async () => {
    const command: RescheduleBookingCommand = {
      action: 'RESCHEDULE',
      actorId: 'barber-1',
      scope: 'UNIT',
      shopId: 'shop-alpha',
      bookingId: 'booking-reschedule-100',
      expectedVersion: 3,
      date: '2026-10-16',
      startTime: '14:00',
      barbermanId: 'barber-1',
      serviceIds: ['srv-1'],
      expectedTotalPriceInCents: 5000,
      expectedDurationInMinutes: 30,
    };

    const prepared = await engine.prepare(command);
    const result = await engine.submit(prepared);

    expect(result.state).toBe('APPLIED');
    expect(result.resource?.data?.booking.version).toBe(4);

    // Disparou exclusivamente rescheduleBooking
    expect(mockTransport.rescheduleBooking).toHaveBeenCalledTimes(1);
    expect(mockTransport.rescheduleBooking).toHaveBeenCalledWith(
      'booking-reschedule-100',
      expect.objectContaining({
        expectedVersion: 3,
        date: '2026-10-16',
        startTime: '14:00',
        scope: 'UNIT',
      }),
      prepared.requestId
    );

    // ZERO chamadas para criação de reserva
    expect(mockTransport.createBooking).not.toHaveBeenCalled();
    expect(mockTransport.createOperationalBooking).not.toHaveBeenCalled();

    // Verificação de ledger: operação registrada foi RESCHEDULE_BOOKING
    expect(mockStore.save).toHaveBeenCalledWith(
      'barber-1',
      expect.objectContaining({
        operation: 'RESCHEDULE_BOOKING',
        requestId: prepared.requestId,
      })
    );
  });

  it('BARBER em UNIT só pode gerenciar e remarcar para ele mesmo (não transfere para terceiro)', () => {
    // 1. Barbeiro tentando gerenciar sua própria reserva: permitido
    const contextSelf = resolveBookingContext({
      actorId: 'barber-1',
      selectedMembership: { shopId: 'shop-alpha', role: 'BARBER', status: 'ACTIVE' },
      booking: mockOriginalBooking,
      requestedScope: 'UNIT',
    });
    expect(contextSelf.canAccess).toBe(true);
    expect(contextSelf.canReschedule).toBe(true);
    expect(contextSelf.isBarberSelfOnly).toBe(true);

    // 2. Barbeiro tentando acessar e transferir reserva de outro barbeiro: negado
    const contextOther = resolveBookingContext({
      actorId: 'barber-2',
      selectedMembership: { shopId: 'shop-alpha', role: 'BARBER', status: 'ACTIVE' },
      booking: mockOriginalBooking, // atribuída a barber-1
      requestedScope: 'UNIT',
    });
    expect(contextOther.canAccess).toBe(false);
    expect(contextOther.canReschedule).toBe(false);
    expect(contextOther.reason).toContain('Profissional só pode acessar e gerenciar agendamentos da sua própria agenda');
  });

  it('divergência 409 QUOTE_CHANGED interrompe submissão e não atualiza reserva', async () => {
    mockTransport.rescheduleBooking.mockRejectedValueOnce({
      status: 409,
      data: {
        code: 'QUOTE_CHANGED',
        message: 'Preço foi atualizado para R$ 60,00',
        quote: { totalPriceInCents: 6000, totalDurationInMinutes: 30, serviceItems: [] },
      },
    });

    const command: RescheduleBookingCommand = {
      action: 'RESCHEDULE',
      actorId: 'client-user',
      scope: 'PERSONAL',
      bookingId: 'booking-reschedule-100',
      expectedVersion: 3,
      date: '2026-10-16',
      startTime: '14:00',
      serviceIds: ['srv-1'],
    };

    const prepared = await engine.prepare(command);

    await expect(engine.submit(prepared)).rejects.toThrow();

    // Verificações
    expect(mockTransport.createBooking).not.toHaveBeenCalled();
    expect(mockStore.save).toHaveBeenLastCalledWith(
      'client-user',
      expect.objectContaining({
        status: 'error',
        operation: 'RESCHEDULE_BOOKING',
      })
    );
  });
});
