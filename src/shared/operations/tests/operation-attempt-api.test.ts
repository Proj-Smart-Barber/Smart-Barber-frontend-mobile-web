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

  it('close com {} ou estado desconhecido nao retorna NOT_APPLIED e trata como UNKNOWN', async () => {
    vi.spyOn(httpClient, 'post').mockResolvedValueOnce({});

    const resEmpty = await closeOwnAttempt('req-empty');
    expect(resEmpty.state).not.toBe('NOT_APPLIED');
    expect(resEmpty.state).toBe('UNKNOWN');

    vi.spyOn(httpClient, 'post').mockResolvedValueOnce({
      state: 'SOMETHING_RANDOM',
      serverTime: '2026-10-12T10:00:00.000Z',
    });

    const resInvalid = await closeOwnAttempt('req-invalid');
    expect(resInvalid.state).not.toBe('NOT_APPLIED');
    expect(resInvalid.state).toBe('UNKNOWN');
  });

  it('404 e respostas sem serverTime nao inventam relogio local autoritativo', async () => {
    vi.spyOn(httpClient, 'get').mockRejectedValueOnce(
      new ApiError('Não encontrada', 404, { state: 'UNKNOWN' })
    );

    const res404 = await findOwnAttempt('req-404');
    expect(res404.state).toBe('UNKNOWN');
    expect(res404.serverTime).toBeUndefined();

    vi.spyOn(httpClient, 'post').mockResolvedValueOnce({
      state: 'NOT_APPLIED',
      operation: 'CLOSED',
    });

    const resNoTime = await closeOwnAttempt('req-no-time');
    expect(resNoTime.serverTime).toBeUndefined();
  });
});

