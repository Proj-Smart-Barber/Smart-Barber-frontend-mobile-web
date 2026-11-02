import { z } from 'zod';

export const exploreFeedMediaItemSchema = z.object({
  id: z.string(),
  kind: z.enum(['environment', 'service', 'team']),
  mediaId: z.string(),
  mimeType: z.string().optional(),
  posterUrl: z.string().optional(),
  durationSeconds: z.number().positive().max(60).optional(),
  serviceId: z.string().nullable().optional(),
  url: z.string().url(),
  variants: z.record(z.string()).optional(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  alt: z.string(),
  focalPoint: z.string().optional(),
  category: z.string().optional(),
  rightsPending: z.boolean().optional(),
  service: z
    .object({
      id: z.string(),
      title: z.string(),
      priceInCents: z.number().int().nonnegative(),
      durationInMinutes: z.number().int().positive(),
    })
    .nullable()
    .optional(),
});

export const exploreFeedItemSchema = z.object({
  barbershop: z.object({
    id: z.string(),
    slug: z.string(),
    name: z.string(),
    location: z.string(),
    logoUrl: z.string().nullable().optional(),
    rating: z.number().nullable().optional(),
    reviewCount: z.number().int().nonnegative(),
    googleMapsUrl: z.string().nullable().optional(),
  }),
  distanceMeters: z.number().nullable(),
  distanceBasis: z.enum(['user', 'region', 'unavailable']),
  rankingScore: z.object({
    score: z.number(),
    distanceComponent: z.number().nullable().optional(),
    reputationComponent: z.number(),
    bayesRating: z.number(),
  }),
  media: z.array(exploreFeedMediaItemSchema),
});

export const exploreFeedPageSchema = z.object({
  items: z.array(exploreFeedItemSchema),
  nextCursor: z.string().nullable(),
  hasNext: z.boolean(),
  total: z.number().int().nonnegative(),
  rankingVersion: z.string(),
  snapshotExpiresAt: z.string(),
});

export type ExploreFeedMediaItem = z.infer<typeof exploreFeedMediaItemSchema>;
export type ExploreFeedItem = z.infer<typeof exploreFeedItemSchema>;
export type ExploreFeedPage = z.infer<typeof exploreFeedPageSchema>;

export interface ExploreFeedInput {
  mode: 'ALL' | 'NEARBY';
  point?: { latitude: number; longitude: number };
  radiusKm?: 5 | 10 | 25 | 50;
  q?: string;
  regionKey?: string;
  limit?: number;
  cursor?: string;
}
