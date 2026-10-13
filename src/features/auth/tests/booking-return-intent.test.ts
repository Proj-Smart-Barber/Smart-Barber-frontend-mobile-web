import { describe, it, expect, beforeEach } from 'vitest';
import {
  setBookingReturnIntent,
  getBookingReturnIntent,
  clearBookingReturnIntent,
} from '../model/booking-return-intent';

describe('R2 — booking-return-intent', () => {
  beforeEach(() => {
    clearBookingReturnIntent();
  });

  it('registra e recupera intenção de retorno válida para rota pública de agendamento', () => {
    setBookingReturnIntent({ shopId: 'shop-abc-123', draftId: 'draft-99' });

    const intent = getBookingReturnIntent();
    expect(intent).not.toBeNull();
    expect(intent?.shopId).toBe('shop-abc-123');
    expect(intent?.draftId).toBe('draft-99');
    expect(intent?.returnPath).toBe('/barbershops/shop-abc-123/book');
  });

  it('rejeita shopId com caracteres maliciosos ou tentativas de traversal', () => {
    expect(() => setBookingReturnIntent({ shopId: '../admin' })).toThrow(
      'Identificador de barbearia inválido.'
    );
    expect(() => setBookingReturnIntent({ shopId: 'https://evil.com' })).toThrow(
      'Identificador de barbearia inválido.'
    );
    expect(() => setBookingReturnIntent({ shopId: '<script>alert(1)</script>' })).toThrow(
      'Identificador de barbearia inválido.'
    );
  });

  it('clearBookingReturnIntent limpa intenção armazenada', () => {
    setBookingReturnIntent({ shopId: 'shop-xyz' });
    expect(getBookingReturnIntent()).not.toBeNull();

    clearBookingReturnIntent();
    expect(getBookingReturnIntent()).toBeNull();
  });
});
