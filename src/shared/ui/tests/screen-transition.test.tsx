// @vitest-environment happy-dom
import { afterEach, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook } from '@testing-library/react';
import { Animated } from 'react-native';

let mockReducedMotion = false;

vi.mock('@/shared/theme', () => ({
  motion: { standard: 220 },
  useReducedMotion: () => mockReducedMotion,
}));

import { useScreenTransition } from '../use-screen-transition';

afterEach(() => {
  cleanup();
  mockReducedMotion = false;
  vi.useRealTimers();
  vi.restoreAllMocks();
});

it('recovers opacity to 1 when entry animation is interrupted or page lifecycle events fire', () => {
  const completions: Array<(value: { finished: boolean }) => void> = [];
  vi.spyOn(Animated, 'timing').mockImplementation(() => ({
    start: (callback) => {
      if (callback) completions.push(callback);
    },
    stop: vi.fn(),
    reset: vi.fn(),
  }));

  const { result, rerender } = renderHook(
    ({ route }) => useScreenTransition(route),
    { initialProps: { route: 'explore' } },
  );

  rerender({ route: 'bookings' });
  act(() => {
    completions[0]?.({ finished: false });
    window.dispatchEvent(new Event('pageshow'));
    document.dispatchEvent(new Event('visibilitychange'));
  });

  expect((result.current as any).__getValue()).toBe(1);
});

it('recovers opacity to 1 via fallback timer when animation callback is never invoked', () => {
  vi.useFakeTimers();
  vi.spyOn(Animated, 'timing').mockImplementation(() => ({
    start: () => {
      // Callback nunca disparado
    },
    stop: vi.fn(),
    reset: vi.fn(),
  }));

  const { result, rerender } = renderHook(
    ({ route }) => useScreenTransition(route),
    { initialProps: { route: 'explore' } },
  );

  rerender({ route: 'bookings' });
  expect((result.current as any).__getValue()).toBe(0);

  act(() => {
    vi.advanceTimersByTime(400);
  });

  expect((result.current as any).__getValue()).toBe(1);
});

it('updates previous selectionKey under reducedMotion so disabling reducedMotion later does not trigger a phantom fade', () => {
  mockReducedMotion = true;
  const timingSpy = vi.spyOn(Animated, 'timing');

  const { result, rerender } = renderHook(
    ({ route }) => useScreenTransition(route),
    { initialProps: { route: 'explore' } },
  );

  rerender({ route: 'bookings' });
  expect((result.current as any).__getValue()).toBe(1);
  expect(timingSpy).not.toHaveBeenCalled();

  mockReducedMotion = false;
  rerender({ route: 'bookings' });

  expect((result.current as any).__getValue()).toBe(1);
  expect(timingSpy).not.toHaveBeenCalled();
});
