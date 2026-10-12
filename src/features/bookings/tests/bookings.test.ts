import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  BookingFlowEngine,
  type BookingDraft,
  type BookingTransport,
} from '../model/booking-draft';
import { generateUuidV7 } from '../lib/attempt-id';
import type { BookingDto } from '../api/bookings.dto';

describe('Task R1/R2 — Reserva Múltipla Idempotente e Recuperação de Agendamento', () => {
  let transport: BookingTransport;
  const fakeDraft: BookingDraft = {
    shopId: 'shop-123',
    serviceIds: ['srv-corte', 'srv-barba'],
    barbermanId: 'barber-carlos',
    date: '2026-10-15',
    startTime: '10:00',
    expectedTotalPriceInCents: 8500,
    expectedDurationInMinutes: 50,
  };

  const fakeConfirmedBooking: BookingDto = {
    id: 'booking-real-999',
    barbershopId: 'shop-123',
    barbermanId: 'barber-carlos',
    date: '2026-10-15T00:00:00.000Z',
    startTime: '10:00',
    endTime: '10:50',
    services: [
      { id: 'srv-corte', title: 'Corte', priceInCents: 5000, durationInMinutes: 30 },
      { id: 'srv-barba', title: 'Barba', priceInCents: 3500, durationInMinutes: 20 },
    ],
  };

  beforeEach(() => {
    transport = {
      createBooking: vi.fn(),
      getBookingById: vi.fn(),
    };
  });

  it('multiple_services_use_one_post: submissão dispara exatamente um POST com array serviceIds', async () => {
    vi.mocked(transport.createBooking).mockResolvedValue({
      booking: fakeConfirmedBooking,
    });

    const engine = new BookingFlowEngine(fakeDraft, transport, 1775900000000);
    const booking = await engine.submit();

    expect(transport.createBooking).toHaveBeenCalledTimes(1);
    expect(transport.createBooking).toHaveBeenCalledWith(
      {
        serviceIds: ['srv-corte', 'srv-barba'],
        barbermanId: 'barber-carlos',
        date: '2026-10-15',
        startTime: '10:00',
        expectedTotalPriceInCents: 8500,
        expectedDurationInMinutes: 50,
      },
      engine.key
    );
    expect(booking.id).toBe('booking-real-999');
    expect(engine.isConfirmed).toBe(true);
  });

  it('attempt_replay_keeps_key_and_payload: tentativa preserva rigorosamente a mesma chave Idempotency-Key', async () => {
    vi.mocked(transport.createBooking)
      .mockRejectedValueOnce({ name: 'AbortError', message: 'timeout' })
      .mockResolvedValueOnce({ booking: fakeConfirmedBooking });

    const engine = new BookingFlowEngine(fakeDraft, transport, 1775900000000);
    const initialKey = engine.key;

    // 1ª tentativa falha com timeout
    await expect(engine.submit()).rejects.toThrow();
    expect(engine.status).toBe('uncertain');
    expect(engine.key).toBe(initialKey);

    // Replay deve usar exatamente a mesma chave
    const booking = await engine.retryReplay();
    expect(booking.id).toBe('booking-real-999');
    expect(transport.createBooking).toHaveBeenLastCalledWith(
      expect.anything(),
      initialKey
    );
  });

  it('missing_server_clock_blocks_attempt: timestamp do servidor inválido bloqueia geração de chave', () => {
    expect(() => generateUuidV7(-500)).toThrow('Server clock inválido');
    expect(() => generateUuidV7(NaN)).toThrow('Server clock inválido');
  });

  it('quote_change_requires_new_confirmation: 409 de divergência sinaliza quoteMismatch e bloqueia confirmação', async () => {
    vi.mocked(transport.createBooking).mockRejectedValue({
      statusCode: 409,
      message: 'O valor dos serviços selecionados foi alterado. Revise os valores para confirmar.',
    });

    const engine = new BookingFlowEngine(fakeDraft, transport, 1775900000000);

    await expect(engine.submit()).rejects.toThrow();

    expect(engine.status).toBe('error');
    expect(engine.quoteMismatch).toBe(true);
    expect(engine.isConfirmed).toBe(false);
  });

  it('generateUuidV7 produz formato UUIDv7 em conformidade com RFC 4122', () => {
    const key = generateUuidV7(1775900000000);
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    expect(key).toMatch(uuidRegex);
  });

  it('ausência de server clock válido impede inicialização do engine', () => {
    expect(() => new BookingFlowEngine(fakeDraft, transport, undefined as any)).toThrow(
      'Server clock inválido ou não sincronizado'
    );
    expect(() => new BookingFlowEngine(fakeDraft, transport, 0)).toThrow(
      'Server clock inválido ou não sincronizado'
    );
  });

  it('409 de conflito de slot (SLOT_UNAVAILABLE) não é classificado como quoteMismatch', async () => {
    vi.mocked(transport.createBooking).mockRejectedValue({
      statusCode: 409,
      code: 'SLOT_UNAVAILABLE',
      message: 'O horário selecionado não está mais disponível.',
    });

    const engine = new BookingFlowEngine(fakeDraft, transport, 1775900000000);

    await expect(engine.submit()).rejects.toThrow();

    expect(engine.status).toBe('error');
    expect(engine.quoteMismatch).toBe(false);
    expect(engine.state.errorMessage).toContain('não está mais disponível');
  });

  it('falha no storage antes do envio gera zeroPOST', async () => {
    const mockStore: any = {
      save: vi.fn().mockRejectedValue(new Error('QuotaExceededError')),
    };

    const engine = new BookingFlowEngine(fakeDraft, transport, {
      serverTimestampMs: 1775900000000,
      store: mockStore,
      actorId: 'client-user-1',
    });

    await expect(engine.submit()).rejects.toThrow('QuotaExceededError');
    expect(transport.createBooking).not.toHaveBeenCalled();
    expect(mockStore.save).toHaveBeenCalledTimes(1);
  });

  it('salva tentativa pendente e resultado confirmado no storage', async () => {
    const mockStore: any = {
      save: vi.fn().mockResolvedValue(undefined),
    };
    vi.mocked(transport.createBooking).mockResolvedValue({
      booking: fakeConfirmedBooking,
    });

    const engine = new BookingFlowEngine(fakeDraft, transport, {
      serverTimestampMs: 1775900000000,
      store: mockStore,
      actorId: 'client-user-1',
    });

    await engine.submit();

    expect(mockStore.save).toHaveBeenCalledTimes(2);
    expect(mockStore.save).toHaveBeenNthCalledWith(
      1,
      'client-user-1',
      expect.objectContaining({
        status: 'pending',
        operation: 'CREATE_BOOKING',
      })
    );
    expect(mockStore.save).toHaveBeenNthCalledWith(
      2,
      'client-user-1',
      expect.objectContaining({
        status: 'confirmed',
        result: expect.objectContaining({ state: 'APPLIED' }),
      })
    );
  });
});
