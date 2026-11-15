export type StarDistributionDto = {
  1: number;
  2: number;
  3: number;
  4: number;
  5: number;
};

export type ReviewSourceDto = 'CUSTOMER' | 'DEMO' | 'ALL';

export interface ReviewSummaryMetricsDto {
  metrics: {
    averageRating: number | null;
    reviewCount: number;
    distribution: StarDistributionDto;
    percentage1to2Stars: number;
    isSmallSample: boolean;
  };
  comparison: {
    previousPeriodStart: string;
    previousPeriodEnd: string;
    previousAverageRating: number | null;
    previousReviewCount: number;
    ratingDiff: number | null;
    reviewCountDiff: number;
  };
  responseRate: {
    cohortCompletedBookings: number;
    reviewedBookings: number;
    ratePercentage: number | null;
    cohortDefinition: string;
  };
  serviceCoverage: {
    totalActiveServices: number;
    evaluatedActiveServices: number;
    coveragePercentage: number | null;
  };
  latestReview: {
    id: string;
    createdAt: string;
    rating: number;
    comment: string | null;
    customerName: string;
    source: 'CUSTOMER' | 'DEMO';
  } | null;
  flags: {
    hasAnyReviews: boolean;
    hasDemoReviews: boolean;
    hasCustomerReviews: boolean;
    isDemoEnvironment: boolean;
    appliedSource: ReviewSourceDto;
  };
  period: {
    startDate: string;
    endDate: string;
    timezone: string;
  };
}

export interface ServiceReviewMetricItemDto {
  serviceId: string;
  serviceName: string;
  isActive: boolean;
  averageRating: number | null;
  reviewCount: number;
  distribution: StarDistributionDto;
  percentage1to2Stars: number;
  isSmallSample: boolean;
  lastReviewAt: string | null;
  completedBookingsCount: number;
  unreviewedBookingsCount: number;
  absenceReason: 'NO_COMPLETED_BOOKINGS' | 'NO_CUSTOMER_FEEDBACK' | null;
}

export interface ServiceMetricsResponseDto {
  items: ServiceReviewMetricItemDto[];
  totalServices: number;
  evaluatedServices: number;
  coveragePercentage: number | null;
}

export interface ProfessionalReviewMetricItemDto {
  professionalId: string;
  name: string;
  avatarUrl: string | null;
  averageRating: number | null;
  reviewCount: number;
  distribution: StarDistributionDto;
  percentage1to2Stars: number;
  isSmallSample: boolean;
  lastReviewAt: string | null;
}

export interface ProfessionalMetricsResponseDto {
  items: ProfessionalReviewMetricItemDto[];
  totalProfessionals: number;
}

export interface OwnerFeedbackReviewItemDto {
  targetType: 'BARBERSHOP' | 'BARBER' | 'SERVICE';
  targetId: string | null;
  targetLabel: string;
  rating: number;
}

export interface OwnerFeedbackItemDto {
  id: string;
  bookingId: string;
  source: 'CUSTOMER' | 'DEMO';
  createdAt: string;
  customer: {
    name: string;
    avatarUrl: string | null;
  };
  generalComment: string | null;
  barbershopRating: number;
  items: OwnerFeedbackReviewItemDto[];
}

export interface FeedbacksResponseDto {
  items: OwnerFeedbackItemDto[];
  page: number;
  limit: number;
  total: number;
  hasNext: boolean;
}

export interface OwnerReviewSummaryFilters {
  [key: string]: string | number | boolean | undefined;
  startDate?: string;
  endDate?: string;
  source?: ReviewSourceDto;
}

export interface OwnerServiceMetricsFilters {
  [key: string]: string | number | boolean | undefined;
  startDate?: string;
  endDate?: string;
  source?: ReviewSourceDto;
  includeInactive?: boolean;
}

export interface OwnerProfessionalMetricsFilters {
  [key: string]: string | number | boolean | undefined;
  startDate?: string;
  endDate?: string;
  source?: ReviewSourceDto;
}

export interface OwnerFeedbacksFilters {
  [key: string]: string | number | boolean | undefined;
  startDate?: string;
  endDate?: string;
  source?: ReviewSourceDto;
  targetType?: 'ALL' | 'BARBERSHOP' | 'BARBER' | 'SERVICE';
  targetId?: string;
  rating?: number;
  hasComment?: boolean;
  page?: number;
  limit?: number;
}
