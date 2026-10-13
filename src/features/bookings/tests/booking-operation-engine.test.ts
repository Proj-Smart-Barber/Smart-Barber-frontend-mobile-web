import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BookingOperationEngine } from '../model/booking-operation-engine';
import { ServerClock } from '../lib/server-clock';
import type {
  BookingCommand,
  CreateBookingCommand,
  CancelBookingCommand,
  RescheduleBookingCommand,
  CompleteBookingCommand,
} from '../model/booking-command.types';
import type { OperationAttemptStore } from '@/shared/operations/operation-attempt.types';
import * as attemptApi from '@/shared/operations/operation-attempt.api';

describe('I3 — BookingOperationEngine (Motor de Execução Recuperável)', () => {
  let mockStore: OperationAttemptStore;
  let mockClock: ServerClock;
  let mockTransport: any;
  let engine: BookingOperationEngine;

  const fakeBookingDto: any = {
    id: 'booking-uuid-1',
    barbershopId: 'shop-1',
    barbermanId: 'barber-1',
    date: '2026-10-15',
    startTime: '10:00',
    endTime: '10:30',
    status: 'CONFIRMED',
    version: 1,
    services: [{ id: 'srv-1', title: 'Corte', priceInCents: 5000, durationInMinutes: 30 }],
  };

  beforeEach(() => {
    mockStore = {
      read: vi.fn().mockResolvedValue(null),
      save: vi.fn().mockResolvedValue(undefined),
      listReferences: vi.fn().mockResolvedValue([]),
      clearResolved: vi.fn().mockResolvedValue(undefined),
      clearPayloadsOnLogout: vi.fn().mockResolvedValue(undefined),
      clearAllForActor: vi.fn().mockResolvedValue(undefined),
    };

    mockClock = new ServerClock(() => 1000);
    mockClock.syncWithServer('2026-10-15T12:00:00.000Z');

    mockTransport = {
      createBooking: vi.fn().mockResolvedValue({
        booking: fakeBookingDto,
        serverTime: '2026-10-15T12:00:01.000Z',
      }),
      createOperationalBooking: vi.fn().mockResolvedValue({
        booking: fakeBookingDto,
        serverTime: '2026-10-15T12:00:01.000Z',
      }),
      rescheduleBooking: vi.fn().mockResolvedValue({
        booking: { ...fakeBookingDto, version: 2 },
        serverTime: '2026-10-15T12:00:01.000Z',
      }),
      cancelBooking: vi.fn().mockResolvedValue({
        booking: { ...fakeBookingDto, status: 'CANCELED', version: 2 },
        serverTime: '2026-10-15T12:00:01.000Z',
      }),
      transitionBookingStatus: vi.fn().mockResolvedValue({
        booking: { ...fakeBookingDto, status: 'COMPLETED', version: 2 },
        serverTime: '2026-10-15T12:00:01.000Z',
      }),
    };

    engine = new BookingOperationEngine({
      serverClock: mockClock,
      store: mockStore,
      transport: mockTransport,
    });
  });

  describe('prepare', () => {
    it('falha fechado se actorId estiver ausente', async () => {
      const command: any = {
        action: 'CREATE',
        actorId: '',
        scope: 'PERSONAL',
        shopId: 'shop-1',
      };

      await expect(engine.prepare(command)).rejects.toThrow('Ator (actorId) é obrigatório');
    });

    it('falha se acao de mutacao nao tiver bookingId ou expectedVersion valido', async () => {
      const invalidCancel: any = {
        action: 'CANCEL',
        actorId: 'user-1',
        scope: 'PERSONAL',
        bookingId: '',
        expectedVersion: 1,
      };
      await expect(engine.prepare(invalidCancel)).rejects.toThrow('bookingId é obrigatório');

      const invalidVersion: any = {
        action: 'CANCEL',
        actorId: 'user-1',
        scope: 'PERSONAL',
        bookingId: 'booking-1',
        expectedVersion: 0,
      };
      await expect(engine.prepare(invalidVersion)).rejects.toThrow('expectedVersion numérico válido');
    });

    it('sem relogio do servidor sincronizado gera erro e zero operacoes', async () => {
      const unsyncedClock = new ServerClock();
      const command: CreateBookingCommand = {
        action: 'CREATE',
        actorId: 'user-1',
        scope: 'PERSONAL',
        shopId: 'shop-1',
        serviceIds: ['s1'],
        barbermanId: 'b1',
        date: '2026-10-15',
        startTime: '10:00',
        expectedTotalPriceInCents: 5000,
        expectedDurationInMinutes: 30,
      };

      await expect(
        engine.prepare(command, { serverClock: unsyncedClock, store: mockStore })
      ).rejects.toThrow('Relógio do servidor não sincronizado');
      expect(mockStore.save).not.toHaveBeenCalled();
    });

    it('persiste tentativa inicial como reviewing e retorna prepared operation', async () => {
      const command: CancelBookingCommand = {
        action: 'CANCEL',
        actorId: 'user-1',
        scope: 'PERSONAL',
        bookingId: 'booking-1',
        expectedVersion: 1,
        reason: 'Imprevisto',
      };

      const prepared = await engine.prepare(command);
      expect(prepared.requestId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
      expect(prepared.command).toEqual(command);
      expect(mockStore.save).toHaveBeenCalledTimes(1);
      expect(mockStore.save).toHaveBeenCalledWith(
        'user-1',
        expect.objectContaining({
          status: 'reviewing',
          operation: 'CANCEL_BOOKING',
          requestId: prepared.requestId,
        })
      );
    });
  });

  describe('submit', () => {
    it('grava submitting antes do transporte e falha no storage impede request (zero requests)', async () => {
      vi.mocked(mockStore.save).mockRejectedValueOnce(new Error('StorageQuotaError'));

      const command: CancelBookingCommand = {
        action: 'CANCEL',
        actorId: 'user-1',
        scope: 'PERSONAL',
        bookingId: 'booking-1',
        expectedVersion: 1,
      };

      const prepared = {
        requestId: '019d7be3-7f00-743e-b217-9130138f9582',
        command,
        createdAt: 1775900000000,
      };

      await expect(engine.submit(prepared)).rejects.toThrow('StorageQuotaError');
      expect(mockTransport.cancelBooking).not.toHaveBeenCalled();
    });

    it('bloqueia double-tap simultaneo para o mesmo requestId', async () => {
      const command: CompleteBookingCommand = {
        action: 'COMPLETE',
        actorId: 'user-1',
        scope: 'UNIT',
        bookingId: 'booking-1',
        expectedVersion: 1,
      };

      const prepared = {
        requestId: '019d7be3-7f00-743e-b217-9130138f9583',
        command,
        createdAt: 1775900000000,
      };

      // Fazer a chamada demorar para testar concorrência
      let resolveFirst: any;
      mockTransport.transitionBookingStatus.mockImplementationOnce(
        () => new Promise((resolve) => { resolveFirst = resolve; })
      );

      const firstCall = engine.submit(prepared);
      await expect(engine.submit(prepared)).rejects.toThrow('Operação já está em processamento.');

      resolveFirst({
        booking: { ...fakeBookingDto, status: 'COMPLETED' },
        serverTime: '2026-10-15T12:05:00.000Z',
      });
      await firstCall;
    });

    it('submete com sucesso, grava confirmed APPLIED e sincroniza clock com serverTime', async () => {
      const command: RescheduleBookingCommand = {
        action: 'RESCHEDULE',
        actorId: 'user-1',
        scope: 'PERSONAL',
        bookingId: 'booking-1',
        expectedVersion: 1,
        date: '2026-10-16',
        startTime: '14:00',
      };

      const prepared = {
        requestId: '019d7be3-7f00-743e-b217-9130138f9584',
        command,
        createdAt: 1775900000000,
      };

      const result = await engine.submit(prepared);

      expect(mockTransport.rescheduleBooking).toHaveBeenCalledTimes(1);
      expect(mockTransport.rescheduleBooking).toHaveBeenCalledWith(
        'booking-1',
        expect.objectContaining({
          expectedVersion: 1,
          date: '2026-10-16',
          startTime: '14:00',
        }),
        '019d7be3-7f00-743e-b217-9130138f9584'
      );

      expect(result.state).toBe('APPLIED');
      expect(result.resource?.data?.booking.version).toBe(2);

      expect(mockStore.save).toHaveBeenCalledTimes(2);
      expect(mockStore.save).toHaveBeenNthCalledWith(
        1,
        'user-1',
        expect.objectContaining({ status: 'submitting', operation: 'RESCHEDULE_BOOKING' })
      );
      expect(mockStore.save).toHaveBeenNthCalledWith(
        2,
        'user-1',
        expect.objectContaining({
          status: 'confirmed',
          result: expect.objectContaining({ state: 'APPLIED' }),
        })
      );
    });

    it('em erro QUOTE_CHANGED grava error e lanca erro sem auto-retry', async () => {
      mockTransport.createBooking.mockRejectedValueOnce({
        status: 409,
        data: {
          code: 'QUOTE_CHANGED',
          message: 'Preços foram alterados',
          quote: { totalPriceInCents: 6000, totalDurationInMinutes: 30, serviceItems: [] },
        },
      });

      const command: CreateBookingCommand = {
        action: 'CREATE',
        actorId: 'user-1',
        scope: 'PERSONAL',
        shopId: 'shop-1',
        serviceIds: ['s1'],
        barbermanId: 'b1',
        date: '2026-10-15',
        startTime: '10:00',
        expectedTotalPriceInCents: 5000,
        expectedDurationInMinutes: 30,
      };

      const prepared = {
        requestId: '019d7be3-7f00-743e-b217-9130138f9585',
        command,
        createdAt: 1775900000000,
      };

      await expect(engine.submit(prepared)).rejects.toThrow();
      expect(mockStore.save).toHaveBeenLastCalledWith(
        'user-1',
        expect.objectContaining({
          status: 'error',
          operation: 'CREATE_BOOKING',
        })
      );
    });

    it('em falha de conexao/timeout grava uncertain e mantem chave para recuperacao', async () => {
      mockTransport.cancelBooking.mockRejectedValueOnce(new TypeError('Network request failed'));

      const command: CancelBookingCommand = {
        action: 'CANCEL',
        actorId: 'user-1',
        scope: 'PERSONAL',
        bookingId: 'booking-1',
        expectedVersion: 1,
      };

      const prepared = {
        requestId: '019d7be3-7f00-743e-b217-9130138f9586',
        command,
        createdAt: 1775900000000,
      };

      await expect(engine.submit(prepared)).rejects.toThrow();
      expect(mockStore.save).toHaveBeenLastCalledWith(
        'user-1',
        expect.objectContaining({
          status: 'uncertain',
          requestId: '019d7be3-7f00-743e-b217-9130138f9586',
        })
      );
    });
  });

  describe('reconcile e close', () => {
    it('reconcile consulta findOwnAttempt e persiste confirmed se APPLIED', async () => {
      vi.spyOn(attemptApi, 'findOwnAttempt').mockResolvedValueOnce({
        state: 'APPLIED',
        operation: 'CANCEL_BOOKING',
        resource: { kind: 'BOOKING', id: 'booking-1', version: 2 },
        accessChanged: false,
      });

      const res = await engine.reconcile('user-1', 'req-123');
      expect(res.state).toBe('APPLIED');
      expect(mockStore.save).toHaveBeenCalledWith(
        'user-1',
        expect.objectContaining({
          status: 'confirmed',
          requestId: 'req-123',
        })
      );
    });

    it('reconcile com NOT_APPLIED marca error no store', async () => {
      vi.spyOn(attemptApi, 'findOwnAttempt').mockResolvedValueOnce({
        state: 'NOT_APPLIED',
        operation: 'CANCEL_BOOKING',
        accessChanged: false,
      });

      const res = await engine.reconcile('user-1', 'req-456');
      expect(res.state).toBe('NOT_APPLIED');
      expect(mockStore.save).toHaveBeenCalledWith(
        'user-1',
        expect.objectContaining({
          status: 'error',
          requestId: 'req-456',
        })
      );
    });

    it('close chama closeOwnAttempt e atualiza store quando NOT_APPLIED', async () => {
      vi.spyOn(attemptApi, 'closeOwnAttempt').mockResolvedValueOnce({
        state: 'NOT_APPLIED',
        operation: 'CANCEL_BOOKING',
        accessChanged: false,
      });

      const res = await engine.close('user-1', 'req-789');
      expect(res.state).toBe('NOT_APPLIED');
      expect(mockStore.save).toHaveBeenCalledWith(
        'user-1',
        expect.objectContaining({
          status: 'error',
          requestId: 'req-789',
        })
      );
    });
  });
});
