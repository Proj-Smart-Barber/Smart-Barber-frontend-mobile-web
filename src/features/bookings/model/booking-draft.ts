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

export class BookingFlowEngine {
  private attempt: BookingAttemptState;
  private readonly timestampMs: number;
  private store?: OperationAttemptStore;
  private actorId?: string;
  private scope: 'PERSONAL' | 'UNIT';

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

    // Persistência indispensável da tentativa antes do POST (garante zeroPOST se storage falhar)
    if (this.store && this.actorId) {
      await this.store.save(this.actorId, {
        actorId: this.actorId,
        requestId: this.attempt.key,
        operation: 'CREATE_BOOKING',
        resourceKind: 'BOOKING',
        status: 'submitting',
        createdAt: this.timestampMs,
        payload: {
          ...this.attempt.payload,
          scope: this.scope,
          shopId: this.draft.shopId,
          customerId: this.draft.customerId,
        },
      });
    }

    this.attempt.status = 'submitting';
    this.attempt.errorMessage = null;
    this.attempt.quoteMismatch = false;

    try {
      const response = await this.transport.createBooking(
        this.attempt.payload,
        this.attempt.key
      );

      this.attempt.status = 'confirmed';
      this.attempt.confirmedBooking = response.booking;

      if (this.store && this.actorId) {
        await this.store.save(this.actorId, {
          actorId: this.actorId,
          requestId: this.attempt.key,
          operation: 'CREATE_BOOKING',
          resourceKind: 'BOOKING',
          status: 'confirmed',
          createdAt: this.timestampMs,
          result: {
            state: 'APPLIED',
            operation: 'CREATE_BOOKING',
            resource: {
              kind: 'BOOKING',
              id: response.booking.id,
              version: (response.booking as any).version ?? 1,
            },
            accessChanged: false,
          },
        }).catch(() => {});
      }

      return response.booking;
    } catch (err: any) {
      this.handleError(err);

      if (this.store && this.actorId) {
        await this.store.save(this.actorId, {
          actorId: this.actorId,
          requestId: this.attempt.key,
          operation: 'CREATE_BOOKING',
          resourceKind: 'BOOKING',
          status: this.attempt.status,
          createdAt: this.timestampMs,
          errorMessage: this.attempt.errorMessage,
        }).catch(() => {});
      }

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
