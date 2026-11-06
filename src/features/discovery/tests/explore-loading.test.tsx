// @vitest-environment happy-dom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@/shared/theme';
import { ExploreFeedView } from '../ui/ExploreFeedView';
import * as useExploreFeedModule from '../model/use-explore-feed';

vi.mock('expo-router', () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn() }),
}));

vi.mock('@expo/vector-icons', () => ({
  Ionicons: (props: any) => <span data-testid={`icon-${props.name}`} {...props} />,
}));

vi.mock('expo-haptics', () => ({
  notificationAsync: vi.fn(),
  selectionAsync: vi.fn(),
  impactAsync: vi.fn(),
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
}));

vi.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 44, bottom: 34, left: 0, right: 0 }),
}));

describe('ExploreFeedView Loading Behavior', () => {
  it('renderiza LoadingRegion com ExploreFeedSkeleton e aria-busy quando isLoading=true e items=[]', () => {
    vi.spyOn(useExploreFeedModule, 'useExploreFeed').mockReturnValue({
      items: [],
      isLoading: true,
      isFetchingNextPage: false,
      hasNextPage: false,
      error: null,
      mode: 'ALL',
      radiusKm: 25,
      searchQuery: '',
      regionKey: '',
      setRegionKey: vi.fn(),
      locationSession: { state: 'idle', generationId: 'g1' } as any,
      isProximityUnavailable: false,
      fetchNextPage: vi.fn(),
      refetch: vi.fn(),
      setMode: vi.fn(),
      setRadius: vi.fn(),
      setSearchQuery: vi.fn(),
    });

    const queryClient = new QueryClient();

    render(
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <ExploreFeedView />
        </ThemeProvider>
      </QueryClientProvider>
    );

    const region = screen.getByRole('region', { name: /carregando experiências do feed explorar/i });
    expect(region).toBeDefined();
    expect(region.getAttribute('aria-busy')).toBe('true');
  });
});
