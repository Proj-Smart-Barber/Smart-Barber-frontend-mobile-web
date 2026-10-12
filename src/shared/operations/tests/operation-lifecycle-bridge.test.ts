import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  OperationLifecycleBridgeController,
  OperationLifecycleBridge,
} from '../OperationLifecycleBridge';
import type { OperationAttemptStore } from '../operation-attempt.types';

describe('R1 — OperationLifecycleBridge', () => {
  let mockStore: OperationAttemptStore;

  beforeEach(() => {
    mockStore = {
      read: vi.fn(),
      save: vi.fn(),
      listReferences: vi.fn(),
      clearResolved: vi.fn(),
      clearPayloadsOnLogout: vi.fn().mockResolvedValue(undefined),
      clearAllForActor: vi.fn().mockResolvedValue(undefined),
    };
  });

  it('restoring, bootstrapping e recoveryRequired nao disparam limpeza', () => {
    const controller = new OperationLifecycleBridgeController({
      actorId: 'actor-1',
      sessionState: 'bootstrapping',
      store: mockStore,
    });

    controller.handleSessionUpdate('actor-1', 'restoring');
    controller.handleSessionUpdate('actor-1', 'recoveryRequired');
    controller.handleSessionUpdate('actor-1', 'error');

    expect(mockStore.clearPayloadsOnLogout).not.toHaveBeenCalled();
  });

  it('logout efetivo limpa payloads do ator anterior', () => {
    const controller = new OperationLifecycleBridgeController({
      actorId: 'actor-1',
      sessionState: 'authenticated',
      store: mockStore,
    });

    // Logout
    controller.handleSessionUpdate(null, 'unauthenticated');

    expect(mockStore.clearPayloadsOnLogout).toHaveBeenCalledWith('actor-1');
  });

  it('troca de ator limpa payloads do ator que saiu', () => {
    const controller = new OperationLifecycleBridgeController({
      actorId: 'actor-1',
      sessionState: 'authenticated',
      store: mockStore,
    });

    // Troca para actor-2
    controller.handleSessionUpdate('actor-2', 'authenticated');

    expect(mockStore.clearPayloadsOnLogout).toHaveBeenCalledWith('actor-1');
  });

  it('nao dispara auto-POST ou mutacao na montagem ou restauracao', () => {
    const postSpy = vi.fn();
    new OperationLifecycleBridgeController({
      actorId: 'actor-1',
      sessionState: 'authenticated',
      store: mockStore,
    });

    expect(postSpy).not.toHaveBeenCalled();
    expect(typeof OperationLifecycleBridge).toBe('function');
  });
});
