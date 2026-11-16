import { useEffect, useState } from 'react';
/**
 * useLoadingFeedback
 *
 * Contrato de temporização honesto para feedback de carregamento:
 * - 200ms de atraso visual transitório apenas para refresh, next-page e media (evita flicker se resolver rápido).
 * - Feedback imediato (0ms) para initial, mutation, locating e permission.
 * - 8s de espera contínua sinaliza lentidão (longWait = true), exceto na fase permission (que aguarda o usuário).
 * - Timers limpos imediatamente ao inativar, trocar de operationKey ou desmontar.
 */
export function useLoadingFeedback({ operationKey, active, phase, }) {
    const isDelayedPhase = phase === 'refresh' || phase === 'next-page' || phase === 'media';
    const [showIndicator, setShowIndicator] = useState(() => (active ? !isDelayedPhase : false));
    const [longWait, setLongWait] = useState(false);
    useEffect(() => {
        if (!active) {
            setShowIndicator(false);
            setLongWait(false);
            return;
        }
        let indicatorTimer = null;
        let longWaitTimer = null;
        if (isDelayedPhase) {
            setShowIndicator(false);
            indicatorTimer = setTimeout(() => {
                setShowIndicator(true);
            }, 200);
        }
        else {
            setShowIndicator(true);
        }
        setLongWait(false);
        if (phase !== 'permission') {
            longWaitTimer = setTimeout(() => {
                setLongWait(true);
            }, 8000);
        }
        return () => {
            if (indicatorTimer)
                clearTimeout(indicatorTimer);
            if (longWaitTimer)
                clearTimeout(longWaitTimer);
        };
    }, [active, operationKey, phase, isDelayedPhase]);
    return {
        showIndicator: active ? showIndicator : false,
        longWait: active ? longWait : false,
    };
}
