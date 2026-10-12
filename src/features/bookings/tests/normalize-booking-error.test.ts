import { describe, it, expect } from 'vitest';
import { normalizeBookingError, type NormalizedBookingError } from '../lib/normalize-booking-error';
import { ApiError } from '@/shared/api';

describe('R1 — normalizeBookingError', () => {
  it('QUOTE_CHANGED retorna código discriminado, quote autoritativa e NOT_APPLIED comprovado', () => {
    const errorResponse = {
      code: 'QUOTE_CHANGED',
      message: 'Orçamento alterado.',
      operationState: 'NOT_APPLIED',
      quote: {
        serviceItems: [
          { serviceId: 'srv-1', title: 'Corte', priceInCents: 6000, durationInMinutes: 30 },
        ],
        totalPriceInCents: 6000,
        totalDurationInMinutes: 30,
      },
      serverTime: '2026-10-12T10:00:00.000Z',
    };
    const apiError = new ApiError('Orçamento alterado.', 409, errorResponse);

    const norm = normalizeBookingError(apiError);
    expect(norm.code).toBe('QUOTE_CHANGED');
    expect(norm.isQuoteChanged).toBe(true);
    expect(norm.quote?.totalPriceInCents).toBe(6000);
    expect(norm.operationState).toBe('NOT_APPLIED');
  });

  it('409 genérico sem payload de quote NÃO é interpretado como QUOTE_CHANGED', () => {
    const apiError = new ApiError('Conflito geral', 409, { code: 'SLOT_UNAVAILABLE' });
    const norm = normalizeBookingError(apiError);
    expect(norm.code).toBe('SLOT_UNAVAILABLE');
    expect(norm.isQuoteChanged).toBe(false);
  });

  it('BOOKING_VERSION_CONFLICT extrai currentVersion e mensagem coerente', () => {
    const apiError = new ApiError('Conflito de versão', 409, {
      code: 'BOOKING_VERSION_CONFLICT',
      currentVersion: 3,
    });
    const norm = normalizeBookingError(apiError);
    expect(norm.code).toBe('BOOKING_VERSION_CONFLICT');
    expect(norm.currentVersion).toBe(3);
  });

  it('ACTION_DEADLINE_PASSED mapeia prazo expirado', () => {
    const apiError = new ApiError('Prazo expirado', 409, {
      code: 'ACTION_DEADLINE_PASSED',
    });
    const norm = normalizeBookingError(apiError);
    expect(norm.code).toBe('ACTION_DEADLINE_PASSED');
  });

  it('MEMBERSHIP_INACTIVE mapeia vínculo inativo (403)', () => {
    const apiError = new ApiError('Vínculo inativo', 403, {
      code: 'MEMBERSHIP_INACTIVE',
    });
    const norm = normalizeBookingError(apiError);
    expect(norm.code).toBe('MEMBERSHIP_INACTIVE');
  });

  it('IDEMPOTENCY_PAYLOAD_MISMATCH mapeia payload incompatível com a chave', () => {
    const apiError = new ApiError('Payload incompatível', 409, {
      code: 'IDEMPOTENCY_PAYLOAD_MISMATCH',
    });
    const norm = normalizeBookingError(apiError);
    expect(norm.code).toBe('IDEMPOTENCY_PAYLOAD_MISMATCH');
  });

  it('Identifica falha de rede e timeout como incertos', () => {
    const netError = new ApiError('Timeout', 0, null, true);
    const norm = normalizeBookingError(netError);
    expect(norm.isNetworkError).toBe(true);
    expect(norm.code).toBe('NETWORK_OR_TIMEOUT');
  });
});
