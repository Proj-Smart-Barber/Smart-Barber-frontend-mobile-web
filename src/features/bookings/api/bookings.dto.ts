import type { z } from 'zod';
import type {
  bookingCapabilityItemSchema,
  bookingCapabilitiesSchema,
  bookingServiceItemSchema,
  bookingCustomerSchema,
  bookingDtoSchema,
  fetchUnitBookingsResponseSchema,
  customerLookupResultSchema,
  availabilitySlotSchema,
  getBookingAvailabilityResponseSchema,
  fetchMyBookingsResponseSchema,
} from './bookings.schema';

export type BookingCapabilityItem = z.infer<typeof bookingCapabilityItemSchema>;
export type BookingCapabilities = z.infer<typeof bookingCapabilitiesSchema>;
export type BookingServiceItemDto = z.infer<typeof bookingServiceItemSchema>;
export type BookingCustomerDto = z.infer<typeof bookingCustomerSchema>;
export type BookingDto = z.infer<typeof bookingDtoSchema>;
export type FetchUnitBookingsResponse = z.infer<typeof fetchUnitBookingsResponseSchema>;
export type CustomerLookupResult = z.infer<typeof customerLookupResultSchema>;
export type CustomerLookupResponse = CustomerLookupResult;
export type AvailabilitySlotDto = z.infer<typeof availabilitySlotSchema>;
export type BookingAvailabilityResponseDto = z.infer<typeof getBookingAvailabilityResponseSchema>;
export type FetchMyBookingsResponse = z.infer<typeof fetchMyBookingsResponseSchema>;

export interface CreateBookingRequestDto {
  serviceIds: string[];
  barbermanId: string;
  date: string;
  startTime: string;
  endTime?: string;
  expectedTotalPriceInCents?: number;
  expectedDurationInMinutes?: number;
  scope?: 'PERSONAL' | 'UNIT';
  shopId?: string;
  customerId?: string;
  slotStartAt?: string;
}

export interface CreateOperationalBookingRequestDto {
  customerId: string;
  serviceIds: string[];
  barbermanId: string;
  date: string;
  startTime: string;
  endTime?: string;
  expectedTotalPriceInCents?: number;
  expectedDurationInMinutes?: number;
}

export interface ProfessionalDto {
  id: string;
  name: string;
  role: string;
  avatarUrl?: string | null;
}

export interface ListProfessionalsResponse {
  professionals: ProfessionalDto[];
}

export interface FetchUnitBookingsParams {
  page?: number;
  limit?: number;
  date?: string;
  status?: string;
  barbermanId?: string;
}

export interface FetchMyBookingsParams {
  page?: number;
}

export interface CustomerLookupRequest {
  email?: string;
  cpf?: string;
}

export interface CancelBookingRequestDto {
  expectedVersion?: number;
  reason?: string;
  scope?: 'PERSONAL' | 'UNIT';
}

export interface RescheduleBookingRequestDto {
  expectedVersion?: number;
  date: string;
  startTime: string;
  barbermanId?: string;
  serviceIds?: string[];
  expectedTotalPriceInCents?: number;
  expectedDurationInMinutes?: number;
  scope?: 'PERSONAL' | 'UNIT';
  reason?: string;
  slotStartAt?: string;
}

export interface TransitionBookingStatusRequestDto {
  status: 'COMPLETED' | 'NO_SHOW';
  expectedVersion?: number;
  reason?: string;
}

export interface BookingAvailabilityRequestDto {
  date: string;
  serviceIds: string[];
  barbermanId?: string | null;
}
