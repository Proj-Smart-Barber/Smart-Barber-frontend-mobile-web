import { describe, expect, it } from 'vitest';
import { getAdaptiveSize } from '../breakpoints';
import { createComponentTokens } from '../components/tokens';
import { darkColors, lightColors } from '../semantic/colors';

describe('Design System V2 tokens', () => {
  it('separa semanticamente marca, erro e ação destrutiva', () => {
    expect(darkColors.brand.primary).not.toBe(darkColors.feedback.error);
    expect(darkColors.brand.primary).not.toBe(darkColors.feedback.destructive);
    expect(lightColors.feedback.error).not.toBe(lightColors.feedback.destructive);
  });

  it('deriva tokens de componente exclusivamente de semânticos', () => {
    const tokens = createComponentTokens(darkColors);
    expect(tokens.button.primary.background).toBe(darkColors.brand.primary);
    expect(tokens.input.errorBorder).toBe(darkColors.border.error);
  });

  it('classifica os breakpoints Compact, Medium e Expanded', () => {
    expect(getAdaptiveSize(599)).toBe('compact');
    expect(getAdaptiveSize(600)).toBe('medium');
    expect(getAdaptiveSize(839)).toBe('medium');
    expect(getAdaptiveSize(840)).toBe('expanded');
  });

  it('fornece foregrounds de status de alto contraste para ambos os temas', () => {
    expect(lightColors.feedback.successForeground).toBe('#047857');
    expect(lightColors.feedback.warningForeground).toBe('#92400E');
    expect(lightColors.feedback.errorForeground).toBe('#B91C1C');
    expect(lightColors.feedback.infoForeground).toBe('#1D4ED8');
    expect(darkColors.feedback.successForeground).toBeDefined();
    expect(darkColors.feedback.errorForeground).toBeDefined();
  });
});
