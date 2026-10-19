import { z } from 'zod';

export const geoPointSchema = z.object({
  latitude: z.number().finite().min(-90).max(90),
  longitude: z.number().finite().min(-180).max(180),
});

export type GeoPoint = z.infer<typeof geoPointSchema>;

export const publicShopSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  slug: z.string().min(1),
  location: z.string().min(1),
  avatarUrl: z.string().nullable(),
  coordinates: geoPointSchema.nullable(),
  distanceMeters: z.number().nullable(),
});

export type PublicShop = z.infer<typeof publicShopSchema>;

export const discoveryPageSchema = z.object({
  items: z.array(publicShopSchema),
  page: z.number().int().min(1),
  limit: z.number().int().min(1).max(50),
  total: z.number().int().min(0),
  hasNext: z.boolean(),
  serverTime: z.string().datetime({ offset: true }).or(z.string().min(1)),
});

export type DiscoveryPage = z.infer<typeof discoveryPageSchema>;

export const nextBookingItemSchema = z.object({
  id: z.string().uuid(),
  barbershopId: z.string().uuid(),
  barbershopName: z.string().optional().nullable(),
  barbermanId: z.string().uuid(),
  barbermanName: z.string().optional().nullable(),
  startsAt: z.string().or(z.date()),
  endsAt: z.string().or(z.date()).optional().nullable(),
  status: z.enum([
    'PENDING',
    'CONFIRMED',
    'IN_PROGRESS',
    'COMPLETED',
    'CANCELLED',
    'NO_SHOW',
  ]),
  services: z
    .array(
      z.object({
        serviceId: z.string().nullable().optional(),
        title: z.string(),
        priceInCents: z.number().nullable().optional(),
        durationInMinutes: z.number().nullable().optional(),
      }),
    )
    .optional(),
  totalPriceInCents: z.number().optional().nullable(),
  totalDurationInMinutes: z.number().optional().nullable(),
  version: z.number().int().optional(),
});

export type NextBookingItem = z.infer<typeof nextBookingItemSchema>;

export const myBookingsUpcomingResponseSchema = z.object({
  bookings: z.array(nextBookingItemSchema),
  serverTime: z.string(),
});

export type MyBookingsUpcomingResponse = z.infer<
  typeof myBookingsUpcomingResponseSchema
>;

export function buildBarbershopCatalogHref(shopId: string): string {
  return `/barbershops/${encodeURIComponent(shopId)}/services`;
}
