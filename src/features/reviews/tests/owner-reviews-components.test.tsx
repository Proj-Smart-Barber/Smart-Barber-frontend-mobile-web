// @vitest-environment happy-dom
import React from 'react';
import {
  render,
  screen,
  cleanup,
  fireEvent,
  waitFor,
} from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ThemeProvider } from '@/shared/theme';
import { ApiError } from '@/shared/api/api-errors';
import type { ReviewSummaryMetricsDto } from '../api/owner-reviews.types';

const routerMock = vi.hoisted(() => ({ replace: vi.fn(), push: vi.fn() }));
const sessionState = vi.hoisted(() => ({
  identity: { id: 'owner-1', role: 'OWNER' },
  staff: null,
  barbershop: { id: 'shop-1', name: 'Barbearia Alpha' },
  selectedShopId: 'shop-1',
  isOwner: true,
  memberships: [{ id: 'shop-1', state: 'ACTIVE', role: 'OWNER' }],
}));

const ownerReviewsApiMock = vi.hoisted(() => ({
  getSummary: vi.fn(),
  getServiceMetrics: vi.fn(),
  getProfessionalMetrics: vi.fn(),
  getFeedbacks: vi.fn(),
}));

const reportMutateAsyncMock = vi.hoisted(() => vi.fn());

vi.mock('expo-router', () => ({ useRouter: () => routerMock }));
vi.mock('expo-blur', () => ({
  BlurView: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
}));
vi.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 44, bottom: 34, left: 0, right: 0 }),
}));
vi.mock('@/shared/navigation', () => ({
  LiquidGlassView: ({ children, style }: any) =>
    React.createElement('div', { style }, children),
}));
vi.mock('expo-haptics', () => ({
  impactAsync: vi.fn(),
  ImpactFeedbackStyle: { Light: 'light' },
}));
vi.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
vi.mock('@/features/auth', () => ({ useSession: () => sessionState }));
vi.mock('../api/owner-reviews.api', () => ({
  ownerReviewsApi: ownerReviewsApiMock,
}));
vi.mock('../model/use-reviews', async () => {
  const actual = (await vi.importActual('../model/use-reviews')) as Record<
    string,
    unknown
  >;
  return {
    ...actual,
    useReportReview: () => ({
      isPending: false,
      mutateAsync: reportMutateAsyncMock,
    }),
  };
});

import OwnerReviewsScreen from '../../../app/(app)/reviews';
import { ReviewMetricsSummaryCard } from '../ui/owner/ReviewMetricsSummaryCard';
import { OwnerServicesTab } from '../ui/owner/OwnerServicesTab';
import { OwnerFeedbacksTab } from '../ui/owner/OwnerFeedbacksTab';
import { invalidateRelevantReviewCaches } from '../model/use-reviews';

function createQueryWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
    },
  });
  return {
    queryClient,
    Wrapper: ({ children }: React.PropsWithChildren) => (
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>{children}</ThemeProvider>
      </QueryClientProvider>
    ),
  };
}

