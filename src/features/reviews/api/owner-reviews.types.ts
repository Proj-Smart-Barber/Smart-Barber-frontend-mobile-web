export type StarDistributionDto = {
  1: number;
  2: number;
  3: number;
  4: number;
  5: number;
};

export type ReviewDataSourceDto = 'CUSTOMER' | 'DEMO' | 'UNKNOWN';
export type ReviewSourceDto = 'CUSTOMER' | 'DEMO' | 'UNKNOWN' | 'ALL';
export type ReviewTimeSeriesGranularityDto = 'WEEK' | 'MONTH';

export interface ReviewTimeSeriesPointDto {
  bucketStart: string;
  bucketEnd: string;
  label: string;
  reviewCount: number;
  averageRating: number | null;
}

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
  timeSeries: ReviewTimeSeriesPointDto[];
  granularity: ReviewTimeSeriesGranularityDto;
  responseRate: {
    cohortCompletedBookings: number;
    reviewedBookings: number;
    ratePercentage: number | null;
    cohortDefinition: string;
    originScope: ReviewSourceDto;
  };
  serviceCoverage: {
    totalActiveServices: number;
    evaluatedActiveServices: number;
    coveragePercentage: number | null;
    scope: 'PERIOD';
  };
  latestReview: {
    id: string;
    createdAt: string;
    rating: number;
    comment: string | null;
    customerName: string;
    source: ReviewDataSourceDto;
  } | null;
  flags: {
    hasAnyReviews: boolean;
    hasDemoReviews: boolean;
    hasCustomerReviews: boolean;
    hasUnknownReviews: boolean;
    isDemoEnvironment: boolean;
    isMixedEnvironment: boolean;
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
  page: number;
  limit: number;
  total: number;
  hasNext: boolean;
}

export interface ProfessionalReviewMetricItemDto {
  professionalId: string;
  name: string;
  avatarUrl: string | null;
  isActive: boolean;
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
  page: number;
  limit: number;
  total: number;
  hasNext: boolean;
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
  source: ReviewDataSourceDto;
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
  granularity?: ReviewTimeSeriesGranularityDto;
}

export interface OwnerServiceMetricsFilters {
  [key: string]: string | number | boolean | undefined;
  startDate?: string;
  endDate?: string;
  source?: ReviewSourceDto;
  includeInactive?: boolean;
  page?: number;
  limit?: number;
}

export interface OwnerProfessionalMetricsFilters {
  [key: string]: string | number | boolean | undefined;
  startDate?: string;
  endDate?: string;
  source?: ReviewSourceDto;
  page?: number;
  limit?: number;
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
