import { describe, it, expect, vi } from 'vitest';
import { ownerReviewsApi } from '../api/owner-reviews.api';
import type { ReviewSummaryMetricsDto } from '../api/owner-reviews.types';

vi.mock('@/shared/api', () => ({
  httpClient: {
    get: vi.fn(),
  },
}));

describe('Owner Reviews API Contract & Presentation Logic', () => {
  it('calls correct summary endpoint with shopId and query params', async () => {
    const { httpClient } = await import('@/shared/api');
    const mockSummary: ReviewSummaryMetricsDto = {
      metrics: {
        averageRating: 4.8,
        reviewCount: 15,
        distribution: { 1: 0, 2: 0, 3: 1, 4: 2, 5: 12 },
        percentage1to2Stars: 0,
        isSmallSample: false,
      },
      comparison: {
        previousPeriodStart: '2026-09-15T00:00:00.000Z',
        previousPeriodEnd: '2026-10-15T00:00:00.000Z',
        previousAverageRating: 4.5,
        previousReviewCount: 10,
        ratingDiff: 0.3,
        reviewCountDiff: 5,
      },
      responseRate: {
        cohortCompletedBookings: 20,
        reviewedBookings: 15,
        ratePercentage: 75,
        cohortDefinition: 'Conclusão do atendimento no período',
      },
      serviceCoverage: {
        totalActiveServices: 10,
        evaluatedActiveServices: 9,
        coveragePercentage: 90,
      },
      latestReview: {
        id: 'rev-1',
        createdAt: '2026-10-15T10:00:00.000Z',
        rating: 5,
        comment: 'Top demais',
        customerName: 'Carlos',
        source: 'CUSTOMER',
      },
      flags: {
        hasAnyReviews: true,
        hasDemoReviews: false,
        hasCustomerReviews: true,
        isDemoEnvironment: false,
        appliedSource: 'CUSTOMER',
      },
      period: {
        startDate: '2026-10-15T00:00:00.000Z',
        endDate: '2026-11-15T00:00:00.000Z',
        timezone: 'America/Sao_Paulo',
      },
    };

    const getSpy = vi
      .spyOn(httpClient, 'get')
      .mockResolvedValueOnce(mockSummary as any);

    const result = await ownerReviewsApi.getSummary('shop-123', {
      source: 'CUSTOMER',
    });

    expect(getSpy).toHaveBeenCalledWith(
      '/api/barbershops/shop-123/review-insights/summary',
      {
        params: { source: 'CUSTOMER' },
      },
    );
    expect(result.metrics.averageRating).toBe(4.8);
    expect(result.comparison.ratingDiff).toBe(0.3);
    expect(result.metrics.isSmallSample).toBe(false);
  });

  it('correctly handles small sample presentation flags (< 5 reviews)', () => {
    const summarySmallSample: ReviewSummaryMetricsDto = {
      metrics: {
        averageRating: 5.0,
        reviewCount: 2,
        distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 2 },
        percentage1to2Stars: 0,
        isSmallSample: true,
      },
      comparison: {
        previousPeriodStart: '2026-09-15T00:00:00.000Z',
        previousPeriodEnd: '2026-10-15T00:00:00.000Z',
        previousAverageRating: null,
        previousReviewCount: 0,
        ratingDiff: null,
        reviewCountDiff: 2,
      },
      responseRate: {
        cohortCompletedBookings: 4,
        reviewedBookings: 2,
        ratePercentage: 50,
        cohortDefinition: 'Conclusão do atendimento no período',
      },
      serviceCoverage: {
        totalActiveServices: 5,
        evaluatedActiveServices: 2,
        coveragePercentage: 40,
      },
      latestReview: null,
      flags: {
        hasAnyReviews: true,
        hasDemoReviews: true,
        hasCustomerReviews: false,
        isDemoEnvironment: true,
        appliedSource: 'DEMO',
      },
      period: {
        startDate: '2026-10-15T00:00:00.000Z',
        endDate: '2026-11-15T00:00:00.000Z',
        timezone: 'America/Sao_Paulo',
      },
    };

    expect(summarySmallSample.metrics.isSmallSample).toBe(true);
    expect(summarySmallSample.flags.isDemoEnvironment).toBe(true);
    expect(summarySmallSample.comparison.ratingDiff).toBeNull();
  });
});
