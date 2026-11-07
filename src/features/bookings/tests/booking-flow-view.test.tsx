// @vitest-environment happy-dom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

const mockBack = vi.fn();
vi.mock('expo-router', () => ({
  useRouter: () => ({ push: vi.fn(), back: mockBack }),
}));

vi.mock('@expo/vector-icons', () => ({
  Ionicons: (props: any) => React.createElement('span', { 'data-testid': `icon-${props.name}`, ...props }),
}));

vi.mock('expo-haptics', () => ({
  notificationAsync: vi.fn(),
  selectionAsync: vi.fn(),
  impactAsync: vi.fn(),
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
}));

vi.mock('expo-blur', () => ({
  BlurView: ({ children, style }: any) => React.createElement('div', { style }, children),
}));

vi.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 44, bottom: 34, left: 0, right: 0 }),
}));

vi.mock('@/shared/navigation/LiquidGlassView', () => ({
  LiquidGlassView: ({ children, style, testID }: any) =>
    React.createElement('div', { 'data-testid': testID || 'liquid-glass-view', style }, children),
}));

vi.mock('@/features/auth', () => ({
  useSession: () => ({
    status: 'authenticated',
    identity: { id: 'client-1', name: 'Cliente Teste' },
    token: 'test-token',
  }),
}));

const mockGoToStep = vi.fn();
let currentFlowStep = 'REVIEW';

vi.mock('../model/use-booking-flow', () => ({
  useBookingFlow: () => ({
    step: currentFlowStep,
    goToStep: mockGoToStep,
    barbershop: { id: 'shop-1', name: 'The Obsidian Atelier' },
    services: [],
    selectedServices: [],
    selectedServiceIds: ['srv-1'],
    selectedProfessional: null,
    selectedDate: '2026-11-11',
    selectedSlot: null,
    customer: { id: 'c-1', name: 'Wellington' },
    totalPriceInCents: 6000,
    totalDurationInMinutes: 45,
    isSubmitting: false,
    quoteMismatch: false,
    toggleService: vi.fn(),
    selectProfessional: vi.fn(),
    selectDate: vi.fn(),
    selectSlot: vi.fn(),
    confirmBooking: vi.fn(),
    reset: vi.fn(),
  }),
}));

import { ThemeProvider } from '@/shared/theme';
import { BookingFlowView } from '../ui/BookingFlowView';

describe('BookingFlowView (C-009)', () => {
  beforeEach(() => {
    mockBack.mockClear();
    mockGoToStep.mockClear();
    currentFlowStep = 'REVIEW';
  });

  it('no modo PERSONAL, cabeçalho é transparente, sem container LiquidGlassView e sem numeração repetida', () => {
    render(
      <ThemeProvider>
        <BookingFlowView
          options={{
            mode: 'PERSONAL',
            shopId: 'shop-1',
          }}
        />
      </ThemeProvider>,
    );

    // No modo PERSONAL, o header usa View transparente em vez de LiquidGlassView
    expect(screen.getByTestId('booking-header-personal')).toBeTruthy();
    expect(screen.queryByTestId('booking-header-unit')).toBeNull();

    // Título do passo sem numeração fixa "4."
    expect(screen.getByText('Revisar agendamento')).toBeTruthy();
    expect(screen.queryByText(/4\.\s*Revis/)).toBeNull();

    // Subtítulo da barbearia
    expect(screen.getAllByText('The Obsidian Atelier').length).toBeGreaterThanOrEqual(1);
  });

  it('no modo UNIT, cabeçalho preserva LiquidGlassView e numeração com badge de progresso', () => {
    render(
      <ThemeProvider>
        <BookingFlowView
          options={{
            mode: 'UNIT',
            shopId: 'shop-1',
          }}
        />
      </ThemeProvider>,
    );

    // No modo UNIT, o header usa LiquidGlassView com borda e card
    expect(screen.getByTestId('booking-header-unit')).toBeTruthy();
    expect(screen.queryByTestId('booking-header-personal')).toBeNull();

    // Título do passo com numeração canônica
    expect(screen.getByText('4. Revisão e Confirmação')).toBeTruthy();
    expect(screen.getByText('Passo 4 de 4')).toBeTruthy();
  });

  it('navegação para trás no passo REVIEW volta para SLOT via flow.goToStep', () => {
    render(
      <ThemeProvider>
        <BookingFlowView
          options={{
            mode: 'PERSONAL',
            shopId: 'shop-1',
          }}
        />
      </ThemeProvider>,
    );

    const backButton = screen.getByRole('button', { name: /voltar passo anterior/i });
    expect(backButton).toBeTruthy();
    fireEvent.click(backButton);

    expect(mockGoToStep).toHaveBeenCalledWith('SLOT');
  });

  it('navegação para trás no passo SERVICES chama onExit quando fornecido', () => {
    currentFlowStep = 'SERVICES';
    const onExit = vi.fn();

    render(
      <ThemeProvider>
        <BookingFlowView
          options={{
            mode: 'PERSONAL',
            shopId: 'shop-1',
          }}
          onExit={onExit}
        />
      </ThemeProvider>,
    );

    const backButton = screen.getByRole('button', { name: /voltar passo anterior/i });
    fireEvent.click(backButton);

    expect(onExit).toHaveBeenCalledTimes(1);
    expect(mockBack).not.toHaveBeenCalled();
  });
});
