// @vitest-environment happy-dom
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@/shared/theme';
import { FinanceScreen } from '../ui/FinanceScreen';
import { financeApi, type FinancePeriod } from '../api/finance.api';

const session = vi.hoisted(() => ({
  identity: { id: 'owner' },
  selectedShopId: 'shop',
  memberships: [{ id: 'shop', role: 'OWNER', state: 'ACTIVE' }],
}));
vi.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
vi.mock('expo-blur', () => ({
  BlurView: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
}));
vi.mock('expo-router', () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn() }) }));
vi.mock('@/features/auth', () => ({ useSession: () => session }));
vi.mock('@expo/vector-icons', () => ({ Ionicons: () => <span /> }));
vi.mock('expo-crypto', () => ({ randomUUID: () => '018b1234-5678-7000-8000-000000000001' }));
vi.mock('expo-haptics', () => ({ impactAsync: vi.fn(), ImpactFeedbackStyle: { Light: 'light' } }));

const entry = {
  id: 'expense',
  kind: 'EXPENSE' as const,
  category: 'FIXED',
  description: 'Aluguel',
  amountInCents: 10000,
  dueOn: '2026-11-15',
  paidOn: null,
  payee: '',
  status: 'PLANNED' as const,
  version: 1,
  bookingId: null,
};
const period: FinancePeriod = {
  month: '2026-11',
  today: '2026-11-11',
  timezone: 'America/Sao_Paulo',
  serverTime: '2026-11-11T12:00:00Z',
  entries: [entry],
  bookings: [],
  summary: {
    completedInCents: 20000,
    forecastInCents: 10000,
    receivedInCents: 0,
    paidInCents: 0,
    payableInCents: 10000,
    balanceInCents: 0,
    unknownPrices: 0,
    daily: [],
  },
};
function renderFinance() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <FinanceScreen />
      </ThemeProvider>
    </QueryClientProvider>,
  );
}
beforeEach(() => {
  vi.restoreAllMocks();
  session.selectedShopId = 'shop';
  session.memberships = [{ id: 'shop', role: 'OWNER', state: 'ACTIVE' }];
  vi.spyOn(financeApi, 'period').mockResolvedValue(period);
});

describe('Financeiro do proprietário', () => {
  it('recusa barbeiro sem buscar dados financeiros', () => {
    session.memberships[0].role = 'BARBERMAN';
    renderFinance();
    expect(screen.getByText(/proprietário ativo/)).toBeDefined();
    expect(financeApi.period).not.toHaveBeenCalled();
  });
  it('exibe recebimentos registrados separadamente dos serviços concluídos', async () => {
    renderFinance();
    await screen.findByText('Serviços concluídos');
    expect(screen.getByText('Recebido')).toBeDefined();
    expect(screen.getByText('Saldo do período')).toBeDefined();
  });
  it('reutiliza a chave após falha de criação e envia valores em centavos', async () => {
    const create = vi
      .spyOn(financeApi, 'create')
      .mockRejectedValueOnce(new Error('Falha temporária'))
      .mockResolvedValue(entry);
    renderFinance();
    await screen.findByText('Serviços concluídos');
    fireEvent.click(screen.getByRole('button', { name: 'Nova despesa' }));
    fireEvent.change(screen.getByLabelText('Descrição da despesa'), {
      target: { value: 'Aluguel' },
    });
    fireEvent.change(screen.getByLabelText('Valor da despesa em reais'), {
      target: { value: '1.234,56' },
    });
    fireEvent.change(screen.getByLabelText('Vencimento da despesa'), {
      target: { value: '15/11/2026' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar despesa' }));
    await screen.findByText('Falha temporária');
    fireEvent.click(screen.getByRole('button', { name: 'Salvar despesa' }));
    await waitFor(() => expect(create).toHaveBeenCalledTimes(2));
    expect(create.mock.calls[0][1]).toMatchObject({ amountInCents: 123456, dueOn: '2026-11-15' });
    expect(create.mock.calls[1][1].requestId).toBe(create.mock.calls[0][1].requestId);
  });
  it('mostra falha da API sem representar ausência de dados', async () => {
    vi.mocked(financeApi.period).mockRejectedValue(new Error('offline'));
    renderFinance();
    await screen.findByText('Financeiro indisponível', {}, { timeout: 4000 });
    expect(screen.queryByText('Saldo do período')).toBeNull();
  });
});
