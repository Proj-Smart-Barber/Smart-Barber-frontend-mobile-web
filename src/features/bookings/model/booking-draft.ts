import type {
  CreateBookingRequestDto,
  BookingDto,
} from '../api/bookings.dto';
import { generateUuidV7 } from '../lib/attempt-id';

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
}

export interface BookingAttemptState {
  key: string;
  payload: CreateBookingRequestDto;
  status: SubmissionStatus;
  confirmedBooking: BookingDto | null;
  errorMessage: string | null;
  quoteMismatch: boolean;
}

export class BookingFlowEngine {
  private attempt: BookingAttemptState;

  constructor(
    private draft: BookingDraft,
    private transport: BookingTransport,
    serverTimestampMs?: number
  ) {
    const key = generateUuidV7(serverTimestampMs);
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

  async submit(): Promise<BookingDto> {
    if (this.attempt.status === 'submitting' || this.attempt.status === 'confirmed') {
      throw new Error('Agendamento já em andamento ou confirmado.');
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
      return response.booking;
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
    const isConflict =
      err?.status === 409 ||
      err?.statusCode === 409 ||
      err?.message?.includes('alterado') ||
      err?.message?.includes('quote_mismatch');

    if (isConflict) {
      this.attempt.status = 'error';
      this.attempt.quoteMismatch = true;
      this.attempt.errorMessage =
        'Os valores ou duração dos serviços foram atualizados. Revise as informações antes de confirmar.';
      return;
    }

    const isTimeout =
      err?.name === 'AbortError' ||
      err?.isNetworkError === true ||
      err?.message?.includes('timeout') ||
      err?.message?.includes('conexão');

    if (isTimeout) {
      this.attempt.status = 'uncertain';
      this.attempt.errorMessage =
        'Ainda não foi possível confirmar o agendamento. Verifique seus agendamentos antes de tentar novamente.';
      return;
    }

    this.attempt.status = 'error';
    this.attempt.errorMessage = err?.message || 'Falha ao processar o agendamento.';
  }
}
