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
});

