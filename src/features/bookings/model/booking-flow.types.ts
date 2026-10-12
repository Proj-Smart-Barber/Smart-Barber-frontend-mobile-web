import type { BookingDto, ProfessionalDto, AvailabilitySlotDto } from '../api/bookings.dto';
import type { AuthoritativeQuote } from '../lib/normalize-booking-error';

export type BookingMode = 'PERSONAL' | 'UNIT';

export type BookingFlowStep =
  | 'SERVICES'
  | 'CUSTOMER'
  | 'PROFESSIONAL'
  | 'SLOT'
  | 'REVIEW'
  | 'RESULT'
  | 'UNCERTAIN';

export type BookingSubmissionStatus =
  | 'reviewing'
  | 'submitting'
  | 'confirmed'
  | 'uncertain'
  | 'error';

export interface SelectedSlot {
  start: string;
  end: string;
  startTime: string; // HH:MM
  slotStartAt: string; // ISO
}

export interface BookingCustomer {
  id: string;
  name: string;
  maskedEmail?: string;
  maskedPhone?: string | null;
  isEligible: boolean;
}

export interface UseBookingFlowOptions {
  mode: BookingMode;
  shopId: string;
  bookingId?: string; // Modo remarcação
  initialServiceIds?: string[];
  initialDate?: string;
  initialProfessionalId?: string;
  initialCustomer?: BookingCustomer | null;
}

export interface BookingFlowState {
  mode: BookingMode;
  step: BookingFlowStep;
  shopId: string;
  selectedServiceIds: string[];
  selectedProfessionalId: string | null;
  selectedDate: string | null;
  selectedSlot: SelectedSlot | null;
  customer: BookingCustomer | null;
  status: BookingSubmissionStatus;
  quoteMismatch: boolean;
  authoritativeQuote: AuthoritativeQuote | null;
  errorMessage: string | null;
  confirmedBooking: BookingDto | null;
  uncertainAttemptKey: string | null;
  isRescheduling: boolean;
}
