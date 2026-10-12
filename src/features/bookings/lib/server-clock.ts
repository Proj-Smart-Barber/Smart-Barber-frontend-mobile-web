/**
 * ServerClock: Combina uma referência autoritativa de serverTime com o tempo decorrido monotônico.
 * Impede o uso do relógio de parede não confiável do aparelho para gerar novas tentativas.
 */

export class ServerClock {
  private serverReferenceMs: number | null = null;
  private monotonicOriginMs: number | null = null;

  constructor(
    private readonly getMonotonicTimeMs: () => number = () => {
      if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
        return performance.now();
      }
      throw new Error('Fonte monotônica de tempo indisponível no ambiente.');
    }
  ) {}

  syncWithServer(serverTime: string | number | Date): void {
    let parsedMs: number;

    if (serverTime instanceof Date) {
      parsedMs = serverTime.getTime();
    } else if (typeof serverTime === 'number') {
      parsedMs = serverTime;
    } else if (typeof serverTime === 'string') {
      const parsed = Date.parse(serverTime);
      if (Number.isNaN(parsed)) {
        throw new Error('serverTime inválido fornecido para sincronização.');
      }
      parsedMs = parsed;
    } else {
      throw new Error('serverTime inválido fornecido para sincronização.');
    }

    if (Number.isNaN(parsedMs) || parsedMs <= 0) {
      throw new Error('serverTime inválido fornecido para sincronização.');
    }

    try {
      const origin = this.getMonotonicTimeMs();
      if (typeof origin !== 'number' || Number.isNaN(origin)) {
        throw new Error('Tempo monotônico inválido.');
      }
      this.serverReferenceMs = Math.floor(parsedMs);
      this.monotonicOriginMs = origin;
    } catch {
      this.serverReferenceMs = null;
      this.monotonicOriginMs = null;
      throw new Error('Fonte monotônica de tempo indisponível para sincronização.');
    }
  }


  hasValidReference(): boolean {
    return this.serverReferenceMs !== null && this.monotonicOriginMs !== null;
  }

  now(): number | null {
    if (this.serverReferenceMs === null || this.monotonicOriginMs === null) {
      return null;
    }

    const elapsed = this.getMonotonicTimeMs() - this.monotonicOriginMs;
    return Math.floor(this.serverReferenceMs + Math.max(0, elapsed));
  }

  getRequiredNow(): number {
    const current = this.now();
    if (current === null) {
      throw new Error(
        'Relógio do servidor não sincronizado. É necessária uma referência autoritativa do servidor antes de realizar nova operação.'
      );
    }
    return current;
  }

  clear(): void {
    this.serverReferenceMs = null;
    this.monotonicOriginMs = null;
  }
}

export const serverClock = new ServerClock();
