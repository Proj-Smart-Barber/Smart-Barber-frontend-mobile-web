import { z } from 'zod';
export const geoPointSchema = z.object({
    latitude: z.number().finite().min(-90).max(90),
    longitude: z.number().finite().min(-180).max(180),
});
export const publicShopSchema = z.object({
    id: z.string().uuid(),
    name: z.string().min(1),
    slug: z.string().min(1),
    location: z.string().min(1),
    avatarUrl: z.string().nullable(),
    coverUrl: z.string().nullable().optional(),
    photos: z.array(z.string()).optional(),
    googleMapsUrl: z.string().nullable().optional(),
    rating: z.number().nullable().optional(),
    reviewCount: z.number().nullable().optional(),
    featuredServices: z
        .array(z.object({
        id: z.string(),
        title: z.string(),
        priceInCents: z.number().int().nonnegative(),
        durationInMinutes: z.number().int().positive(),
        imageUrl: z.string().nullable().optional(),
        rating: z.number().nullable().optional(),
        reviewCount: z.number().int().nonnegative().optional(),
    }))
        .optional(),
    coordinates: geoPointSchema.nullable(),
    distanceMeters: z.number().nullable(),
});
export const discoveryPageSchema = z.object({
    items: z.array(publicShopSchema),
    page: z.number().int().min(1),
    limit: z.number().int().min(1).max(50),
    total: z.number().int().min(0),
    hasNext: z.boolean(),
    serverTime: z.string().datetime({ offset: true }).or(z.string().min(1)),
});
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
        .array(z.object({
        serviceId: z.string().nullable().optional(),
        title: z.string(),
        priceInCents: z.number().nullable().optional(),
        durationInMinutes: z.number().nullable().optional(),
    }))
        .optional(),
    totalPriceInCents: z.number().optional().nullable(),
    totalDurationInMinutes: z.number().optional().nullable(),
    version: z.number().int().optional(),
});
export const myBookingsUpcomingResponseSchema = z.object({
    bookings: z.array(nextBookingItemSchema),
    serverTime: z.string(),
});
export function buildBarbershopCatalogHref(shopId) {
    return `/barbershops/${encodeURIComponent(shopId)}/services`;
}
