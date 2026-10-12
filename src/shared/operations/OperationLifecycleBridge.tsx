import React, { useEffect, useRef } from 'react';
import type { OperationAttemptStore } from './operation-attempt.types';
import { operationAttemptStore } from './operation-attempt-store';

export interface OperationLifecycleBridgeProps {
  actorId: string | null;
  sessionState: string;
  store?: OperationAttemptStore;
}

export class OperationLifecycleBridgeController {
  private currentActorId: string | null;
  private currentSessionState: string;
  private store: OperationAttemptStore;

  constructor(options: {
    actorId: string | null;
    sessionState: string;
    store?: OperationAttemptStore;
  }) {
    this.currentActorId = options.actorId;
    this.currentSessionState = options.sessionState;
    this.store = options.store ?? operationAttemptStore;
  }

  handleSessionUpdate(nextActorId: string | null, nextSessionState: string): void {
    const prevActorId = this.currentActorId;

    // Estados transitórios de bootstrap ou recuperação temporária não disparam limpeza
    const isTransient =
      nextSessionState === 'restoring' ||
      nextSessionState === 'bootstrapping' ||
      nextSessionState === 'recoveryRequired' ||
      nextSessionState === 'error';

    if (isTransient) {
      this.currentSessionState = nextSessionState;
      return;
    }

    const isLogout =
      (prevActorId !== null && nextActorId === null) ||
      nextSessionState === 'unauthenticated';

    const isActorSwitch =
      prevActorId !== null &&
      nextActorId !== null &&
      prevActorId !== nextActorId;

    if ((isLogout || isActorSwitch) && prevActorId) {
      // Limpa os payloads da tentativa, preservando apenas referências opacas incertas
      void this.store.clearPayloadsOnLogout(prevActorId).catch(() => {});
    }

    this.currentActorId = nextActorId;
    this.currentSessionState = nextSessionState;
  }
}

/**
 * Componente de ponte de ciclo de vida para sincronizar estado de sessão e armazenamento de tentativas.
 * Fica em shared/operations (fora de src/app) para não ser mapeado como rota Expo.
 * Não realiza nenhum auto-POST ao montar ou autenticar.
 */
export function OperationLifecycleBridge({
  actorId,
  sessionState,
  store,
}: OperationLifecycleBridgeProps): null {
  const controllerRef = useRef<OperationLifecycleBridgeController | null>(null);

  if (!controllerRef.current) {
    controllerRef.current = new OperationLifecycleBridgeController({
      actorId,
      sessionState,
      store,
    });
  }

  useEffect(() => {
    controllerRef.current?.handleSessionUpdate(actorId, sessionState);
  }, [actorId, sessionState]);

  return null;
}
