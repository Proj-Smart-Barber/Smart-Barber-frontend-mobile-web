import { describe, it, expect } from 'vitest';
import { buildCanonicalLocation } from './address-formatter';

describe('Address Formatter', () => {
  it('monta endereço canônico completo com todos os campos estruturados', () => {
    const canonical = buildCanonicalLocation({
      street: 'Av. Paulista',
      number: '1000',
      complement: 'Bela Vista',
      neighborhood: 'Cerqueira César',
      city: 'São Paulo',
      state: 'SP',
      cep: '01310100',
    });

    expect(canonical).toBe(
      'Av. Paulista, 1000, Bela Vista, Cerqueira César, São Paulo - SP, CEP 01310-100'
    );
  });

  it('formata "s/n" quando withoutNumber for verdadeiro mesmo se número foi digitado', () => {
    const canonical = buildCanonicalLocation({
      street: 'Rodovia dos Imigrantes',
      withoutNumber: true,
      city: 'São Bernardo do Campo',
      state: 'sp',
      cep: '09845000',
    });

    expect(canonical).toBe(
      'Rodovia dos Imigrantes, s/n, São Bernardo do Campo - SP, CEP 09845-000'
    );
  });

  it('omite campos opcionais vazios sem produzir vírgulas duplicadas', () => {
    const canonical = buildCanonicalLocation({
      street: 'Rua das Flores',
      number: '42',
      city: 'Curitiba',
      state: 'PR',
    });

    expect(canonical).toBe('Rua das Flores, 42, Curitiba - PR');
    expect(canonical).not.toContain(', ,');
  });

  it('lida com CEP genérico de município sem rua ou número', () => {
    const canonical = buildCanonicalLocation({
      street: '',
      city: 'Fernando de Noronha',
      state: 'PE',
      cep: '53990000',
    });

    expect(canonical).toBe('Fernando de Noronha - PE, CEP 53990-000');
  });
});
