import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ServerClock } from '../lib/server-clock';

describe('R1 — ServerClock', () => {
  let clock: ServerClock;

  beforeEach(() => {
    clock = new ServerClock();
  });

  it('falha fechado sem sincronizacao prévia', () => {
    expect(clock.hasValidReference()).toBe(false);
    expect(clock.now()).toBeNull();
    expect(() => clock.getRequiredNow()).toThrow('Relógio do servidor não sincronizado');
  });

  it('sincroniza com serverTime ISO e avança monotonicamente', () => {
    const baseTime = 1775900000000;
    const baseIso = new Date(baseTime).toISOString();

    let mono = 1000;
    const monoFn = () => mono;

    clock = new ServerClock(monoFn);
    clock.syncWithServer(baseIso);

    expect(clock.hasValidReference()).toBe(true);
    expect(clock.now()).toBe(baseTime);

    // Avança 500ms no tempo monotônico
    mono += 500;
    expect(clock.now()).toBe(baseTime + 500);
    expect(clock.getRequiredNow()).toBe(baseTime + 500);
  });

  it('rejeita timestamps invalidos na sincronizacao', () => {
    expect(() => clock.syncWithServer('invalid-date')).toThrow('serverTime inválido');
    expect(() => clock.syncWithServer(NaN)).toThrow('serverTime inválido');
    expect(() => clock.syncWithServer(-50)).toThrow('serverTime inválido');
    expect(clock.hasValidReference()).toBe(false);
  });

  it('clear reseta a referencia autoritativa', () => {
    clock.syncWithServer(1775900000000);
    expect(clock.hasValidReference()).toBe(true);
    clock.clear();
    expect(clock.hasValidReference()).toBe(false);
    expect(clock.now()).toBeNull();
  });

  it('ausencia de fonte monotonica valida falha fechado e nunca cai em Date.now', () => {
    const brokenClock = new ServerClock(() => {
      throw new Error('Sem performance.now');
    });

    expect(() => brokenClock.syncWithServer(1775900000000)).toThrow('monotônica');
    expect(brokenClock.hasValidReference()).toBe(false);
    expect(brokenClock.now()).toBeNull();
    expect(() => brokenClock.getRequiredNow()).toThrow();
  });

  it('lease expira após 5 minutos monotônicos sem nova sincronização', () => {
    let mono = 10000;
    const baseTime = 1775900000000;
    clock = new ServerClock(() => mono);
    clock.syncWithServer(baseTime);

    expect(clock.hasValidReference()).toBe(true);
    expect(clock.now()).toBe(baseTime);

    // Avança 4 minutos e 59 segundos (299_000 ms) -> ainda válido
    mono += 299_000;
    expect(clock.hasValidReference()).toBe(true);
    expect(clock.now()).toBe(baseTime + 299_000);

    // Avança mais 2 segundos (total 301_000 ms > 5 minutos = 300_000 ms) -> expirado
    mono += 2_000;
    expect(clock.hasValidReference()).toBe(false);
    expect(clock.now()).toBeNull();
    expect(() => clock.getRequiredNow()).toThrow('Lease do relógio do servidor expirado');
  });

  it('rejeita amostras fora de ordem/atrasadas e aceita nova amostra mais recente', () => {
    let mono = 20000;
    const baseTime = 1775900000000;
    clock = new ServerClock(() => mono);

    // Sincroniza em mono = 20000
    const accepted1 = clock.syncWithServer(baseTime, { sampleMonotonicMs: 20000 });
    expect(accepted1).toBe(true);
    expect(clock.now()).toBe(baseTime);

    // Tenta aplicar uma resposta antiga gerada em mono = 15000 (atrasada)
    const acceptedOld = clock.syncWithServer(baseTime - 5000, { sampleMonotonicMs: 15000 });
    expect(acceptedOld).toBe(false);
    // Relógio preserva a calibração mais recente
    expect(clock.now()).toBe(baseTime);

    // Amostra mais nova gerada em mono = 25000 é aceita
    mono = 25000;
    const acceptedNew = clock.syncWithServer(baseTime + 5000, { sampleMonotonicMs: 25000 });
    expect(acceptedNew).toBe(true);
    expect(clock.now()).toBe(baseTime + 5000);
  });

  it('clear incrementa geração e rejeita amostra tardia de sessão anterior', () => {
    const initialGen = clock.getGeneration();
    expect(initialGen).toBe(0);

    // Requisição iniciada na geração 0
    const requestGen = clock.getGeneration();

    // Sessão encerrada / logout / clear antes da resposta chegar
    clock.clear();
    expect(clock.getGeneration()).toBe(1);

    // Resposta tardia chega tentando sincronizar com a geração capturada no início
    const acceptedTardy = clock.syncWithServer(1775900000000, {
      expectedGeneration: requestGen,
    });
    expect(acceptedTardy).toBe(false);
    expect(clock.hasValidReference()).toBe(false);
  });
});

