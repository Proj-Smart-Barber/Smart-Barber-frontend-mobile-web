// @vitest-environment happy-dom
import React from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mocks de dependências visuais e nativas no topo absoluto
vi.mock('@expo/vector-icons', () => ({
  Ionicons: (props: any) => <span data-testid={`icon-${props.name}`} {...props} />,
}));

vi.mock('expo-router', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  usePathname: () => '/availability',
  useNavigation: () => ({ dispatch: vi.fn() }),
}));

vi.mock('expo-router/react-navigation', () => ({
  usePreventRemove: vi.fn(),
}));

vi.mock('expo-blur', () => ({
  BlurView: ({ children, style }: any) => <div style={style}>{children}</div>,
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
  SafeAreaView: ({ children, style }: any) => <div style={style}>{children}</div>,
}));

const sessionMock = vi.hoisted(() => ({
  state: {
    status: 'authenticated',
    identity: { id: 'barber-001', name: 'Carlos Barbeiro' },
    selectedShopId: 'shop-unit-1',
    memberships: [
      { id: 'shop-unit-1', role: 'BARBERMAN', state: 'ACTIVE', timezone: 'America/Sao_Paulo' },
    ],
    barbershop: { id: 'shop-unit-1', name: 'Barbearia Central' },
  } as any,
}));

vi.mock('@/features/auth', () => ({
  useSession: () => sessionMock.state,
}));

vi.mock('@/shared/config/env', () => ({
  ENV: {
    AVAILABILITY_SOURCE: 'mock',
    BARBERSHOP_ID: 'shop-unit-1',
    API_URL: 'https://fixture.invalid',
    API_TIMEOUT_MS: 1000,
  },
}));

vi.mock('@/shared/navigation/navigation-context', () => ({
  useNavigation: () => ({
    openDrawer: vi.fn(),
    onContentScroll: vi.fn(),
    scrollCollapseProgress: {
      interpolate: () => 0,
    },
  }),
}));

import { ThemeProvider } from '@/shared/theme';
import { AvailabilityMockAdapter } from '../api/availability.mock';
import { availabilityRepository } from '../api/availability.api';
import { formatExceptionLabel } from '../model/availability.types';
import { ExceptionCard } from '../ui/ExceptionCard';
import { ExceptionForm } from '../ui/ExceptionForm';
import { BarberScheduleScreen } from '../ui/BarberScheduleScreen';

const repo = availabilityRepository as AvailabilityMockAdapter;
const SHOP = 'shop-unit-1';
const BARBER_ID = 'barber-001';

let client: QueryClient;

function renderWithProviders(ui: React.ReactElement) {
  return render(
    <QueryClientProvider client={client}>
      <ThemeProvider>{ui}</ThemeProvider>
    </QueryClientProvider>,
  );
}

