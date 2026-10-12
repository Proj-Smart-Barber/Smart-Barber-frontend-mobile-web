import { describe, it, expect, vi, beforeEach } from 'vitest';
import { findOwnAttempt, closeOwnAttempt } from '../operation-attempt.api';
import { httpClient, ApiError } from '@/shared/api';

describe('R1 — operationAttemptApi', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('findOwnAttempt normaliza retorno APPLIED com recurso', async () => {
    vi.spyOn(httpClient, 'get').mockResolvedValueOnce({
      state: 'APPLIED',
      operation: 'CREATE_BOOKING',
      resource: {
        kind: 'BOOKING',
        id: 'booking-1',
        version: 1,
        data: {
          booking: { id: 'booking-1', status: 'CONFIRMED' },
          serverTime: '2026-10-12T10:00:00.000Z',
        },
      },
      accessChanged: false,
      serverTime: '2026-10-12T10:00:00.000Z',
    });

    const res = await findOwnAttempt('req-1');
    expect(res.state).toBe('APPLIED');
    expect(res.operation).toBe('CREATE_BOOKING');
    expect(res.resource?.kind).toBe('BOOKING');
    expect(res.resource?.id).toBe('booking-1');
  });

  it('findOwnAttempt trata 404 como estado UNKNOWN com relógio atual sem falha falsa', async () => {
    vi.spyOn(httpClient, 'get').mockRejectedValueOnce(
      new ApiError('Não encontrada', 404, { state: 'UNKNOWN' })
    );

    const res = await findOwnAttempt('req-404');
    expect(res.state).toBe('UNKNOWN');
    expect(res.resource).toBeUndefined();
  });

  it('closeOwnAttempt executa POST /close e retorna resultado durável', async () => {
    vi.spyOn(httpClient, 'post').mockResolvedValueOnce({
      state: 'NOT_APPLIED',
      operation: 'CLOSED',
      serverTime: '2026-10-12T10:05:00.000Z',
    });

    const res = await closeOwnAttempt('req-close');
    expect(res.state).toBe('NOT_APPLIED');
    expect(res.operation).toBe('CLOSED');
  });
});
