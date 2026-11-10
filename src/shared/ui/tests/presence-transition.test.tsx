// @vitest-environment happy-dom
import { afterEach, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook } from '@testing-library/react';
import { Animated } from 'react-native';
import { usePresenceTransition } from '../use-presence-transition';

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

it('keeps a closing surface mounted until its exit completes', () => {
  const completions: Array<(value: { finished: boolean }) => void> = [];
  vi.spyOn(Animated, 'timing').mockImplementation(() => ({
    start: (callback) => {
      if (callback) completions.push(callback);
    },
    stop: vi.fn(),
    reset: vi.fn(),
  }));
  const { result, rerender } = renderHook(
    ({ open }) =>
      usePresenceTransition(open, {
        enterDuration: 300,
        exitDuration: 220,
        reducedMotion: false,
      }),
    { initialProps: { open: true } },
  );
  rerender({ open: false });
  expect(result.current.mounted).toBe(true);
  act(() => completions[1]({ finished: true }));
  expect(result.current.mounted).toBe(false);
});

it('ignores an obsolete exit completion after reopening', () => {
  const completions: Array<(value: { finished: boolean }) => void> = [];
  vi.spyOn(Animated, 'timing').mockImplementation(() => ({
    start: (callback) => {
      if (callback) completions.push(callback);
    },
    stop: vi.fn(),
    reset: vi.fn(),
  }));
  const { result, rerender } = renderHook(
    ({ open }) =>
      usePresenceTransition(open, {
        enterDuration: 300,
        exitDuration: 220,
        reducedMotion: false,
      }),
    { initialProps: { open: true } },
  );
  rerender({ open: false });
  rerender({ open: true });
  act(() => completions[1]({ finished: true }));
  expect(result.current.mounted).toBe(true);
});

it('closes immediately with reduced motion and no decorative animation', () => {
  const timing = vi.spyOn(Animated, 'timing');
  const { result, rerender } = renderHook(
    ({ open }) =>
      usePresenceTransition(open, {
        enterDuration: 300,
        exitDuration: 220,
        reducedMotion: true,
      }),
    { initialProps: { open: true } },
  );
  rerender({ open: false });
  expect(result.current.mounted).toBe(false);
  expect(timing).not.toHaveBeenCalled();
});

it('converges to unmounted and closed when exit animation is cancelled without a successor transition', () => {
  const completions: Array<(value: { finished: boolean }) => void> = [];
  const onExited = vi.fn();
  vi.spyOn(Animated, 'timing').mockImplementation(() => ({
    start: (callback) => {
      if (callback) completions.push(callback);
    },
    stop: vi.fn(),
    reset: vi.fn(),
  }));

  const { result, rerender } = renderHook(
    ({ open }) =>
      usePresenceTransition(open, {
        enterDuration: 300,
        exitDuration: 220,
        reducedMotion: false,
        onExited,
      }),
    { initialProps: { open: true } },
  );

  act(() => completions[0]({ finished: true }));
  rerender({ open: false });
  act(() => completions[1]({ finished: false }));

  expect(result.current.mounted).toBe(false);
  expect(result.current.phase).toBe('closed');
  expect((result.current.progress as any).__getValue()).toBe(0);
  expect(onExited).toHaveBeenCalledTimes(1);
});

it('finalizes closing via bounded fallback timer when animation completion callback is lost', () => {
  vi.useFakeTimers();
  const onExited = vi.fn();
  vi.spyOn(Animated, 'timing').mockImplementation(() => ({
    start: () => {
      // Simula perda de callback de animação (nunca invocado)
    },
    stop: vi.fn(),
    reset: vi.fn(),
  }));

  const { result, rerender } = renderHook(
    ({ open }) =>
      usePresenceTransition(open, {
        enterDuration: 300,
        exitDuration: 220,
        reducedMotion: false,
        onExited,
      }),
    { initialProps: { open: true } },
  );

  rerender({ open: false });
  expect(result.current.mounted).toBe(true);
  expect(result.current.phase).toBe('exiting');

  act(() => {
    vi.advanceTimersByTime(400);
  });

  expect(result.current.mounted).toBe(false);
  expect(result.current.phase).toBe('closed');
  expect((result.current.progress as any).__getValue()).toBe(0);
  expect(onExited).toHaveBeenCalledTimes(1);
});

it('does not allow an obsolete fallback timer to close a reopened surface', () => {
  vi.useFakeTimers();
  const completions: Array<(value: { finished: boolean }) => void> = [];
  vi.spyOn(Animated, 'timing').mockImplementation(() => ({
    start: (callback) => {
      if (callback) completions.push(callback);
    },
    stop: vi.fn(),
    reset: vi.fn(),
  }));

  const { result, rerender } = renderHook(
    ({ open }) =>
      usePresenceTransition(open, {
        enterDuration: 300,
        exitDuration: 220,
        reducedMotion: false,
      }),
    { initialProps: { open: true } },
  );

  rerender({ open: false });
  act(() => {
    vi.advanceTimersByTime(100);
  });
  rerender({ open: true });

  act(() => {
    vi.advanceTimersByTime(500);
  });

  expect(result.current.mounted).toBe(true);
  expect(result.current.phase).toBe('open');
  expect((result.current.progress as any).__getValue()).toBe(1);
});

it('invalidates previous actor surface immediately when scopeKey changes during exit', () => {
  const completions: Array<(value: { finished: boolean }) => void> = [];
  vi.spyOn(Animated, 'timing').mockImplementation(() => ({
    start: (callback) => {
      if (callback) completions.push(callback);
    },
    stop: vi.fn(),
    reset: vi.fn(),
  }));

  const { result, rerender } = renderHook(
    ({ open, scopeKey }) =>
      usePresenceTransition(open, {
        enterDuration: 300,
        exitDuration: 220,
        reducedMotion: false,
        scopeKey,
      }),
    { initialProps: { open: true, scopeKey: 'actor-1' } },
  );

  rerender({ open: false, scopeKey: 'actor-2' });

  expect(result.current.mounted).toBe(false);
  expect(result.current.phase).toBe('closed');
  expect((result.current.progress as any).__getValue()).toBe(0);
});

