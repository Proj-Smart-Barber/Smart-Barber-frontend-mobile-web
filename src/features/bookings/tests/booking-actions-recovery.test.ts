import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BookingOperationEngine } from '../model/booking-operation-engine';
import { ServerClock } from '../lib/server-clock';
import type { CancelBookingCommand } from '../model/booking-command.types';
import type { OperationAttemptStore } from '@/shared/operations/operation-attempt.types';
import * as attemptApi from '@/shared/operations/operation-attempt.api';

describe('I3 — Recuperação de Ações e Garantias de Idempotência (booking-actions-recovery)', () => {
  let mockStore: OperationAttemptStore;
  let mockClock: ServerClock;
  let mockTransport: any;
  let engine: BookingOperationEngine;

  const fakeBookingDto: any = {
    id: 'booking-action-1',
    barbershopId: 'shop-1',
    status: 'CONFIRMED',
    version: 1,
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
      cancelBooking: vi.fn(),
      rescheduleBooking: vi.fn(),
      transitionBookingStatus: vi.fn(),
    };

    engine = new BookingOperationEngine({
      serverClock: mockClock,
      store: mockStore,
      transport: mockTransport,
    });
  });

  it('sem clock/entropy/storage: nenhuma mutacao ou requisicao de rede e disparada (zero requests)', async () => {
    // 1. Sem clock sincronizado
    const brokenClock = new ServerClock();
    const command: CancelBookingCommand = {
      action: 'CANCEL',
      actorId: 'user-1',
      scope: 'PERSONAL',
      bookingId: 'booking-action-1',
      expectedVersion: 1,
    };

    await expect(
      engine.prepare(command, { serverClock: brokenClock, store: mockStore })
    ).rejects.toThrow('Relógio do servidor não sincronizado');
    expect(mockTransport.cancelBooking).not.toHaveBeenCalled();

    // 2. Com falha de storage no prepare
    vi.mocked(mockStore.save).mockRejectedValueOnce(new Error('StorageDiskFull'));
    await expect(engine.prepare(command)).rejects.toThrow('StorageDiskFull');
    expect(mockTransport.cancelBooking).not.toHaveBeenCalled();
  });

  it('CANCEL apos response-loss mantem a mesma chave para recuperacao (uncertain status)', async () => {
    const command: CancelBookingCommand = {
      action: 'CANCEL',
      actorId: 'user-1',
      scope: 'PERSONAL',
      bookingId: 'booking-action-1',
      expectedVersion: 1,
      reason: 'Viagem',
    };

    const prepared = await engine.prepare(command);
    const key = prepared.requestId;

    // Simula perda de resposta após o envio
    mockTransport.cancelBooking.mockRejectedValueOnce(new Error('Network dropped'));

    await expect(engine.submit(prepared)).rejects.toThrow('Network dropped');

    // Verifica que o status gravado no store é 'uncertain' com a MESMA chave
    expect(mockStore.save).toHaveBeenLastCalledWith(
      'user-1',
      expect.objectContaining({
        status: 'uncertain',
        requestId: key,
      })
    );

    // Replay da tentativa usa rigorosamente a mesma chave key
    mockTransport.cancelBooking.mockResolvedValueOnce({
      booking: { ...fakeBookingDto, status: 'CANCELED', version: 2 },
      serverTime: '2026-10-15T12:00:05.000Z',
    });

    const replayResult = await engine.submit(prepared);
    expect(replayResult.state).toBe('APPLIED');
    expect(mockTransport.cancelBooking).toHaveBeenCalledWith(
      'booking-action-1',
      expect.anything(),
      key
    );
  });

  it('UNKNOWN/503/404/close{} nao cria outra chave nem nova mutation', async () => {
    const origKey = '019d7be3-7f00-743e-b217-9130138f9999';

    vi.spyOn(attemptApi, 'closeOwnAttempt').mockResolvedValueOnce({
      state: 'NOT_APPLIED',
      operation: 'CANCEL_BOOKING',
      accessChanged: false,
    });

    const closeResult = await engine.close('user-1', origKey);
    expect(closeResult.state).toBe('NOT_APPLIED');

    // Garante que close utilizou a chave original e não instanciou outra
    expect(attemptApi.closeOwnAttempt).toHaveBeenCalledWith(origKey);
    expect(mockTransport.cancelBooking).not.toHaveBeenCalled();
  });

  it('apos relogin sem payload local so reconcilia e nao tenta mutacao inventada', async () => {
    const existingKey = '019d7be3-7f00-743e-b217-9130138f8888';

    // Registro no storage após limpeza de logout só possui metadados da tentativa, sem payload
    vi.mocked(mockStore.read).mockResolvedValueOnce({
      actorId: 'user-1',
      requestId: existingKey,
      operation: 'CANCEL_BOOKING',
      resourceKind: 'BOOKING',
      status: 'uncertain',
      createdAt: 1775900000000,
      payload: undefined, // payload apagado no logout
    });

    vi.spyOn(attemptApi, 'findOwnAttempt').mockResolvedValueOnce({
      state: 'APPLIED',
      operation: 'CANCEL_BOOKING',
      resource: {
        kind: 'BOOKING',
        id: 'booking-action-1',
        version: 2,
        data: { booking: { ...fakeBookingDto, status: 'CANCELED', version: 2 } },
      },
      accessChanged: false,
    });

    // Caller executa reconcile diretamente sem disparar submit sem payload
    const reconciled = await engine.reconcile('user-1', existingKey);
    expect(reconciled.state).toBe('APPLIED');
    expect(reconciled.resource?.data?.booking?.status).toBe('CANCELED');
    expect(mockTransport.cancelBooking).not.toHaveBeenCalled();
  });

  it('side effect e aplicado uma unica vez apos replay e reconciliacao', async () => {
    const command: CancelBookingCommand = {
      action: 'CANCEL',
      actorId: 'user-1',
      scope: 'PERSONAL',
      bookingId: 'booking-action-1',
      expectedVersion: 1,
    };

    const prepared = await engine.prepare(command);

    mockTransport.cancelBooking.mockResolvedValueOnce({
      booking: { ...fakeBookingDto, status: 'CANCELED', version: 2 },
      serverTime: '2026-10-15T12:00:01.000Z',
    });

    const res1 = await engine.submit(prepared);
    expect(res1.state).toBe('APPLIED');
    expect(mockTransport.cancelBooking).toHaveBeenCalledTimes(1);

    // Tentativa subsequente de consulta/reconciliação não dispara nova chamada de transporte
    vi.spyOn(attemptApi, 'findOwnAttempt').mockResolvedValueOnce({
      state: 'APPLIED',
      operation: 'CANCEL_BOOKING',
      resource: {
        kind: 'BOOKING',
        id: 'booking-action-1',
        version: 2,
      },
    });

    const res2 = await engine.reconcile('user-1', prepared.requestId);
    expect(res2.state).toBe('APPLIED');
    expect(mockTransport.cancelBooking).toHaveBeenCalledTimes(1);
  });
});
