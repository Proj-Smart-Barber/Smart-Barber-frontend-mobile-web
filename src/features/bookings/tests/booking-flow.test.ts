import { describe, it, expect, vi, beforeEach } from 'vitest';
import { bookingQueryKeys, invalidateBookingQueries } from '../model/booking-query-keys';
import { BookingFlowEngine } from '../model/booking-draft';
import type { BookingDraft, BookingTransport } from '../model/booking-draft';
import type { BookingDto } from '../api/bookings.dto';

describe('R2 — Fluxo e Carrinho de Agendamento (Contratos e Invalidações)', () => {
  let transport: BookingTransport;

  const fakeDraft: BookingDraft = {
    shopId: 'shop-alpha-123',
    serviceIds: ['srv-corte', 'srv-barba'],
    barbermanId: 'barber-carlos',
    date: '2026-10-15',
    startTime: '10:00',
    expectedTotalPriceInCents: 8500,
    expectedDurationInMinutes: 50,
  };

  const fakeConfirmedBooking: BookingDto = {
    id: 'booking-real-999',
    barbershopId: 'shop-alpha-123',
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

  it('two_services_reach_review_and_generate_single_post: dois servicos geram um unico POST com array', async () => {
    vi.mocked(transport.createBooking).mockResolvedValue({
      booking: fakeConfirmedBooking,
    });

    const engine = new BookingFlowEngine(fakeDraft, transport, 1775900000000);
    expect(engine.state.payload.serviceIds).toEqual(['srv-corte', 'srv-barba']);
    expect(engine.state.payload.expectedTotalPriceInCents).toBe(8500);
    expect(engine.state.payload.expectedDurationInMinutes).toBe(50);

    const booking = await engine.submit();

    expect(transport.createBooking).toHaveBeenCalledTimes(1);
    expect(transport.createBooking).toHaveBeenCalledWith(
      expect.objectContaining({
        serviceIds: ['srv-corte', 'srv-barba'],
        barbermanId: 'barber-carlos',
        date: '2026-10-15',
        startTime: '10:00',
      }),
      engine.key
    );
    expect(booking.id).toBe('booking-real-999');
  });

  it('quote_change_never_autosubmits: QUOTE_CHANGED interrompe fluxo, expoem cotacao autoritativa e nao auto-submete', async () => {
    vi.mocked(transport.createBooking).mockRejectedValue({
      statusCode: 409,
      code: 'QUOTE_CHANGED',
      message: 'Valores atualizados pela unidade.',
      quote: {
        totalPriceInCents: 9500,
        totalDurationInMinutes: 55,
        serviceItems: [
          { serviceId: 'srv-corte', title: 'Corte', priceInCents: 6000, durationInMinutes: 35 },
          { serviceId: 'srv-barba', title: 'Barba', priceInCents: 3500, durationInMinutes: 20 },
        ],
      },
    });

    const engine = new BookingFlowEngine(fakeDraft, transport, 1775900000000);

    await expect(engine.submit()).rejects.toThrow();

    expect(engine.quoteMismatch).toBe(true);
    expect(engine.authoritativeQuote?.totalPriceInCents).toBe(9500);
    expect(engine.authoritativeQuote?.totalDurationInMinutes).toBe(55);
    expect(engine.isConfirmed).toBe(false);

    // Garante que não houve auto-submit ou repetição não autorizada
    expect(transport.createBooking).toHaveBeenCalledTimes(1);
  });

  it('409 de conflito de slot nao recebe tratamento de QUOTE_CHANGED', async () => {
    vi.mocked(transport.createBooking).mockRejectedValue({
      statusCode: 409,
      code: 'SLOT_UNAVAILABLE',
      message: 'O horário selecionado não está mais disponível.',
    });

    const engine = new BookingFlowEngine(fakeDraft, transport, 1775900000000);

    await expect(engine.submit()).rejects.toThrow();

    expect(engine.quoteMismatch).toBe(false);
    expect(engine.status).toBe('error');
    expect(engine.state.errorMessage).toContain('não está mais disponível');
  });

  it('unit_cache_isolation: query keys isolam caches por unidade, ator e fuso', () => {
    const keyShop1 = bookingQueryKeys.availability('shop-1', {
      date: '2026-10-15',
      serviceIds: ['s1'],
    });
    const keyShop2 = bookingQueryKeys.availability('shop-2', {
      date: '2026-10-15',
      serviceIds: ['s1'],
    });

    expect(keyShop1).not.toEqual(keyShop2);
    expect(keyShop1[1]).toBe('shop-1');
    expect(keyShop2[1]).toBe('shop-2');

    const myBookingsUser1 = bookingQueryKeys.myBookings('user-1');
    const myBookingsUser2 = bookingQueryKeys.myBookings('user-2');
    expect(myBookingsUser1).not.toEqual(myBookingsUser2);
  });

  it('invalidateBookingQueries invalida disponibilidade, listas, agendas e notificacoes', async () => {
    const mockQueryClient: any = {
      invalidateQueries: vi.fn().mockResolvedValue(undefined),
    };

    await invalidateBookingQueries(mockQueryClient, {
      actorId: 'user-1',
      shopId: 'shop-alpha',
      bookingId: 'booking-99',
      newProfessionalId: 'barber-1',
      dates: ['2026-10-15'],
    });

    expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ['bookings', 'me'] })
    );
    expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ['bookings', 'detail', 'booking-99'] })
    );
    expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ['barbershop', 'shop-alpha', 'availability'] })
    );
    expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ['barbershop', 'shop-alpha', 'bookings'] })
    );
    expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ['agenda', 'shop-alpha'] })
    );
    expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ['dashboard', 'shop-alpha'] })
    );
    expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ['notifications', 'user-1'] })
    );
  });
});
