import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchViaCep, clearViaCepCache } from './viacep.api';

describe('ViaCEP API Client', () => {
  beforeEach(() => {
    clearViaCepCache();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('retorna invalid_format para CEPs com menos de 8 dígitos sem realizar fetch', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const result = await fetchViaCep('12345');

    expect(result.status).toBe('invalid_format');
    expect(result.errorMessage).toContain('8 dígitos');
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('retorna success e dados mapeados quando o ViaCEP responde com sucesso', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        cep: '01001-000',
        logradouro: 'Praça da Sé',
        complemento: 'lado ímpar',
        bairro: 'Sé',
        localidade: 'São Paulo',
        uf: 'SP',
        ibge: '3550308',
      }),
    } as Response);

    const result = await fetchViaCep('01001-000');

    expect(result.status).toBe('success');
    expect(result.data).toEqual({
      cep: '01001000',
      street: 'Praça da Sé',
      neighborhood: 'Sé',
      city: 'São Paulo',
      state: 'SP',
      ibge: '3550308',
    });
  });

  it('utiliza cache em memória para evitar requisições repetidas ao mesmo CEP', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        cep: '01001-000',
        logradouro: 'Praça da Sé',
        bairro: 'Sé',
        localidade: 'São Paulo',
        uf: 'SP',
      }),
    } as Response);

    await fetchViaCep('01001000');
    await fetchViaCep('01001-000');

    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it('identifica resposta de CEP inexistente (erro: true) com status not_found', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ erro: true }),
    } as Response);

    const result = await fetchViaCep('99999-999');

    expect(result.status).toBe('not_found');
    expect(result.errorMessage).toContain('não encontrado');
  });

  it('lida com HTTP 400 retornando status invalid_format', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({}),
    } as Response);

    const result = await fetchViaCep('00000000');

    expect(result.status).toBe('invalid_format');
  });

  it('trata falha de rede e HTTP 500 retornando status error com orientação de preenchimento manual', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: false,
      status: 503,
      json: async () => ({}),
    } as Response);

    const result = await fetchViaCep('01001000');

    expect(result.status).toBe('error');
    expect(result.errorMessage).toContain('Preencha o endereço manualmente');
  });
});
