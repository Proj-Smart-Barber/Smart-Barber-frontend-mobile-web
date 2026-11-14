export type ReviewStatus =
  | 'PUBLISHED'
  | 'HIDDEN_BY_MODERATION'
  | 'DELETED_BY_AUTHOR';

export type ReviewTargetType = 'BARBERSHOP' | 'BARBER' | 'SERVICE';

export interface ReviewAuthorDto {
  id: string;
  name: string;
  avatarUrl?: string;
}

export interface ReviewTargetItemDto {
  id: string;
  targetType: ReviewTargetType;
  targetId: string | null;
  bookingServiceItemId: string | null;
  targetLabel: string;
  rating: number;
}

export interface ReviewTargetSummaryDto {
  targetType: ReviewTargetType;
  targetId: string | null;
  targetLabel: string;
  rating: number;
}

export interface PlatformFeedbackDto {
  id: string;
  rating: number | null;
  comment: string | null;
  createdAt: string | Date;
  updatedAt: string | Date;
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
  targets?: ReviewTargetSummaryDto[];
  items?: ReviewTargetItemDto[];
  platformFeedback?: PlatformFeedbackDto | null;
}

export interface BarbershopReviewsResponseDto {
  reviews: ReviewItemDto[];
  total: number;
  averageRating: number;
  reviewCount: number;
}

export interface TargetReviewListItemDto {
  id: string;
  rating: number;
  overallRating: number;
  targetType: Exclude<ReviewTargetType, 'BARBERSHOP'>;
  targetId: string;
  targetLabel: string;
  comment?: string;
  createdAt: string | Date;
  author: {
    name: string;
    avatarUrl?: string;
  };
}

export interface TargetReviewsResponseDto {
  targetType: Exclude<ReviewTargetType, 'BARBERSHOP'>;
  targetId: string;
  reviews: TargetReviewListItemDto[];
  total: number;
  averageRating: number | null;
  reviewCount: number;
}

export interface ServiceRatingInputDto {
  bookingServiceItemId?: string | null;
  serviceId?: string | null;
  rating: number;
}

export interface PlatformFeedbackInputDto {
  rating?: number | null;
  comment?: string | null;
}

export interface CreateReviewRequestDto {
  rating?: number;
  barbershopRating?: number;
  barberId?: string | null;
  barberRating?: number;
  serviceRatings?: ServiceRatingInputDto[];
  comment?: string;
  platformFeedback?: PlatformFeedbackInputDto | null;
}

export interface UpdateReviewRequestDto {
  rating?: number;
  barbershopRating?: number;
  barberId?: string | null;
  barberRating?: number;
  serviceRatings?: ServiceRatingInputDto[];
  comment?: string;
  platformFeedback?: PlatformFeedbackInputDto | null;
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
