import { describe, it, expect } from 'vitest';
import { getVisibleMediaIndex } from '../lib/gallery-media-index';

describe('getVisibleMediaIndex', () => {
  it('retorna 0 para contagem menor ou igual a 1', () => {
    expect(getVisibleMediaIndex(390, 390, 1)).toBe(0);
    expect(getVisibleMediaIndex(390, 390, 0)).toBe(0);
  });

  it('retorna 0 para larguras inválidas ou não finitas', () => {
    expect(getVisibleMediaIndex(390, 0, 5)).toBe(0);
    expect(getVisibleMediaIndex(390, -100, 5)).toBe(0);
    expect(getVisibleMediaIndex(390, NaN, 5)).toBe(0);
    expect(getVisibleMediaIndex(NaN, 390, 5)).toBe(0);
  });

  it('calcula o índice correto arredondado para páginas consecutivas', () => {
    expect(getVisibleMediaIndex(0, 390, 4)).toBe(0);
    expect(getVisibleMediaIndex(390, 390, 4)).toBe(1);
    expect(getVisibleMediaIndex(780, 390, 4)).toBe(2);
    expect(getVisibleMediaIndex(1170, 390, 4)).toBe(3);
  });

  it('arredonda corretamente em deslocamentos parciais', () => {
    // Menos de meia página -> permanece no índice 0
    expect(getVisibleMediaIndex(150, 390, 4)).toBe(0);
    // Mais de meia página -> avança para índice 1
    expect(getVisibleMediaIndex(200, 390, 4)).toBe(1);
    // Retorno de gesto: de 390 para 250 -> índice 1; para 180 -> índice 0
    expect(getVisibleMediaIndex(250, 390, 4)).toBe(1);
    expect(getVisibleMediaIndex(180, 390, 4)).toBe(0);
  });

  it('restringe aos limites válidos (clamp entre 0 e mediaCount - 1)', () => {
    expect(getVisibleMediaIndex(-150, 390, 3)).toBe(0);
    expect(getVisibleMediaIndex(2000, 390, 3)).toBe(2);
  });
});
