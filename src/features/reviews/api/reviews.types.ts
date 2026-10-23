export type ReviewStatus =
  | 'PUBLISHED'
  | 'HIDDEN_BY_MODERATION'
  | 'DELETED_BY_AUTHOR';

export interface ReviewAuthorDto {
  id: string;
  name: string;
  avatarUrl?: string;
}

export interface ReviewItemDto {
  id: string;
  bookingId: string;
  rating: number;
  comment?: string;
  createdAt: string | Date;
  status?: ReviewStatus;
  version?: number;
  author: ReviewAuthorDto;
}

export interface BarbershopReviewsResponseDto {
  reviews: ReviewItemDto[];
  total: number;
  averageRating: number;
  reviewCount: number;
}

export interface CreateReviewRequestDto {
  rating: number;
  comment?: string;
}

export interface UpdateReviewRequestDto {
  rating: number;
  comment?: string;
  expectedVersion: number;
}

export interface ModerateReviewRequestDto {
  action: 'HIDE' | 'RESTORE';
  expectedVersion: number;
  note?: string;
}

export interface ModerationQueueItemDto {
  id: string;
  bookingId: string;
  barbershopId: string;
  customerId: string;
  rating: number;
  comment?: string;
  status: ReviewStatus;
  version: number;
  createdAt: string | Date;
  updatedAt: string | Date;
}
