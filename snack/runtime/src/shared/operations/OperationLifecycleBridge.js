import { useEffect, useRef } from 'react';
import { operationAttemptStore } from './operation-attempt-store';
export class OperationLifecycleBridgeController {
    getGeneration() { return this.generation; }
    constructor(options) {
        var _a;
        this.pendingCleanup = null;
        this.generation = 0;
        this.cleanupError = null;
        this.currentActorId = options.actorId;
        this.currentSessionState = options.sessionState;
        this.store = (_a = options.store) !== null && _a !== void 0 ? _a : operationAttemptStore;
        activeBridgeController = this;
    }
    getActiveActorId() {
        return this.currentActorId;
    }
    isActorActive(actorId) {
        if (!actorId)
            return false;
        return this.currentActorId === actorId && this.currentSessionState !== 'unauthenticated';
    }
    async waitForCleanup() {
        if (this.pendingCleanup) {
            await this.pendingCleanup;
        }
        if (this.cleanupError)
            throw new Error('Não foi possível limpar os dados da sessão anterior.');
    }
    handleSessionUpdate(nextActorId, nextSessionState) {
        const prevActorId = this.currentActorId;
        // Estados transitórios de bootstrap ou recuperação temporária não disparam limpeza
        const isTransient = nextSessionState === 'restoring' ||
            nextSessionState === 'bootstrapping' ||
            nextSessionState === 'recoveryRequired' ||
            nextSessionState === 'error';
        if (isTransient) {
            this.currentSessionState = nextSessionState;
            return;
        }
        const isLogout = (prevActorId !== null && nextActorId === null) ||
            nextSessionState === 'unauthenticated';
        const isActorSwitch = prevActorId !== null &&
            nextActorId !== null &&
            prevActorId !== nextActorId;
        if ((isLogout || isActorSwitch) && prevActorId) {
            this.generation++;
            // Limpa os payloads da tentativa, preservando apenas referências opacas incertas
            this.pendingCleanup = this.store
                .clearPayloadsOnLogout(prevActorId)
                .catch((error) => { this.cleanupError = error; })
                .finally(() => {
                this.pendingCleanup = null;
            });
        }
        this.currentActorId = nextActorId;
        this.currentSessionState = nextSessionState;
    }
}
let activeBridgeController = null;
export function isCurrentActorActive(actorId) {
    if (!activeBridgeController)
        return true;
    return activeBridgeController.isActorActive(actorId);
}
export function actorSessionGeneration() { var _a; return (_a = activeBridgeController === null || activeBridgeController === void 0 ? void 0 : activeBridgeController.getGeneration()) !== null && _a !== void 0 ? _a : 0; }
export async function awaitOperationCleanup() { await (activeBridgeController === null || activeBridgeController === void 0 ? void 0 : activeBridgeController.waitForCleanup()); }
/**
 * Componente de ponte de ciclo de vida para sincronizar estado de sessão e armazenamento de tentativas.
 * Fica em shared/operations (fora de src/app) para não ser mapeado como rota Expo.
 * Não realiza nenhum auto-POST ao montar ou autenticar.
 */
export function OperationLifecycleBridge({ actorId, sessionState, store, }) {
    const controllerRef = useRef(null);
    if (!controllerRef.current) {
        controllerRef.current = new OperationLifecycleBridgeController({
            actorId,
            sessionState,
            store,
        });
    }
    useEffect(() => {
        var _a;
        (_a = controllerRef.current) === null || _a === void 0 ? void 0 : _a.handleSessionUpdate(actorId, sessionState);
    }, [actorId, sessionState]);
    return null;
}
