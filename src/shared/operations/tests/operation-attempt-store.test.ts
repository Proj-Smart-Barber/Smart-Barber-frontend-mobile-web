import { describe, it, expect, beforeEach } from 'vitest';
import { WebOperationAttemptStore } from '../operation-attempt-store.web';
import type { OperationAttemptRecord } from '../operation-attempt.types';

describe('R1 — OperationAttemptStore', () => {
  let store: WebOperationAttemptStore;

  const sampleAttempt: OperationAttemptRecord = {
    actorId: 'actor-1',
    requestId: '019d75c2-e700-7000-8000-000000000001',
    operation: 'CREATE_BOOKING',
    resourceKind: 'BOOKING',
    status: 'uncertain',
    createdAt: Date.now(),
    payload: {
      serviceIds: ['s1'],
      date: '2026-10-15',
    },
  };

  beforeEach(() => {
    store = new WebOperationAttemptStore();
  });

  it('salva_e_recupera_tentativa_para_mesmo_ator', async () => {
    await store.save('actor-1', sampleAttempt);
    const loaded = await store.read('actor-1', sampleAttempt.requestId);

    expect(loaded).not.toBeNull();
    expect(loaded?.requestId).toBe(sampleAttempt.requestId);
    expect(loaded?.payload).toEqual(sampleAttempt.payload);
  });

  it('duas_tentativas_coexistem_sem_sobrescrever', async () => {
    const attempt2: OperationAttemptRecord = {
      ...sampleAttempt,
      requestId: '019d75c2-e700-7000-8000-000000000002',
      payload: { serviceIds: ['s2'] },
    };

    await store.save('actor-1', sampleAttempt);
    await store.save('actor-1', attempt2);

    const l1 = await store.read('actor-1', sampleAttempt.requestId);
    const l2 = await store.read('actor-1', attempt2.requestId);

    expect(l1?.payload).toEqual({ serviceIds: ['s1'], date: '2026-10-15' });
    expect(l2?.payload).toEqual({ serviceIds: ['s2'] });
  });

  it('outro_ator_nao_le_tentativa_alheia', async () => {
    await store.save('actor-1', sampleAttempt);
    const loaded = await store.read('actor-2', sampleAttempt.requestId);

    expect(loaded).toBeNull();
  });

  it('logout_elimina_payloads_e_resolvidas_mas_preserva_referencias_incertas', async () => {
    const resolvedAttempt: OperationAttemptRecord = {
      ...sampleAttempt,
      requestId: '019d75c2-e700-7000-8000-000000000003',
      status: 'confirmed',
    };

    await store.save('actor-1', sampleAttempt); // uncertain
    await store.save('actor-1', resolvedAttempt); // confirmed

    await store.clearPayloadsOnLogout('actor-1');

    // Resolvida foi removida
    const readResolved = await store.read('actor-1', resolvedAttempt.requestId);
    expect(readResolved).toBeNull();

    // Incerta teve payload removido, mas referência foi preservada
    const readUncertain = await store.read('actor-1', sampleAttempt.requestId);
    expect(readUncertain).not.toBeNull();
    expect(readUncertain?.payload).toBeUndefined();
    expect(readUncertain?.status).toBe('uncertain');

    // Listagem de referências do ator ainda localiza a incerta
    const refs = await store.listReferences('actor-1');
    expect(refs).toHaveLength(1);
    expect(refs[0].requestId).toBe(sampleAttempt.requestId);

    // Outro ator não vê referências de actor-1
    const refsOther = await store.listReferences('actor-2');
    expect(refsOther).toHaveLength(0);
  });

  it('janela_24h_elimina_payload_vencido_preservando_referencia', async () => {
    const expiredAttempt: OperationAttemptRecord = {
      ...sampleAttempt,
      createdAt: Date.now() - 25 * 60 * 60 * 1000, // 25 horas atrás
    };

    await store.save('actor-1', expiredAttempt);
    const read = await store.read('actor-1', expiredAttempt.requestId);

    // Payload deve ter sido expurgado por passar de 24h
    expect(read?.payload).toBeUndefined();
    expect(read?.requestId).toBe(expiredAttempt.requestId);
  });

  it('dados_corrompidos_no_storage_falham_fechado_sem_inventar_sucesso', async () => {
    (store as any).setItem(`sb_ops_actor-1_${sampleAttempt.requestId}`, 'corrupted json {');
    const read = await store.read('actor-1', sampleAttempt.requestId);
    expect(read).toBeNull();
  });

  it('save sanitiza BOOKING e nao persiste DTO de cliente nem no payload nem no result', async () => {
    const attemptWithPii: OperationAttemptRecord = {
      ...sampleAttempt,
      payload: {
        serviceIds: ['s1'],
        date: '2026-10-15',
        startTime: '10:00',
        customer: { id: 'c1', name: 'Nome Cliente', email: 'cliente@teste.com', phone: '11999999999' },
      },
      result: {
        state: 'APPLIED',
        operation: 'CREATE_BOOKING',
        resource: {
          kind: 'BOOKING',
          id: 'b1',
          version: 1,
          data: {
            customer: { id: 'c1', name: 'Nome Cliente', email: 'cliente@teste.com' },
          },
        },
        serverTime: '2026-10-12T10:00:00.000Z',
      },
    };

    await store.save('actor-1', attemptWithPii);
    const read = await store.read('actor-1', sampleAttempt.requestId);

    // Payload de BOOKING contém apenas campos do comando de agendamento
    expect((read?.payload as any)?.customer).toBeUndefined();
    expect(read?.payload?.serviceIds).toEqual(['s1']);

    // Result não armazena data com DTO de cliente
    expect(read?.result?.resource?.id).toBe('b1');
    expect((read?.result?.resource as any)?.data).toBeUndefined();
  });

  it('save nao persiste formulário/e-mail/CPF/senha para REGISTRATION e INVITATION', async () => {
    const regAttempt: OperationAttemptRecord = {
      actorId: 'actor-1',
      requestId: '019d75c2-e700-7000-8000-000000000009',
      operation: 'REGISTER_BARBER',
      resourceKind: 'REGISTRATION',
      status: 'uncertain',
      createdAt: Date.now(),
      payload: {
        name: 'Barbeiro Teste',
        email: 'sensivel@barber.com',
        cpf: '12345678901',
        password: 'senha_secreta',
      },
    };

    await store.save('actor-1', regAttempt);
    const read = await store.read('actor-1', regAttempt.requestId);

    expect(read?.payload).toBeUndefined();
    expect(read?.resourceKind).toBe('REGISTRATION');
  });

  it('logout com resultado contendo dados privados deixa só referência opaca', async () => {
    const attemptWithResult: OperationAttemptRecord = {
      ...sampleAttempt,
      requestId: '019d75c2-e700-7000-8000-000000000010',
      status: 'uncertain',
      errorMessage: 'Mensagem contendo dado de erro',
      result: {
        state: 'APPLIED',
        serverTime: '2026-10-12T10:00:00.000Z',
      },
    };

    await store.save('actor-1', attemptWithResult);
    await store.clearPayloadsOnLogout('actor-1');

    const read = await store.read('actor-1', attemptWithResult.requestId);
    expect(read).not.toBeNull();
    // Somente referência opaca é preservada
    expect(read?.payload).toBeUndefined();
    expect(read?.result).toBeUndefined();
    expect(read?.errorMessage).toBeUndefined();
    expect(read?.status).toBe('uncertain');
    expect(read?.requestId).toBe(attemptWithResult.requestId);
  });
});

