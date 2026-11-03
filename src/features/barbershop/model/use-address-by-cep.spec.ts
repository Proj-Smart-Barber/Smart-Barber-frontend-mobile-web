// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAddressByCep } from './use-address-by-cep';
import * as viacepApi from '../api/viacep.api';

describe('useAddressByCep Hook', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.restoreAllMocks();
    viacepApi.clearViaCepCache();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('não dispara consulta enquanto o CEP tiver menos de 8 dígitos', () => {
    const fetchSpy = vi.spyOn(viacepApi, 'fetchViaCep');
    const { result } = renderHook(() => useAddressByCep());

    act(() => {
      result.current.onCepChange('0100');
    });

    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(result.current.status).toBe('idle');
  });

  it('dispara consulta após debounce quando o CEP atinge 8 dígitos válidos', async () => {
    const onAddressResolved = vi.fn();
    vi.spyOn(viacepApi, 'fetchViaCep').mockResolvedValueOnce({
      status: 'success',
      data: {
        cep: '01001000',
        street: 'Praça da Sé',
        neighborhood: 'Sé',
        city: 'São Paulo',
        state: 'SP',
      },
    });

    const { result } = renderHook(() =>
      useAddressByCep({ onAddressResolved, debounceMs: 300 })
    );

    act(() => {
      result.current.onCepChange('01001-000');
    });

    expect(result.current.status).toBe('idle');

    await act(async () => {
      vi.advanceTimersByTime(350);
    });

    expect(result.current.status).toBe('success');
    expect(onAddressResolved).toHaveBeenCalledWith({
      cep: '01001000',
      street: 'Praça da Sé',
      neighborhood: 'Sé',
      city: 'São Paulo',
      state: 'SP',
    });
  });

  it('evita race condition: ignora resposta de requisição antiga se uma nova for disparada', async () => {
    let resolveFirst: any;
    let resolveSecond: any;

    const firstPromise = new Promise<viacepApi.ViaCepLookupResult>((res) => {
      resolveFirst = res;
    });
    const secondPromise = new Promise<viacepApi.ViaCepLookupResult>((res) => {
      resolveSecond = res;
    });

    const fetchSpy = vi
      .spyOn(viacepApi, 'fetchViaCep')
      .mockImplementationOnce(() => firstPromise)
      .mockImplementationOnce(() => secondPromise);

    const onAddressResolved = vi.fn();
    const { result } = renderHook(() => useAddressByCep({ onAddressResolved }));

    // Dispara requisição 1
    act(() => {
      void result.current.lookup('11111111');
    });

    // Dispara requisição 2 logo em seguida
    act(() => {
      void result.current.lookup('22222222');
    });

    expect(fetchSpy).toHaveBeenCalledTimes(2);

    // Resposta 2 resolve primeiro
    await act(async () => {
      resolveSecond({
        status: 'success',
        data: {
          cep: '22222222',
          street: 'Rua Dois',
          neighborhood: 'Bairro Dois',
          city: 'Cidade Dois',
          state: 'RJ',
        },
      });
    });

    expect(onAddressResolved).toHaveBeenCalledTimes(1);
    expect(onAddressResolved).toHaveBeenCalledWith(
      expect.objectContaining({ street: 'Rua Dois' })
    );

    // Resposta 1 resolve tardiamente (deve ser descartada)
    await act(async () => {
      resolveFirst({
        status: 'success',
        data: {
          cep: '11111111',
          street: 'Rua Um',
          neighborhood: 'Bairro Um',
          city: 'Cidade Um',
          state: 'SP',
        },
      });
    });

    // Não deve sobrescrever com Rua Um
    expect(onAddressResolved).toHaveBeenCalledTimes(1);
  });

  it('retry executa a busca do último CEP consultado', async () => {
    const fetchSpy = vi
      .spyOn(viacepApi, 'fetchViaCep')
      .mockResolvedValueOnce({
        status: 'error',
        errorMessage: 'Falha de rede',
      })
      .mockResolvedValueOnce({
        status: 'success',
        data: {
          cep: '01001000',
          street: 'Praça da Sé',
          neighborhood: 'Sé',
          city: 'São Paulo',
          state: 'SP',
        },
      });

    const { result } = renderHook(() => useAddressByCep());

    await act(async () => {
      await result.current.lookup('01001000');
    });

    expect(result.current.status).toBe('error');

    await act(async () => {
      result.current.retry();
    });

    expect(fetchSpy).toHaveBeenCalledTimes(2);
    expect(result.current.status).toBe('success');
  });
});
