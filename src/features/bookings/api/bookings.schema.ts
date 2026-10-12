import { z } from 'zod';

export const bookingCapabilityItemSchema = z.object({
  allowed: z.boolean(),
  reasonCode: z.string().nullable().optional(),
  deadlineAt: z.string().nullable().optional(),
});

export const bookingCapabilitiesSchema = z.object({
  cancel: bookingCapabilityItemSchema.optional(),
  reschedule: bookingCapabilityItemSchema.optional(),
  complete: bookingCapabilityItemSchema.optional(),
  noShow: bookingCapabilityItemSchema.optional(),
});

export const bookingServiceItemSchema = z.object({
  id: z.string().nullable().optional(),
  serviceId: z.string().nullable().optional(),
  title: z.string(),
  priceInCents: z.number().nullable().optional(),
  durationInMinutes: z.number().nullable().optional(),
  legacyAggregate: z.boolean().optional(),
});

export const bookingCustomerSchema = z.object({
  id: z.string(),
  name: z.string(),
  phoneNumber: z.string().nullable().optional(),
});

export const bookingDtoSchema = z.object({
  id: z.string(),
  barbershopId: z.string(),
  barbermanId: z.string(),
  customerId: z.string().nullable().optional(),
  shoppingCartId: z.string().nullable().optional(),
  customer: bookingCustomerSchema.nullable().optional(),
  services: z.array(bookingServiceItemSchema),
  startsAt: z.string().nullable().optional(),
  endsAt: z.string().nullable().optional(),
  timezone: z.string().nullable().optional(),
  status: z.string().nullable().optional(),
  version: z.number().nullable().optional(),
  createdByUserId: z.string().nullable().optional(),
  clientRequestId: z.string().nullable().optional(),
  totalPriceInCents: z.number().nullable().optional(),
  totalDurationInMinutes: z.number().nullable().optional(),
  date: z.union([z.string(), z.date()]).optional(),
  startTime: z.string().nullable().optional(),
  endTime: z.string().nullable().optional(),
  createdAt: z.union([z.string(), z.date()]).nullable().optional(),
  canCancel: z.boolean().optional(),
  canReschedule: z.boolean().optional(),
  canComplete: z.boolean().optional(),
  canMarkNoShow: z.boolean().optional(),
  capabilities: bookingCapabilitiesSchema.optional(),
  serverTime: z.string().optional(),
});

export const fetchUnitBookingsResponseSchema = z.object({
  items: z.array(bookingDtoSchema),
  page: z.number(),
  limit: z.number(),
  total: z.number(),
  hasNext: z.boolean(),
  serverTime: z.string().optional(),
  summary: z
    .object({
      totalBookings: z.number(),
      totalRevenueInCents: z.number(),
    })
    .optional(),
});

export const customerLookupResultSchema = z.object({
  id: z.string(),
  name: z.string(),
  maskedEmail: z.string().optional(),
  maskedPhone: z.string().nullable().optional(),
  isEligible: z.boolean(),
  unconfirmedEmail: z.boolean().optional(),
});

export const availabilitySlotSchema = z.object({
  start: z.string(),
  end: z.string(),
});

export const getBookingAvailabilityResponseSchema = z.object({
  slots: z.array(availabilitySlotSchema),
  serverTime: z.string().optional(),
});

export const fetchMyBookingsResponseSchema = z.object({
  bookings: z.array(bookingDtoSchema),
});
