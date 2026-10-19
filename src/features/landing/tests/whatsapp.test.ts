import { describe, it, expect } from 'vitest';
import {
  buildWhatsAppMessage,
  buildWhatsAppUrl,
  sanitizeWhatsAppNumber,
} from '../lib/whatsapp';
import { DemoFormData } from '../model/demo-form';

describe('WhatsApp Message Builder & URL Encoder', () => {
  const baseData: DemoFormData = {
    nome: 'José & André Barbeiros + Cia',
    barbearia: 'Navalha & Tesoura de Ouro',
    cidadeUf: 'São Paulo / SP',
    profissionais: '6-10',
  };

  it('sanitiza números removendo caracteres não numéricos', () => {
    expect(sanitizeWhatsAppNumber('+55 (11) 98765-4321')).toBe('5511987654321');
    expect(sanitizeWhatsAppNumber('55 11 99999-9999')).toBe('5511999999999');
    expect(sanitizeWhatsAppNumber('5511999999999')).toBe('5511999999999');
  });

  it('constrói a mensagem com quebras de linha normalizadas e omite opcionais vazios', () => {
    const message = buildWhatsAppMessage(baseData);
    expect(message).toBe(
      'Olá! Quero conhecer o Smart Barber e solicitar uma demonstração.\n\n' +
      'Nome: José & André Barbeiros + Cia\n' +
      'Barbearia: Navalha & Tesoura de Ouro\n' +
      'Cidade/UF: São Paulo / SP\n' +
      'Profissionais: 6-10'
    );
    expect(message).not.toContain('Principal necessidade:');
    expect(message).not.toContain('Configuração de interesse:');
  });

  it('inclui necessidade e configuracao quando fornecidas', () => {
    const fullData: DemoFormData = {
      ...baseData,
      necessidade: 'Quero sincronizar 8 barbeiros comissionados',
      configuracao: 'Equipe',
    };
    const message = buildWhatsAppMessage(fullData);
    expect(message).toContain('Principal necessidade: Quero sincronizar 8 barbeiros comissionados');
    expect(message).toContain('Configuração de interesse: Equipe');
  });

  it('aplica encodeURIComponent uma única vez sobre o texto completo', () => {
    const fullData: DemoFormData = {
      ...baseData,
      necessidade: 'Corte & Barba + Sobrancelha',
      configuracao: 'Equipe',
    };
    const rawMessage = buildWhatsAppMessage(fullData);
    const url = buildWhatsAppUrl('5511999999999', fullData);

    // Deve começar com o prefixo oficial wa.me
    expect(url.startsWith('https://wa.me/5511999999999?text=')).toBe(true);

    // O texto deve ser decodificável exatamente de volta para a mensagem original em um único decodeURIComponent
    const urlTextParam = url.replace('https://wa.me/5511999999999?text=', '');
    expect(decodeURIComponent(urlTextParam)).toBe(rawMessage);

    // Não pode conter dupla codificação (ex: %2520 ou %2526)
    expect(urlTextParam).not.toContain('%25');

    // Caracteres especiais como & e + devem estar codificados
    expect(urlTextParam).toContain('%26'); // &
    expect(urlTextParam).toContain('%2B'); // +
    expect(urlTextParam).toContain('%C3%A9'); // é de José
  });
});
