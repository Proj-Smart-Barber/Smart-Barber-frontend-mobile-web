import type {
  CreateBookingRequestDto,
  BookingDto,
} from '../api/bookings.dto';
import { generateUuidV7 } from '../lib/attempt-id';
import { ServerClock } from '../lib/server-clock';
import {
  normalizeBookingError,
  type AuthoritativeQuote,
} from '../lib/normalize-booking-error';
import type { OperationAttemptStore } from '@/shared/operations/operation-attempt.types';

export type SubmissionStatus =
  | 'reviewing'
  | 'submitting'
  | 'confirmed'
  | 'uncertain'
  | 'error';

export interface BookingTransport {
  createBooking(
    payload: CreateBookingRequestDto,
    idempotencyKey?: string
  ): Promise<{ booking: BookingDto }>;
  getBookingById(id: string): Promise<BookingDto>;
}

export interface BookingDraft {
  shopId: string;
  serviceIds: string[];
  barbermanId: string;
  date: string;
  startTime: string;
  expectedTotalPriceInCents: number;
  expectedDurationInMinutes: number;
  scope?: 'PERSONAL' | 'UNIT';
  customerId?: string;
}

export interface BookingAttemptState {
  key: string;
  payload: CreateBookingRequestDto;
  status: SubmissionStatus;
  confirmedBooking: BookingDto | null;
  errorMessage: string | null;
  quoteMismatch: boolean;
  authoritativeQuote?: AuthoritativeQuote | null;
}

export interface BookingFlowEngineOptions {
  serverTimestampMs?: number;
  serverClock?: ServerClock;
  store?: OperationAttemptStore;
  actorId?: string;
  scope?: 'PERSONAL' | 'UNIT';
}

import {
  BookingOperationEngine,
  type BookingOperationTransport,
} from './booking-operation-engine';
import type {
  CreateBookingCommand,
  PreparedBookingOperation,
} from './booking-command.types';

export class BookingFlowEngine {
  private attempt: BookingAttemptState;
  private readonly timestampMs: number;
  private store?: OperationAttemptStore;
  private actorId?: string;
  private scope: 'PERSONAL' | 'UNIT';
  private operationEngine: BookingOperationEngine;

  constructor(
    private draft: BookingDraft,
    private transport: BookingTransport,
    optionsOrTimestamp?: number | ServerClock | BookingFlowEngineOptions
  ) {
    let resolvedTimeMs: number | null = null;

    if (typeof optionsOrTimestamp === 'number') {
      if (optionsOrTimestamp > 0 && !Number.isNaN(optionsOrTimestamp)) {
        resolvedTimeMs = optionsOrTimestamp;
      }
    } else if (optionsOrTimestamp instanceof ServerClock) {
      resolvedTimeMs = optionsOrTimestamp.getRequiredNow();
    } else if (optionsOrTimestamp && typeof optionsOrTimestamp === 'object') {
      this.store = optionsOrTimestamp.store;
      this.actorId = optionsOrTimestamp.actorId;
      this.scope = optionsOrTimestamp.scope ?? draft.scope ?? 'PERSONAL';

      if (optionsOrTimestamp.serverClock) {
        resolvedTimeMs = optionsOrTimestamp.serverClock.getRequiredNow();
      } else if (
        typeof optionsOrTimestamp.serverTimestampMs === 'number' &&
        optionsOrTimestamp.serverTimestampMs > 0 &&
        !Number.isNaN(optionsOrTimestamp.serverTimestampMs)
      ) {
        resolvedTimeMs = optionsOrTimestamp.serverTimestampMs;
      }
    }

    if (!resolvedTimeMs || resolvedTimeMs <= 0) {
      throw new Error(
        'Server clock inválido ou não sincronizado. Impossível gerar chave de tentativa segura.'
      );
    }

    this.timestampMs = resolvedTimeMs;
    this.scope = draft.scope ?? 'PERSONAL';
    const key = generateUuidV7(this.timestampMs);

    this.attempt = {
      key,
      payload: {
        serviceIds: [...draft.serviceIds],
        barbermanId: draft.barbermanId,
        date: draft.date,
        startTime: draft.startTime,
        expectedTotalPriceInCents: draft.expectedTotalPriceInCents,
        expectedDurationInMinutes: draft.expectedDurationInMinutes,
      },
      status: 'reviewing',
      confirmedBooking: null,
      errorMessage: null,
      quoteMismatch: false,
    };

    this.operationEngine = new BookingOperationEngine({
      store: this.store,
      transport: {
        createBooking: (payload: any, idempotencyKey?: string) => {
          return this.transport.createBooking(this.attempt.payload, idempotencyKey);
        },
      },
    });
  }