describe('Fase 4 — Exceções, Folgas e Mensagens por Escopo', () => {
  beforeEach(async () => {
    window.localStorage.clear();
    client = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 60_000 } },
    });

    sessionMock.state.identity = { id: BARBER_ID, name: 'Carlos Barbeiro' };
    sessionMock.state.memberships = [
      { id: SHOP, role: 'BARBERMAN', state: 'ACTIVE', timezone: 'America/Sao_Paulo' },
    ];
    sessionMock.state.selectedShopId = SHOP;
    sessionMock.state.barbershop = { id: SHOP, name: 'Barbearia Central' };

    // Limpa exceções mock para isolamento de cada teste
    const allUnit = await repo.listExceptions(SHOP);
    for (const exc of allUnit) {
      await repo.removeException(SHOP, exc.id);
    }
    const allBarber = await repo.listExceptions(SHOP, BARBER_ID);
    for (const exc of allBarber) {
      await repo.removeException(SHOP, exc.id);
    }
  });

  afterEach(() => {
    cleanup();
    client.clear();
    vi.restoreAllMocks();
  });

  describe('1. Rótulos e Semântica de Bloqueio Parcial vs Folga Integral', () => {
    it('formata rótulos corretos para bloqueio parcial e folga integral individual', () => {
      const partialBlock = {
        id: 'exc-1',
        barbershopId: SHOP,
        barbermanId: BARBER_ID,
        date: '2026-11-20',
        openTime: '14:00',
        closeTime: '16:00',
        reason: 'Consulta médica',
      };
      expect(formatExceptionLabel(partialBlock)).toBe('Bloqueio: 14:00 – 16:00');

      const fullDayOff = {
        id: 'exc-2',
        barbershopId: SHOP,
        barbermanId: BARBER_ID,
        date: '2026-11-21',
        openTime: null,
        closeTime: null,
        reason: 'Folga pessoal',
      };
      expect(formatExceptionLabel(fullDayOff)).toBe('Folga de dia inteiro');

      const unitHoliday = {
        id: 'exc-3',
        barbershopId: SHOP,
        barbermanId: null,
        date: '2026-12-25',
        openTime: null,
        closeTime: null,
        reason: 'Natal',
      };
      expect(formatExceptionLabel(unitHoliday)).toBe('Unidade fechada');
    });

    it('ExceptionForm exibe "Início do bloqueio" e "Fim do bloqueio" no escopo individual', () => {
      const submitSpy = vi.fn().mockResolvedValue(true);
      renderWithProviders(
        <ExceptionForm
          mode="create"
          scope="individual"
          onSubmit={submitSpy}
        />,
      );

      // Clica para abrir o formulário
      fireEvent.click(screen.getByText('Adicionar folga ou bloqueio'));

      expect(screen.getByText('Início do bloqueio')).toBeTruthy();
      expect(screen.getByText('Fim do bloqueio')).toBeTruthy();
      expect(screen.getByText(/Deixe início e fim do bloqueio vazios para registrar folga de dia inteiro/i)).toBeTruthy();
      expect(screen.getByText('Salvar folga / bloqueio')).toBeTruthy();
    });

    it('ExceptionCard exibe badge "Bloqueio parcial" para exceção individual com intervalo', () => {
      const onEdit = vi.fn();
      const onRemove = vi.fn();
      renderWithProviders(
        <ExceptionCard
          exception={{
            id: 'exc-part',
            barbermanId: BARBER_ID,
            date: '2026-11-20',
            openTime: '14:00',
            closeTime: '16:00',
            reason: 'Compromisso',
          }}
          onEdit={onEdit}
          onRemove={onRemove}
        />,
      );

      expect(screen.getByText('Bloqueio parcial')).toBeTruthy();
      expect(screen.getByText('Bloqueio: 14:00 – 16:00')).toBeTruthy();
    });
  });

  describe('2. Fechamento Global Informativo Somente Leitura no Contexto Pessoal', () => {
    it('exibe fechamento da unidade como somente leitura e não permite edição/exclusão pelo profissional', async () => {
      // 1. Cadastra feriado geral na unidade
      await repo.createException(SHOP, {
        barbermanId: null,
        date: '2026-12-25',
        openTime: null,
        closeTime: null,
        reason: 'Feriado de Natal',
      });

      // 2. Renderiza a tela do profissional
      renderWithProviders(
        <BarberScheduleScreen
          barbershopId={SHOP}
          barbermanId={BARBER_ID}
          barberName="Carlos Barbeiro"
          hideTopBar
        />,
      );

      await waitFor(() => {
        expect(screen.getByText(/FECHAMENTOS GERAIS DA UNIDADE \(SOMENTE LEITURA\)/i)).toBeTruthy();
      });

      expect(screen.getByText('Feriado de Natal')).toBeTruthy();
      expect(screen.getByText('Unidade fechada (Geral)')).toBeTruthy();

      // Card somente leitura não possui botões de ação com os rótulos de editar/remover desta exceção
      expect(screen.queryByLabelText(/Remover exceção de 25\/12\/2026/i)).toBeNull();
      expect(screen.queryByLabelText(/Editar exceção de 25\/12\/2026/i)).toBeNull();
    });
  });

  describe('3. CRUD de Exceções com Preservação de Formulário em Erro', () => {
    it('preserva dados preenchidos quando submissão falha por erro de validação ou conflito', async () => {
      const submitSpy = vi.fn().mockResolvedValue(false); // Simula falha/rejeição
      renderWithProviders(
        <ExceptionForm
          mode="create"
          scope="individual"
          onSubmit={submitSpy}
        />,
      );

      fireEvent.click(screen.getByText('Adicionar folga ou bloqueio'));

      // Preenche os campos
      fireEvent.change(screen.getByLabelText(/Data/i), { target: { value: '2026-11-25' } });
      fireEvent.change(screen.getByLabelText(/Horário de início do bloqueio/i), { target: { value: '10:00' } });
      fireEvent.change(screen.getByLabelText(/Horário de fim do bloqueio/i), { target: { value: '12:00' } });
      fireEvent.change(screen.getByLabelText(/Motivo da exceção/i), { target: { value: 'Treinamento externo' } });

      // Submete
      await act(async () => {
        fireEvent.click(screen.getByText('Salvar folga / bloqueio'));
      });

      expect(submitSpy).toHaveBeenCalledTimes(1);

      // Como o submit retornou false, os campos permanecem exatamente com os valores preenchidos
      expect((screen.getByLabelText(/Data/i) as HTMLInputElement).value).toBe('2026-11-25');
      expect((screen.getByLabelText(/Horário de início do bloqueio/i) as HTMLInputElement).value).toBe('10:00');
      expect((screen.getByLabelText(/Horário de fim do bloqueio/i) as HTMLInputElement).value).toBe('12:00');
      expect((screen.getByLabelText(/Motivo da exceção/i) as HTMLInputElement).value).toBe('Treinamento externo');
    });

    it('exclui exceção e remove da lista reativamente', async () => {
      const onRemove = vi.fn();
      renderWithProviders(
        <ExceptionCard
          exception={{
            id: 'exc-to-delete',
            barbermanId: BARBER_ID,
            date: '2026-11-30',
            openTime: null,
            closeTime: null,
            reason: 'Folga pontual',
          }}
          onEdit={vi.fn()}
          onRemove={onRemove}
        />,
      );

      const deleteBtn = screen.getByLabelText(/Remover exceção de 30\/11\/2026/i);
      fireEvent.click(deleteBtn);

      expect(onRemove).toHaveBeenCalledWith('exc-to-delete');
    });
  });
});
