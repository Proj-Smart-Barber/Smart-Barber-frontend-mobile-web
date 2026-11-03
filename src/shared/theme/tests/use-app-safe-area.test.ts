import { describe, expect, it, vi } from 'vitest';

vi.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

import { clampInsets } from '../use-app-safe-area';

describe('use-app-safe-area clampInsets', () => {
  it('limita insets.bottom inflado por bug de overflow no WebKit para 34px', () => {
    const inflatedInsets = { top: 48, bottom: 184, left: 0, right: 0 };
    const clamped = clampInsets(inflatedInsets, true, true, 844);

    expect(clamped.bottom).toBe(34);
    expect(clamped.top).toBe(48);
  });

  it('aplica fallback de safe area top e bottom no iOS PWA standalone quando insets vierem zerados', () => {
    const zeroInsets = { top: 0, bottom: 0, left: 0, right: 0 };
    const clamped = clampInsets(zeroInsets, true, true, 852); // iPhone 15 Pro com Dynamic Island

    expect(clamped.top).toBe(48);
    expect(clamped.bottom).toBe(34);
  });

  it('preserva insets medidos reais da Dynamic Island quando acima do piso', () => {
    const dynamicIslandInsets = { top: 54, bottom: 34, left: 0, right: 0 };
    const clamped = clampInsets(dynamicIslandInsets, true, true, 852);

    expect(clamped.top).toBe(54);
    expect(clamped.bottom).toBe(34);
  });

  it('usa piso reduzido para iPhone SE (sem notch) em modo standalone', () => {
    const zeroInsets = { top: 0, bottom: 0, left: 0, right: 0 };
    const clamped = clampInsets(zeroInsets, true, true, 667); // iPhone SE

    expect(clamped.top).toBe(20);
    expect(clamped.bottom).toBe(0);
  });

  it('limita insets.bottom em navegadores desktop e Android para evitar espaçamento excessivo', () => {
    const weirdDesktopInsets = { top: 0, bottom: 120, left: 0, right: 0 };
    const clamped = clampInsets(weirdDesktopInsets, false, false, 1080);

    expect(clamped.bottom).toBe(34);
    expect(clamped.top).toBe(0);
  });

  it('preserva insets legítimos em Android / desktop normal', () => {
    const normalInsets = { top: 0, bottom: 0, left: 0, right: 0 };
    const clamped = clampInsets(normalInsets, false, false, 1080);

    expect(clamped.top).toBe(0);
    expect(clamped.bottom).toBe(0);
  });
});
