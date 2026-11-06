import { useEffect, useState } from 'react';

export type LoadingPhase =
  | 'initial'
  | 'refresh'
  | 'next-page'
  | 'mutation'
  | 'locating'
  | 'media'
  | 'permission';

export interface LoadingFeedbackInput {
  operationKey: string;
  active: boolean;
  phase: LoadingPhase;
}

export interface LoadingFeedbackResult {
  showIndicator: boolean;
  longWait: boolean;
}

/**
 * useLoadingFeedback
 * 
 * Contrato de temporização honesto para feedback de carregamento:
 * - 200ms de atraso visual transitório apenas para refresh, next-page e media (evita flicker se resolver rápido).
 * - Feedback imediato (0ms) para initial, mutation, locating e permission.
 * - 8s de espera contínua sinaliza lentidão (longWait = true), exceto na fase permission (que aguarda o usuário).
 * - Timers limpos imediatamente ao inativar, trocar de operationKey ou desmontar.
 */
export function useLoadingFeedback({
  operationKey,
  active,
  phase,
}: LoadingFeedbackInput): LoadingFeedbackResult {
  const isDelayedPhase = phase === 'refresh' || phase === 'next-page' || phase === 'media';

  const [showIndicator, setShowIndicator] = useState(() => (active ? !isDelayedPhase : false));
  const [longWait, setLongWait] = useState(false);

  useEffect(() => {
    if (!active) {
      setShowIndicator(false);
      setLongWait(false);
      return;
    }

    let indicatorTimer: ReturnType<typeof setTimeout> | null = null;
    let longWaitTimer: ReturnType<typeof setTimeout> | null = null;

    if (isDelayedPhase) {
      setShowIndicator(false);
      indicatorTimer = setTimeout(() => {
        setShowIndicator(true);
      }, 200);
    } else {
      setShowIndicator(true);
    }

    setLongWait(false);
    if (phase !== 'permission') {
      longWaitTimer = setTimeout(() => {
        setLongWait(true);
      }, 8000);
    }

    return () => {
      if (indicatorTimer) clearTimeout(indicatorTimer);
      if (longWaitTimer) clearTimeout(longWaitTimer);
    };
  }, [active, operationKey, phase, isDelayedPhase]);

  return {
    showIndicator: active ? showIndicator : false,
    longWait: active ? longWait : false,
  };
}
