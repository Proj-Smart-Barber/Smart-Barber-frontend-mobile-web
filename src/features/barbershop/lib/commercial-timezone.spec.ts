import { describe, it, expect } from 'vitest';
import { resolveCommercialTimezone } from './commercial-timezone';

describe('Commercial Timezone Resolver', () => {
  it('resolve America/Sao_Paulo para estados das regiões Sudeste, Sul, Nordeste, GO e DF', () => {
    expect(resolveCommercialTimezone({ state: 'SP', city: 'São Paulo' })).toBe('America/Sao_Paulo');
    expect(resolveCommercialTimezone({ state: 'RJ', city: 'Rio de Janeiro' })).toBe('America/Sao_Paulo');
    expect(resolveCommercialTimezone({ state: 'MG', city: 'Belo Horizonte' })).toBe('America/Sao_Paulo');
    expect(resolveCommercialTimezone({ state: 'PR', city: 'Curitiba' })).toBe('America/Sao_Paulo');
    expect(resolveCommercialTimezone({ state: 'BA', city: 'Salvador' })).toBe('America/Sao_Paulo');
    expect(resolveCommercialTimezone({ state: 'DF', city: 'Brasília' })).toBe('America/Sao_Paulo');
  });

  it('resolve America/Noronha para Fernando de Noronha (PE) por cidade ou CEP', () => {
    expect(
      resolveCommercialTimezone({ state: 'PE', city: 'Fernando de Noronha', cep: '53990000' })
    ).toBe('America/Noronha');
    expect(
      resolveCommercialTimezone({ state: 'PE', city: 'Ilha de Fernando de Noronha' })
    ).toBe('America/Noronha');
    expect(
      resolveCommercialTimezone({ state: 'PE', city: 'Recife' })
    ).toBe('America/Sao_Paulo');
  });

  it('resolve America/Rio_Branco para o estado do Acre (AC)', () => {
    expect(resolveCommercialTimezone({ state: 'AC', city: 'Rio Branco' })).toBe('America/Rio_Branco');
    expect(resolveCommercialTimezone({ state: 'Acre', city: 'Cruzeiro do Sul' })).toBe('America/Rio_Branco');
  });

  it('resolve America/Rio_Branco para os 13 municípios do extremo oeste do Amazonas (UTC-5)', () => {
    expect(resolveCommercialTimezone({ state: 'AM', city: 'Tabatinga' })).toBe('America/Rio_Branco');
    expect(resolveCommercialTimezone({ state: 'AM', city: 'Eirunepé' })).toBe('America/Rio_Branco');
    expect(resolveCommercialTimezone({ state: 'AM', city: 'Lábrea' })).toBe('America/Rio_Branco');
    expect(resolveCommercialTimezone({ state: 'AM', city: 'Benjamin Constant' })).toBe('America/Rio_Branco');
  });

  it('resolve America/Manaus para a maioria do Amazonas (ex: Manaus, Parintins)', () => {
    expect(resolveCommercialTimezone({ state: 'AM', city: 'Manaus' })).toBe('America/Manaus');
    expect(resolveCommercialTimezone({ state: 'AM', city: 'Parintins' })).toBe('America/Manaus');
  });

  it('resolve fusos UTC-4 para MT, MS, RO e RR', () => {
    expect(resolveCommercialTimezone({ state: 'MT', city: 'Cuiabá' })).toBe('America/Cuiaba');
    expect(resolveCommercialTimezone({ state: 'MS', city: 'Campo Grande' })).toBe('America/Campo_Grande');
    expect(resolveCommercialTimezone({ state: 'RO', city: 'Porto Velho' })).toBe('America/Porto_Velho');
    expect(resolveCommercialTimezone({ state: 'RR', city: 'Boa Vista' })).toBe('America/Boa_Vista');
  });

  it('retorna America/Sao_Paulo como padrão defensivo para valores indefinidos', () => {
    expect(resolveCommercialTimezone({})).toBe('America/Sao_Paulo');
  });
});