  get state(): BookingAttemptState {
    return { ...this.attempt };
  }

  get key(): string {
    return this.attempt.key;
  }

  get status(): SubmissionStatus {
    return this.attempt.status;
  }

  get isSubmitting(): boolean {
    return this.attempt.status === 'submitting';
  }

  get isConfirmed(): boolean {
    return this.attempt.status === 'confirmed';
  }

  get quoteMismatch(): boolean {
    return this.attempt.quoteMismatch;
  }

  get authoritativeQuote(): AuthoritativeQuote | null | undefined {
    return this.attempt.authoritativeQuote;
  }

  async submit(): Promise<BookingDto> {
    if (this.attempt.status === 'submitting' || this.attempt.status === 'confirmed') {
      throw new Error('Agendamento já em andamento ou confirmado.');
    }

    const command: CreateBookingCommand = {
      action: 'CREATE',
      actorId: this.actorId ?? 'guest-actor',
      scope: this.scope,
      shopId: this.draft.shopId,
      customerId: this.draft.customerId,
      serviceIds: [...this.draft.serviceIds],
      barbermanId: this.draft.barbermanId,
      date: this.draft.date,
      startTime: this.draft.startTime,
      expectedTotalPriceInCents: this.draft.expectedTotalPriceInCents,
      expectedDurationInMinutes: this.draft.expectedDurationInMinutes,
    };

    const prepared: PreparedBookingOperation = {
      requestId: this.attempt.key,
      command,
      createdAt: this.timestampMs,
    };

    this.attempt.status = 'submitting';
    this.attempt.errorMessage = null;
    this.attempt.quoteMismatch = false;

    try {
      const result = await this.operationEngine.submit(prepared, {
        store: this.store,
        transport: {
          createBooking: (payload: any, idempotencyKey?: string) => {
            return this.transport.createBooking(this.attempt.payload, idempotencyKey);
          },
        },
      });

      if (result.state === 'APPLIED' && result.resource?.data?.booking) {
        this.attempt.status = 'confirmed';
        this.attempt.confirmedBooking = result.resource.data.booking;
        return result.resource.data.booking;
      }

      throw new Error('Operação concluída sem confirmação autoritativa da reserva.');
    } catch (err: any) {
      this.handleError(err);
      throw err;
    }
  }

  async retryReplay(): Promise<BookingDto> {
    // Replay conserva rigorosamente a mesma chave e o mesmo payload
    return this.submit();
  }

  private handleError(err: any): void {
    const normalized = normalizeBookingError(err);

    if (normalized.code === 'QUOTE_CHANGED') {
      this.attempt.status = 'error';
      this.attempt.quoteMismatch = true;
      this.attempt.authoritativeQuote = normalized.quote ?? null;
      this.attempt.errorMessage = normalized.message;
      return;
    }

    if (normalized.code === 'NETWORK_OR_TIMEOUT' || normalized.isNetworkError) {
      this.attempt.status = 'uncertain';
      this.attempt.quoteMismatch = false;
      this.attempt.errorMessage = normalized.message;
      return;
    }

    this.attempt.status = 'error';
    this.attempt.quoteMismatch = false;
    this.attempt.errorMessage = normalized.message;
  }
}
