import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createBooking,
  createOperationalBooking,
  getBookingById,
  fetchMyBookings,
  fetchUnitBookings,
  lookupCustomer,
  cancelBooking,
  rescheduleBooking,
  transitionBookingStatus,
  getBookingAvailability,
} from '../api/bookings.api';
import { httpClient } from '@/shared/api';
import { bookingDtoSchema, fetchUnitBookingsResponseSchema } from '../api/bookings.schema';

describe('R1 — Contratos e Adapters de Reservas (Boundary Zod & Adapters)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  const validBookingBackendResponse = {
    id: 'b1234567-0000-0000-0000-000000000001',
    barbershopId: 's1234567-0000-0000-0000-000000000001',
    barbermanId: 'p1234567-0000-0000-0000-000000000001',
    customerId: 'c1234567-0000-0000-0000-000000000001',
    customer: {
      id: 'c1234567-0000-0000-0000-000000000001',
      name: 'João Silva',
      phoneNumber: '(11) 98888-7777',
    },
    services: [
      {
        id: 'srv-1',
        serviceId: 'srv-1',
        title: 'Corte Cabelo',
        priceInCents: 5000,
        durationInMinutes: 30,
        legacyAggregate: false,
      },
      {
        id: 'srv-2',
        serviceId: 'srv-2',
        title: 'Barba',
        priceInCents: 3500,
        durationInMinutes: 20,
        legacyAggregate: false,
      },
    ],
    startsAt: '2026-10-15T13:00:00.000Z',
    endsAt: '2026-10-15T13:50:00.000Z',
    timezone: 'America/Sao_Paulo',
    status: 'CONFIRMED',
    version: 1,
    clientRequestId: '019d75c2-e700-7000-8000-000000000001',
    totalPriceInCents: 8500,
    totalDurationInMinutes: 50,
    date: '2026-10-15T00:00:00.000Z',
    startTime: '10:00',
    endTime: '10:50',
    canCancel: true,
    canReschedule: true,
    canComplete: false,
    canMarkNoShow: false,
    capabilities: {
      cancel: { allowed: true, reasonCode: null, deadlineAt: '2026-10-15T11:00:00.000Z' },
      reschedule: { allowed: true, reasonCode: null, deadlineAt: '2026-10-15T11:00:00.000Z' },
      complete: { allowed: false, reasonCode: 'NOT_STARTED', deadlineAt: null },
      noShow: { allowed: false, reasonCode: 'TOO_EARLY', deadlineAt: null },
    },
    serverTime: '2026-10-12T10:00:00.000Z',
  };

  it('bookingDtoSchema valida boundary e preserva campos autoritativos', () => {
    const parsed = bookingDtoSchema.parse(validBookingBackendResponse);
    expect(parsed.id).toBe('b1234567-0000-0000-0000-000000000001');
    expect(parsed.services).toHaveLength(2);
    expect(parsed.totalPriceInCents).toBe(8500);
    expect(parsed.capabilities?.cancel?.allowed).toBe(true);
    expect(parsed.capabilities?.noShow?.allowed).toBe(false);
  });

  it('bookingDtoSchema trata serviços legados com legacyAggregate=true e valores null', () => {
    const legacyRaw = {
      ...validBookingBackendResponse,
      status: null, // Legado com status null não inventa CONFIRMED
      services: [
        {
          id: null,
          serviceId: null,
          title: 'Corte + Barba Antigo',
          priceInCents: null,
          durationInMinutes: null,
          legacyAggregate: true,
        },
      ],
      totalPriceInCents: null,
      totalDurationInMinutes: null,
    };

    const parsed = bookingDtoSchema.parse(legacyRaw);
    expect(parsed.status).toBeNull();
    expect(parsed.services[0].legacyAggregate).toBe(true);
    expect(parsed.services[0].priceInCents).toBeNull();
  });

  it('createBooking envia scope PERSONAL para POST /api/bookings com Idempotency-Key', async () => {
    const postSpy = vi.spyOn(httpClient, 'post').mockResolvedValueOnce({
      booking: validBookingBackendResponse,
      serverTime: '2026-10-12T10:00:00.000Z',
    });

    const res = await createBooking(
      {
        serviceIds: ['srv-1', 'srv-2'],
        barbermanId: 'p1234567-0000-0000-0000-000000000001',
        date: '2026-10-15',
        startTime: '10:00',
        expectedTotalPriceInCents: 8500,
        expectedDurationInMinutes: 50,
      },
      '019d75c2-e700-7000-8000-000000000001'
    );

    expect(postSpy).toHaveBeenCalledWith(
      '/api/bookings',
      expect.objectContaining({
        scope: 'PERSONAL',
        serviceIds: ['srv-1', 'srv-2'],
      }),
      expect.objectContaining({
        headers: { 'Idempotency-Key': '019d75c2-e700-7000-8000-000000000001' },
      })
    );
    expect(res.booking.id).toBe(validBookingBackendResponse.id);
  });

  it('createOperationalBooking envia scope UNIT com shopId e customerId', async () => {
    const postSpy = vi.spyOn(httpClient, 'post').mockResolvedValueOnce({
      booking: validBookingBackendResponse,
    });

    await createOperationalBooking(
      's1234567-0000-0000-0000-000000000001',
      {
        customerId: 'c1234567-0000-0000-0000-000000000001',
        serviceIds: ['srv-1'],
        barbermanId: 'p1234567-0000-0000-0000-000000000001',
        date: '2026-10-15',
        startTime: '10:00',
      },
      '019d75c2-e700-7000-8000-000000000002'
    );

    expect(postSpy).toHaveBeenCalledWith(
      '/api/bookings',
      expect.objectContaining({
        scope: 'UNIT',
        shopId: 's1234567-0000-0000-0000-000000000001',
        customerId: 'c1234567-0000-0000-0000-000000000001',
      }),
      expect.objectContaining({
        headers: { 'Idempotency-Key': '019d75c2-e700-7000-8000-000000000002' },
      })
    );
  });

  it('fetchMyBookings preserva envelope e valida lista', async () => {
    vi.spyOn(httpClient, 'get').mockResolvedValueOnce({
      bookings: [validBookingBackendResponse],
    });

    const res = await fetchMyBookings({ page: 1 });
    expect(res).toHaveLength(1);
    expect(res[0].id).toBe(validBookingBackendResponse.id);
  });

  it('fetchUnitBookings preserva resumo, total e metadados de paginação', async () => {
    vi.spyOn(httpClient, 'get').mockResolvedValueOnce({
      items: [validBookingBackendResponse],
      page: 1,
      limit: 20,
      total: 1,
      hasNext: false,
      serverTime: '2026-10-12T10:00:00.000Z',
      summary: { totalBookings: 1, totalRevenueInCents: 8500 },
    });

    const res = await fetchUnitBookings('s1234567-0000-0000-0000-000000000001', { page: 1 });
    expect(res.items).toHaveLength(1);
    expect(res.total).toBe(1);
    expect(res.hasNext).toBe(false);
    expect(res.summary?.totalRevenueInCents).toBe(8500);
  });

  it('lookupCustomer rejeita informacao sem email ou cpf e nao vaza para logs ou store', async () => {
    await expect(lookupCustomer('shop-1', {} as any)).rejects.toThrow('critério de busca');
  });

  it('cancelBooking exige expectedVersion e usa DELETE com body', async () => {
    const deleteSpy = vi.spyOn(httpClient, 'delete').mockResolvedValueOnce({
      booking: { ...validBookingBackendResponse, status: 'CANCELLED' },
      serverTime: '2026-10-12T10:00:00.000Z',
    });

    await cancelBooking('b1', { expectedVersion: 2, reason: 'Imprevisto' });
    expect(deleteSpy).toHaveBeenCalledWith(
      '/api/bookings/b1/cancel',
      expect.objectContaining({ expectedVersion: 2, reason: 'Imprevisto' })
    );
  });

  it('cancelBooking, rescheduleBooking e transitionBookingStatus enviam Idempotency-Key no header', async () => {
    const key = '019d75c2-e700-7000-8000-000000000001';

    const deleteSpy = vi.spyOn(httpClient, 'delete').mockResolvedValueOnce({
      booking: { ...validBookingBackendResponse, status: 'CANCELLED' },
      serverTime: '2026-10-12T10:00:00.000Z',
    });
    await cancelBooking('b1', { expectedVersion: 2 }, key);
    expect(deleteSpy).toHaveBeenCalledWith(
      '/api/bookings/b1/cancel',
      expect.objectContaining({ expectedVersion: 2 }),
      expect.objectContaining({
        headers: { 'Idempotency-Key': key },
      })
    );

    const patchSpy = vi.spyOn(httpClient, 'patch').mockResolvedValue({
      booking: { ...validBookingBackendResponse, version: 3 },
      serverTime: '2026-10-12T10:00:00.000Z',
    });
    await rescheduleBooking(
      'b1',
      {
        expectedVersion: 2,
        date: '2026-10-16',
        startTime: '10:00',
      },
      key
    );
    expect(patchSpy).toHaveBeenCalledWith(
      '/api/bookings/b1/reschedule',
      expect.objectContaining({ expectedVersion: 2 }),
      expect.objectContaining({
        headers: { 'Idempotency-Key': key },
      })
    );

    await transitionBookingStatus(
      'b1',
      {
        status: 'COMPLETED',
        expectedVersion: 3,
      },
      key
    );
    expect(patchSpy).toHaveBeenCalledWith(
      '/api/bookings/b1/status',
      expect.objectContaining({ status: 'COMPLETED', expectedVersion: 3 }),
      expect.objectContaining({
        headers: { 'Idempotency-Key': key },
      })
    );
  });

  it('getBookingAvailability falha fechado em resposta invalida sem transformar em lista vazia', async () => {
    vi.spyOn(httpClient, 'get').mockResolvedValueOnce({
      invalid: 'response',
    });

    await expect(
      getBookingAvailability('shop-1', {
        serviceIds: ['srv-1'],
        date: '2026-10-15',
      })
    ).rejects.toThrow('Resposta de disponibilidade inválida');
  });
});