function makeSummary(
  overrides: Partial<ReviewSummaryMetricsDto> = {},
): ReviewSummaryMetricsDto {
  return {
    metrics: {
      averageRating: 4.5,
      reviewCount: 10,
      distribution: { 1: 0, 2: 0, 3: 1, 4: 3, 5: 6 },
      percentage1to2Stars: 0,
      isSmallSample: false,
    },
    comparison: {
      previousPeriodStart: '2026-09-15T00:00:00.000Z',
      previousPeriodEnd: '2026-10-15T00:00:00.000Z',
      previousAverageRating: 4.2,
      previousReviewCount: 8,
      ratingDiff: 0.3,
      reviewCountDiff: 2,
    },
    responseRate: {
      cohortCompletedBookings: 12,
      reviewedBookings: 10,
      ratePercentage: 83.3,
      cohortDefinition: 'Atendimentos concluídos no período',
      originScope: 'CUSTOMER',
    },
    serviceCoverage: {
      totalActiveServices: 5,
      evaluatedActiveServices: 4,
      coveragePercentage: 80,
      scope: 'PERIOD',
    },
    latestReview: null,
    granularity: 'WEEK',
    timeSeries: [
      {
        bucketStart: '2026-11-01T00:00:00.000Z',
        bucketEnd: '2026-11-08T00:00:00.000Z',
        label: '01/11',
        averageRating: 4.5,
        reviewCount: 4,
      },
      {
        bucketStart: '2026-11-08T00:00:00.000Z',
        bucketEnd: '2026-11-15T00:00:00.000Z',
        label: '08/11',
        averageRating: null,
        reviewCount: 0,
      },
    ],
    flags: {
      hasAnyReviews: true,
      hasDemoReviews: false,
      hasCustomerReviews: true,
      hasUnknownReviews: false,
      isDemoEnvironment: false,
      isMixedEnvironment: false,
      appliedSource: 'CUSTOMER',
    },
    period: {
      startDate: '2026-10-15T00:00:00.000Z',
      endDate: '2026-11-15T00:00:00.000Z',
      timezone: 'America/Sao_Paulo',
    },
    ...overrides,
  };
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('Owner Reviews Components Regression Suite', () => {
  it('renders ReviewErrorBanner instead of endless Skeleton when summary fails with network/500/401', async () => {
    ownerReviewsApiMock.getSummary.mockRejectedValueOnce(
      new ApiError('Erro de conexão', 0, undefined, true),
    );
    ownerReviewsApiMock.getServiceMetrics.mockResolvedValue({
      items: [],
      page: 1,
      limit: 10,
      totalItems: 0,
      totalPages: 1,
      totalServices: 0,
      evaluatedServices: 0,
      coveragePercentage: 0,
    });

    const { Wrapper } = createQueryWrapper();
    render(
      <Wrapper>
        <OwnerReviewsScreen />
      </Wrapper>,
    );

    await waitFor(() => {
      expect(screen.getByText(/Sem conexão com a internet/i)).toBeDefined();
      expect(screen.getByText('Tentar novamente')).toBeDefined();
    });
  });

  it('does NOT auto-switch CUSTOMER to DEMO when isDemoEnvironment is true, offering explicit opt-in button instead', async () => {
    const emptyCustomerDemoSummary = makeSummary({
      metrics: {
        averageRating: null,
        reviewCount: 0,
        distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
        percentage1to2Stars: 0,
        isSmallSample: true,
      },
      flags: {
        hasAnyReviews: true,
        hasDemoReviews: true,
        hasCustomerReviews: false,
        hasUnknownReviews: false,
        isDemoEnvironment: true,
        isMixedEnvironment: false,
        appliedSource: 'CUSTOMER',
      },
    });

    ownerReviewsApiMock.getSummary.mockResolvedValue(emptyCustomerDemoSummary);
    ownerReviewsApiMock.getServiceMetrics.mockResolvedValue({
      items: [],
      page: 1,
      limit: 10,
      totalItems: 0,
      totalPages: 1,
      totalServices: 0,
      evaluatedServices: 0,
      coveragePercentage: 0,
    });

    const { Wrapper } = createQueryWrapper();
    render(
      <Wrapper>
        <OwnerReviewsScreen />
      </Wrapper>,
    );

    await waitFor(() => {
      expect(screen.getByText('Ver dados de demonstração')).toBeDefined();
    });
    // Still queried CUSTOMER without auto-switching to DEMO
    expect(ownerReviewsApiMock.getSummary).toHaveBeenCalledWith(
      'shop-1',
      expect.objectContaining({ source: 'CUSTOMER' }),
    );
  });

  it('shows warning banner when source is ALL and hasDemoReviews is true', () => {
    const mixedSummary = makeSummary({
      flags: {
        hasAnyReviews: true,
        hasDemoReviews: true,
        hasCustomerReviews: true,
        hasUnknownReviews: false,
        isDemoEnvironment: false,
        isMixedEnvironment: true,
        appliedSource: 'ALL',
      },
    });

    const { Wrapper } = createQueryWrapper();
    render(
      <Wrapper>
        <ReviewMetricsSummaryCard
          summary={mixedSummary}
          selectedSource="ALL"
          onSelectSource={vi.fn()}
          periodDays={30}
          onSelectPeriodDays={vi.fn()}
        />
      </Wrapper>,
    );

    expect(
      screen.getByText(/Aviso: média inclui avaliações demonstrativas/i),
    ).toBeDefined();
  });

  it('paginates OwnerServicesTab, displays global coverage, and resets page on source change', async () => {
    ownerReviewsApiMock.getServiceMetrics.mockResolvedValue({
      items: [
        {
          serviceId: 'srv-1',
          serviceName: 'Corte Social',
          isActive: true,
          averageRating: 4.8,
          reviewCount: 6,
          percentage1to2Stars: 0,
          isSmallSample: false,
          completedBookingsCount: 8,
          absenceReason: null,
        },
      ],
      page: 1,
      limit: 10,
      total: 12,
      hasNext: true,
      totalServices: 12,
      evaluatedServices: 10,
      coveragePercentage: 83.3,
    });

    const { Wrapper } = createQueryWrapper();
    const view = render(
      <Wrapper>
        <OwnerServicesTab
          shopId="shop-1"
          source="CUSTOMER"
          onSelectServiceToFilter={vi.fn()}
        />
      </Wrapper>,
    );

    await waitFor(() => {
      expect(screen.getByText(/Cobertura global no período: 10\/12 avaliados \(83.3%\)/)).toBeDefined();
      expect(screen.getByText('Página 1 de 2')).toBeDefined();
    });

    fireEvent.click(screen.getByLabelText('Próxima página de serviços'));
    await waitFor(() => {
      expect(ownerReviewsApiMock.getServiceMetrics).toHaveBeenLastCalledWith(
        'shop-1',
        expect.objectContaining({ page: 2, limit: 10 }),
      );
    });

    // Changing source resets page back to 1
    view.rerender(
      <Wrapper>
        <OwnerServicesTab
          shopId="shop-1"
          source="DEMO"
          onSelectServiceToFilter={vi.fn()}
        />
      </Wrapper>,
    );

    await waitFor(() => {
      expect(ownerReviewsApiMock.getServiceMetrics).toHaveBeenLastCalledWith(
        'shop-1',
        expect.objectContaining({ source: 'DEMO', page: 1 }),
      );
    });
  });

  it('supports 3-way comment filter and duplicate 409 report handling in OwnerFeedbacksTab', async () => {
    ownerReviewsApiMock.getFeedbacks.mockResolvedValue({
      items: [
        {
          id: 'rev-1',
          createdAt: '2026-11-10T10:00:00.000Z',
          source: 'CUSTOMER',
          barbershopRating: 5,
          generalComment: 'Excelente atendimento',
          customer: { id: 'cust-1', name: 'Marcos Silva' },
          items: [],
        },
      ],
      total: 1,
      page: 1,
      limit: 10,
      hasNext: false,
    });

    reportMutateAsyncMock.mockRejectedValueOnce(
      new ApiError('ALREADY_REPORTED', 409),
    );

    const { Wrapper } = createQueryWrapper();
    render(
      <Wrapper>
        <OwnerFeedbacksTab shopId="shop-1" source="CUSTOMER" />
      </Wrapper>,
    );

    await waitFor(() => {
      expect(screen.getByText('Marcos Silva')).toBeDefined();
    });

    fireEvent.click(screen.getByLabelText('Comentário: Sem comentário'));
    await waitFor(() => {
      expect(ownerReviewsApiMock.getFeedbacks).toHaveBeenLastCalledWith(
        'shop-1',
        expect.objectContaining({ hasComment: false }),
      );
    });

    fireEvent.click(screen.getByLabelText('Denunciar avaliação de Marcos Silva'));
    fireEvent.change(screen.getByLabelText('Motivo da denúncia'), {
      target: { value: 'Comentário impróprio para avaliação' },
    });
    fireEvent.click(screen.getByText('Enviar denúncia'));

    await waitFor(() => {
      expect(
        screen.getByText('Você já denunciou esta avaliação anteriormente.'),
      ).toBeDefined();
    });
  });

  it('invalidates owner-reviews prefix for the affected barbershop on review mutations', async () => {
    const queryClient = new QueryClient();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    await invalidateRelevantReviewCaches(queryClient, {
      barbershopId: 'shop-1',
    });

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ['owner-reviews', 'shop-1'],
    });
  });
});
