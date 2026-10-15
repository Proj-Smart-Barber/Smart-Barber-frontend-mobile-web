import { describe, it, expect } from 'vitest';
import { demoFormSchema, validateDemoForm, DemoFormData } from '../model/demo-form';

describe('Demo Form Schema & Validation', () => {
  const validData: DemoFormData = {
    nome: 'Carlos Barbeiro',
    barbearia: 'Barbearia Navalha de Ouro',
    cidadeUf: 'Curitiba / PR',
    profissionais: '2-5',
    necessidade: 'Melhorar a organização de horários',
    configuracao: 'Equipe',
  };

  it('valida dados completos e corretos com sucesso', () => {
    const result = demoFormSchema.safeParse(validData);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.nome).toBe('Carlos Barbeiro');
      expect(result.data.barbearia).toBe('Barbearia Navalha de Ouro');
      expect(result.data.profissionais).toBe('2-5');
      expect(result.data.configuracao).toBe('Equipe');
    }
  });

  it('permite envio sem campos opcionais (necessidade e configuracao vazias)', () => {
    const minimalData = {
      nome: 'João Silva',
      barbearia: 'Barbearia do João',
      cidadeUf: 'São Paulo - SP',
      profissionais: '1',
    };
    const result = validateDemoForm(minimalData);
    expect(result.success).toBe(true);
    expect(result.data?.nome).toBe('João Silva');
    expect(result.errors).toBeUndefined();
  });

  it('rejeita nome menor que 2 caracteres ou maior que 80 caracteres', () => {
    const shortName = { ...validData, nome: 'A' };
    const longName = { ...validData, nome: 'A'.repeat(81) };

    const resShort = validateDemoForm(shortName);
    expect(resShort.success).toBe(false);
    expect(resShort.errors?.nome).toBe('O nome deve ter no mínimo 2 caracteres');
    expect(resShort.firstErrorField).toBe('nome');

    const resLong = validateDemoForm(longName);
    expect(resLong.success).toBe(false);
    expect(resLong.errors?.nome).toBe('O nome deve ter no máximo 80 caracteres');
  });

  it('rejeita barbearia menor que 2 caracteres ou maior que 100 caracteres', () => {
    const shortShop = { ...validData, barbearia: 'B' };
    const longShop = { ...validData, barbearia: 'B'.repeat(101) };

    const resShort = validateDemoForm(shortShop);
    expect(resShort.success).toBe(false);
    expect(resShort.errors?.barbearia).toBe('O nome da barbearia deve ter no mínimo 2 caracteres');

    const resLong = validateDemoForm(longShop);
    expect(resLong.success).toBe(false);
    expect(resLong.errors?.barbearia).toBe('O nome da barbearia deve ter no máximo 100 caracteres');
  });

  it('rejeita cidadeUf vazia ou maior que 100 caracteres', () => {
    const emptyCity = { ...validData, cidadeUf: '' };
    const longCity = { ...validData, cidadeUf: 'C'.repeat(101) };

    const resEmpty = validateDemoForm(emptyCity);
    expect(resEmpty.success).toBe(false);
    expect(resEmpty.errors?.cidadeUf).toBe('Informe a cidade e o estado');

    const resLong = validateDemoForm(longCity);
    expect(resLong.success).toBe(false);
    expect(resLong.errors?.cidadeUf).toBe('A localização deve ter no máximo 100 caracteres');
  });

  it('rejeita valores inválidos de faixa de profissionais', () => {
    const invalidRange = { ...validData, profissionais: '50+' };
    const res = validateDemoForm(invalidRange);
    expect(res.success).toBe(false);
    expect(res.errors?.profissionais).toBeDefined();
  });

  it('rejeita necessidade superior a 240 caracteres', () => {
    const longNeed = { ...validData, necessidade: 'N'.repeat(241) };
    const res = validateDemoForm(longNeed);
    expect(res.success).toBe(false);
    expect(res.errors?.necessidade).toBe('A descrição deve ter no máximo 240 caracteres');
  });

  it('indica firstErrorField ordenado conforme prioridade do formulário', () => {
    const emptyForm = {
      nome: '',
      barbearia: '',
      cidadeUf: '',
      profissionais: undefined,
    };
    const res = validateDemoForm(emptyForm);
    expect(res.success).toBe(false);
    expect(res.firstErrorField).toBe('nome');
  });
});
