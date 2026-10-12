import type { BookingDto } from '../api/bookings.dto';
import type {
  OperationAttemptResult,
  SubmissionStatus,
} from '@/shared/operations/operation-attempt.types';

export type BookingCommandAction =
  | 'CREATE'
  | 'RESCHEDULE'
  | 'CANCEL'
  | 'COMPLETE'
  | 'NO_SHOW';

export type BookingOperationName =
  | 'CREATE_BOOKING'
  | 'RESCHEDULE_BOOKING'
  | 'CANCEL_BOOKING'
  | 'TRANSITION_BOOKING_STATUS';

export interface BaseBookingCommand {
  actorId: string;
  scope: 'PERSONAL' | 'UNIT';
  shopId?: string;
}

export interface CreateBookingCommand extends BaseBookingCommand {
  action: 'CREATE';
  shopId: string;
  customerId?: string;
  serviceIds: string[];
  barbermanId: string;
  date: string;
  startTime: string;
  expectedTotalPriceInCents: number;
  expectedDurationInMinutes: number;
}

export interface RescheduleBookingCommand extends BaseBookingCommand {
  action: 'RESCHEDULE';
  bookingId: string;
  expectedVersion: number;
  date: string;
  startTime: string;
  barbermanId?: string;
  serviceIds?: string[];
  expectedTotalPriceInCents?: number;
  expectedDurationInMinutes?: number;
  reason?: string;
}

export interface CancelBookingCommand extends BaseBookingCommand {
  action: 'CANCEL';
  bookingId: string;
  expectedVersion: number;
  reason?: string;
}

export interface CompleteBookingCommand extends BaseBookingCommand {
  action: 'COMPLETE';
  bookingId: string;
  expectedVersion: number;
  reason?: string;
}

export interface NoShowBookingCommand extends BaseBookingCommand {
  action: 'NO_SHOW';
  bookingId: string;
  expectedVersion: number;
  reason?: string;
}

export type BookingCommand =
  | CreateBookingCommand
  | RescheduleBookingCommand
  | CancelBookingCommand
  | CompleteBookingCommand
  | NoShowBookingCommand;

export interface PreparedBookingOperation {
  requestId: string;
  command: Readonly<BookingCommand>;
  createdAt: number;
}

export interface BookingOperationData {
  booking: BookingDto;
  serverTime?: string;
}

export type BookingOperationResult = OperationAttemptResult<BookingOperationData>;

export function getOperationNameForAction(action: BookingCommandAction): BookingOperationName {
  switch (action) {
    case 'CREATE':
      return 'CREATE_BOOKING';
    case 'RESCHEDULE':
      return 'RESCHEDULE_BOOKING';
    case 'CANCEL':
      return 'CANCEL_BOOKING';
    case 'COMPLETE':
    case 'NO_SHOW':
      return 'TRANSITION_BOOKING_STATUS';
  }
}

export interface PersistedBookingPayload {
  schemaVersion: 1;
  action: BookingCommandAction;
  scope: 'PERSONAL' | 'UNIT';
  shopId?: string;
  bookingId?: string;
  expectedVersion?: number;
  date?: string;
  startTime?: string;
  barbermanId?: string;
  serviceIds?: string[];
  expectedTotalPriceInCents?: number;
  expectedDurationInMinutes?: number;
}

export function sanitizeCommandForStorage(command: BookingCommand): PersistedBookingPayload {
  return {
    schemaVersion: 1,
    action: command.action,
    scope: command.scope,
    shopId: command.shopId,
    bookingId: 'bookingId' in command ? command.bookingId : undefined,
    expectedVersion: 'expectedVersion' in command ? command.expectedVersion : undefined,
    date: 'date' in command ? command.date : undefined,
    startTime: 'startTime' in command ? command.startTime : undefined,
    barbermanId: 'barbermanId' in command ? command.barbermanId : undefined,
    serviceIds: 'serviceIds' in command ? command.serviceIds : undefined,
    expectedTotalPriceInCents:
      'expectedTotalPriceInCents' in command ? command.expectedTotalPriceInCents : undefined,
    expectedDurationInMinutes:
      'expectedDurationInMinutes' in command ? command.expectedDurationInMinutes : undefined,
  };
}

