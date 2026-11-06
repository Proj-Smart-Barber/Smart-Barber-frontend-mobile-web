// @vitest-environment happy-dom
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useLoadingFeedback } from '../use-loading-feedback';

describe('useLoadingFeedback', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('inicia inativo com showIndicator e longWait falsos', () => {
    const { result } = renderHook(() =>
      useLoadingFeedback({ operationKey: 'test-1', active: false, phase: 'initial' })
    );

    expect(result.current.showIndicator).toBe(false);
    expect(result.current.longWait).toBe(false);
  });

  it('para fase "initial", ativa showIndicator imediatamente (0ms) e longWait após 8000ms', () => {
    const { result } = renderHook(() =>
      useLoadingFeedback({ operationKey: 'test-initial', active: true, phase: 'initial' })
    );

    // Imediato na carga inicial
    expect(result.current.showIndicator).toBe(true);
    expect(result.current.longWait).toBe(false);

    // Avança 7999ms
    act(() => {
      vi.advanceTimersByTime(7999);
    });
    expect(result.current.longWait).toBe(false);

    // Completa 8000ms
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current.longWait).toBe(true);
  });

  it('para fase "refresh", aguarda 200ms para showIndicator e 8000ms para longWait', () => {
    const { result } = renderHook(() =>
      useLoadingFeedback({ operationKey: 'test-refresh', active: true, phase: 'refresh' })
    );

    // Antes de 200ms: indicador transitório oculto
    expect(result.current.showIndicator).toBe(false);
    expect(result.current.longWait).toBe(false);

    act(() => {
      vi.advanceTimersByTime(199);
    });
    expect(result.current.showIndicator).toBe(false);

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current.showIndicator).toBe(true);
    expect(result.current.longWait).toBe(false);

    // Avança até 8000ms
    act(() => {
      vi.advanceTimersByTime(7800);
    });
    expect(result.current.longWait).toBe(true);
  });

  it('para fase "next-page" e "media", também aplica atraso visual transitório de 200ms', () => {
    const { result: rNext } = renderHook(() =>
      useLoadingFeedback({ operationKey: 'test-next', active: true, phase: 'next-page' })
    );
    expect(rNext.current.showIndicator).toBe(false);
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(rNext.current.showIndicator).toBe(true);

    const { result: rMedia } = renderHook(() =>
      useLoadingFeedback({ operationKey: 'test-media', active: true, phase: 'media' })
    );
    expect(rMedia.current.showIndicator).toBe(false);
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(rMedia.current.showIndicator).toBe(true);
  });

  it('cancela timer de 200ms se a operação terminar antes do prazo (sem falso indicador)', () => {
    let active = true;
    const { result, rerender } = renderHook(
      ({ actState }) =>
        useLoadingFeedback({ operationKey: 'test-quick', active: actState, phase: 'refresh' }),
      { initialProps: { actState: active } }
    );

    expect(result.current.showIndicator).toBe(false);

    act(() => {
      vi.advanceTimersByTime(120);
    });
    expect(result.current.showIndicator).toBe(false);

    // Resposta rápida recebida aos 120ms
    rerender({ actState: false });

    // Avança mais tempo
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(result.current.showIndicator).toBe(false);
    expect(result.current.longWait).toBe(false);
  });

  it('exclui fase "permission" do cronômetro de 8s de espera longa', () => {
    const { result } = renderHook(() =>
      useLoadingFeedback({ operationKey: 'test-perm', active: true, phase: 'permission' })
    );

    expect(result.current.showIndicator).toBe(true);
    expect(result.current.longWait).toBe(false);

    // Passam 10 segundos
    act(() => {
      vi.advanceTimersByTime(10000);
    });
    // longWait permanece false pois a espera depende da decisão do usuário
    expect(result.current.longWait).toBe(false);
  });

  it('reinicia timers quando a operationKey muda com active=true', () => {
    let opKey = 'op-1';
    const { result, rerender } = renderHook(
      ({ key }) => useLoadingFeedback({ operationKey: key, active: true, phase: 'initial' }),
      { initialProps: { key: opKey } }
    );

    // Passam 5000ms
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(result.current.longWait).toBe(false);

    // Muda a operação antes dos 8000ms
    rerender({ key: 'op-2' });

    // Passam mais 4000ms (total decorrido 9000ms, mas op-2 só rodou 4000ms)
    act(() => {
      vi.advanceTimersByTime(4000);
    });
    expect(result.current.longWait).toBe(false);

    // Completa 8000ms para op-2
    act(() => {
      vi.advanceTimersByTime(4000);
    });
    expect(result.current.longWait).toBe(true);
  });

  it('limpa estado e timers ao desmontar', () => {
    const { unmount } = renderHook(() =>
      useLoadingFeedback({ operationKey: 'test-unmount', active: true, phase: 'refresh' })
    );

    unmount();
    // Não deve lançar erro ou vazar timers
    act(() => {
      vi.advanceTimersByTime(10000);
    });
  });
});
