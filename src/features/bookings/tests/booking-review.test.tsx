// @vitest-environment happy-dom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('@expo/vector-icons', () => ({
  Ionicons: (props: any) => React.createElement('span', { 'data-testid': `icon-${props.name}`, ...props }),
}));

vi.mock('expo-router', () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn() }),
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
  LiquidGlassView: ({ children, style }: any) => React.createElement('div', { style }, children),
}));

import { ThemeProvider } from '@/shared/theme';
import { BookingReview } from '../ui/BookingReview';
import type { Service } from '@/features/services/model/service.types';

const mockServices: Service[] = [
  {
    id: 'srv-1',
    barbershopId: 'shop-1',
    title: 'Corte Degradê Navalhado',
    description: 'Corte completo com acabamento navalhado',
    priceInCents: 6000,
    durationInMinutes: 45,
    isActive: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'srv-2',
    barbershopId: 'shop-1',
    title: 'Barba Terapia e Toalha Quente',
    description: 'Tratamento completo com hidratação',
    priceInCents: 4500,
    durationInMinutes: 30,
    isActive: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
];

describe('BookingReview (C-010 e C-011)', () => {
  it('exibe o botão canônico "Alterar serviços" com tamanho adequado e dispara onEditServices', () => {
    const onEditServices = vi.fn();
    render(
      <ThemeProvider>
        <BookingReview
          mode="PERSONAL"
          shopId="shop-1"
          barbershopName="The Obsidian Atelier"
          selectedServices={mockServices}
          selectedProfessional={{
            id: 'barber-1',
            name: 'Carlos Silva',
            role: 'BARBER',
          }}
          selectedDate="2026-11-11"
          selectedSlot={{
            start: '2026-11-11T09:00:00.000Z',
            end: '2026-11-11T10:15:00.000Z',
            startTime: '09:00',
            slotStartAt: '2026-11-11T09:00:00.000Z',
          }}
          customer={{ id: 'c-1', name: 'Wellington', isEligible: true }}
          totalPriceInCents={10500}
          totalDurationInMinutes={75}
          isAuthenticated={true}
          isSubmitting={false}
          quoteMismatch={false}
          onConfirm={vi.fn()}
          onEditServices={onEditServices}
          onEditSlot={vi.fn()}
        />
      </ThemeProvider>,
    );

    const editBtn = screen.getByRole('button', { name: /alterar serviços/i });
    expect(editBtn).toBeTruthy();
    fireEvent.click(editBtn);
    expect(onEditServices).toHaveBeenCalledTimes(1);
  });

  it('desabilita o botão "Alterar serviços" durante o envio (isSubmitting = true)', () => {
    const onEditServices = vi.fn();
    render(
      <ThemeProvider>
        <BookingReview
          mode="PERSONAL"
          shopId="shop-1"
          barbershopName="The Obsidian Atelier"
          selectedServices={mockServices}
          selectedProfessional={{
            id: 'barber-1',
            name: 'Carlos Silva',
            role: 'BARBER',
          }}
          selectedDate="2026-11-11"
          selectedSlot={{
            start: '2026-11-11T09:00:00.000Z',
            end: '2026-11-11T10:15:00.000Z',
            startTime: '09:00',
            slotStartAt: '2026-11-11T09:00:00.000Z',
          }}
          customer={{ id: 'c-1', name: 'Wellington', isEligible: true }}
          totalPriceInCents={10500}
          totalDurationInMinutes={75}
          isAuthenticated={true}
          isSubmitting={true}
          quoteMismatch={false}
          onConfirm={vi.fn()}
          onEditServices={onEditServices}
          onEditSlot={vi.fn()}
        />
      </ThemeProvider>,
    );

    const editBtn = screen.getByRole('button', { name: /alterar serviços/i });
    expect(editBtn).toBeTruthy();
    expect(editBtn.getAttribute('aria-disabled')).toBe('true');
  });

  it('formata data e horário de forma humana e legível, sem expor YYYY-MM-DD cru ou "Você (Pessoal)"', () => {
    render(
      <ThemeProvider>
        <BookingReview
          mode="PERSONAL"
          shopId="shop-1"
          barbershopName="The Obsidian Atelier"
          selectedServices={mockServices}
          selectedProfessional={{
            id: 'barber-1',
            name: 'Carlos Silva',
            role: 'BARBER',
          }}
          selectedDate="2026-11-11"
          selectedSlot={{
            start: '2026-11-11T09:00:00.000Z',
            end: '2026-11-11T10:15:00.000Z',
            startTime: '09:00',
            slotStartAt: '2026-11-11T09:00:00.000Z',
          }}
          customer={{ id: 'c-1', name: 'Wellington', isEligible: true }}
          totalPriceInCents={10500}
          totalDurationInMinutes={75}
          isAuthenticated={true}
          isSubmitting={false}
          quoteMismatch={false}
          onConfirm={vi.fn()}
          onEditServices={vi.fn()}
          onEditSlot={vi.fn()}
        />
      </ThemeProvider>,
    );

    // Data formatada com dia da semana, dia, mês por extenso e ano
    expect(screen.getByText(/11 de novembro de 2026/)).toBeTruthy();
    expect(screen.queryByText('2026-11-11')).toBeNull();

    // Horário separado
    expect(screen.getByText('09:00')).toBeTruthy();

    // Cliente exibe "Você" no modo pessoal
    expect(screen.getByText('Você')).toBeTruthy();
    expect(screen.queryByText('Você (Pessoal)')).toBeNull();

    // Barbearia e Profissional
    expect(screen.getByText('The Obsidian Atelier')).toBeTruthy();
    expect(screen.getByText('Carlos Silva')).toBeTruthy();

    // Serviços e total previsto
    expect(screen.getByText('Corte Degradê Navalhado')).toBeTruthy();
    expect(screen.getByText('Barba Terapia e Toalha Quente')).toBeTruthy();
    expect(screen.getByText(/R\$\s*105,00/)).toBeTruthy();
  });

  it('preserva dados do cliente da unidade no modo UNIT', () => {
    render(
      <ThemeProvider>
        <BookingReview
          mode="UNIT"
          shopId="shop-1"
          barbershopName="The Obsidian Atelier"
          selectedServices={mockServices}
          selectedProfessional={{
            id: 'barber-1',
            name: 'Carlos Silva',
            role: 'BARBER',
          }}
          selectedDate="2026-11-11"
          selectedSlot={{
            start: '2026-11-11T09:00:00.000Z',
            end: '2026-11-11T10:15:00.000Z',
            startTime: '09:00',
            slotStartAt: '2026-11-11T09:00:00.000Z',
          }}
          customer={{ id: 'c-2', name: 'João Santos', isEligible: true }}
          totalPriceInCents={10500}
          totalDurationInMinutes={75}
          isAuthenticated={true}
          isSubmitting={false}
          quoteMismatch={false}
          onConfirm={vi.fn()}
          onEditServices={vi.fn()}
          onEditSlot={vi.fn()}
        />
      </ThemeProvider>,
    );

    expect(screen.getByText('João Santos')).toBeTruthy();
  });
});
