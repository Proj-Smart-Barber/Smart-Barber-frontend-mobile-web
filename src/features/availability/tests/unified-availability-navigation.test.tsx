// @vitest-environment happy-dom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('@expo/vector-icons', () => ({
  Ionicons: (props: any) => <span data-testid={`icon-${props.name}`} {...props} />,
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

// Mock das telas filhas
vi.mock('../ui/AvailabilityScreen', () => ({
  AvailabilityScreen: (props: any) => {
    return <div data-testid="availability-screen-mock" data-props={JSON.stringify(props)}>{props.professionalName ? `Horários de ${props.professionalName}` : 'Horários Gerais da Barbearia'}</div>;
  },
  AvailabilityMenuButton: (props: any) => <button onClick={props.onPress} data-testid="menu-btn">Menu</button>,
}));

vi.mock('../ui/BarberScheduleScreen', () => ({
  BarberScheduleScreen: (props: any) => {
    return <div data-testid="barber-schedule-screen-mock" data-props={JSON.stringify(props)}>{props.barberName ? `Jornada de ${props.barberName}` : 'Jornada Pessoal'}</div>;
  },
}));

// Mock da query de membros da equipe
const mockTeamMembers = [
  { membershipId: 'mem-1', userId: 'user-barber-1', name: 'Carlos Barbeiro', role: 'BARBERMAN', state: 'ACTIVE' },
  { membershipId: 'mem-2', userId: 'user-barber-2', name: 'Marcos Barbeiro', role: 'BARBERMAN', state: 'ACTIVE' },
];

vi.mock('@/features/team/model/use-team', () => ({
  useTeamMembersQuery: vi.fn(() => ({
    data: { items: mockTeamMembers, members: mockTeamMembers },
    isLoading: false,
    isError: false,
  })),
}));

const sessionState = {
  status: 'authenticated',
  identity: { id: 'user-owner-1', name: 'Proprietário Silva', accountType: 'OWNER' },
  selectedShopId: 'shop-1',
  memberships: [
    { id: 'shop-1', role: 'OWNER', state: 'ACTIVE', timezone: 'America/Sao_Paulo' },
  ],
  barbershop: { id: 'shop-1', name: 'Barbearia Premium' },
};

vi.mock('@/features/auth', () => ({
  useSession: () => sessionState,
}));

const mockPush = vi.fn();
vi.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: vi.fn() }),
  useNavigation: () => ({ dispatch: vi.fn() }),
  usePathname: () => '/availability',
}));

vi.mock('@/shared/navigation/navigation-context', () => ({
  useNavigation: () => ({
    openDrawer: vi.fn(),
    closeDrawer: vi.fn(),
    onContentScroll: vi.fn(),
    scrollCollapseProgress: { interpolate: () => 0 },
    drawerProgress: { interpolate: () => 0 },
    isDrawerOpen: false,
    activeDestination: 'availability',
  }),
}));

import { UnifiedAvailabilityContainer } from '../ui/UnifiedAvailabilityContainer';
import { getActiveDestinationFromPathname } from '@/shared/navigation/navigation.helpers';
import { ThemeProvider } from '@/shared/theme';

function renderContainer(ui: React.ReactElement) {
  return render(<ThemeProvider>{ui}</ThemeProvider>);
}

describe('Fase 2 — Entrada Única e Contêiner de Escopos', () => {
  beforeEach(() => {
    mockPush.mockClear();
    sessionState.status = 'authenticated';
    sessionState.identity = { id: 'user-owner-1', name: 'Proprietário Silva', accountType: 'OWNER' };
    sessionState.selectedShopId = 'shop-1';
    sessionState.memberships = [
      { id: 'shop-1', role: 'OWNER', state: 'ACTIVE', timezone: 'America/Sao_Paulo' },
    ];
    sessionState.barbershop = { id: 'shop-1', name: 'Barbearia Premium' };
  });

  describe('1. Resolução Canônica de Rota e Superfícies', () => {
    it('resolve /availability e /(app)/availability para o destino "availability"', () => {
      expect(getActiveDestinationFromPathname('/availability')).toBe('availability');
      expect(getActiveDestinationFromPathname('/(app)/availability')).toBe('availability');
    });

    it('resolve /my-schedule e /(app)/my-schedule como alias para o mesmo destino "availability"', () => {
      expect(getActiveDestinationFromPathname('/my-schedule')).toBe('availability');
      expect(getActiveDestinationFromPathname('/(app)/my-schedule')).toBe('availability');
    });
  });

  describe('2. Comportamento do Contêiner para OWNER', () => {
    it('apresenta as 3 abas de escopo para o OWNER ("Da barbearia", "Meus horários", "Equipe")', () => {
      renderContainer(<UnifiedAvailabilityContainer barbershopId="shop-1" />);

      expect(screen.getByText('Da barbearia')).toBeTruthy();
      expect(screen.getByText('Meus horários')).toBeTruthy();
      expect(screen.getByText('Equipe')).toBeTruthy();
    });

    it('abre inicialmente "Da barbearia" quando acessado sem parâmetros', () => {
      renderContainer(<UnifiedAvailabilityContainer barbershopId="shop-1" />);

      const unitMock = screen.getByTestId('availability-screen-mock');
      expect(unitMock).toBeTruthy();
      expect(screen.getByText('Horários Gerais da Barbearia')).toBeTruthy();
    });

    it('abre o contexto pessoal quando initialScope="personal" é fornecido (alias /my-schedule)', () => {
      renderContainer(<UnifiedAvailabilityContainer initialScope="personal" barbershopId="shop-1" />);

      const personalMock = screen.getByTestId('barber-schedule-screen-mock');
      expect(personalMock).toBeTruthy();
      expect(screen.getByText(/configuração desta jornada é opcional/i)).toBeTruthy();
    });

    it('abre o contexto da equipe com o membro selecionado quando link da equipe é acionado', () => {
      renderContainer(
        <UnifiedAvailabilityContainer
          barbershopId="shop-1"
          barbermanId="user-barber-1"
          professionalName="Carlos Barbeiro"
        />,
      );

      const teamMemberMock = screen.getByTestId('availability-screen-mock');
      expect(teamMemberMock).toBeTruthy();
      expect(screen.getByText('Horários de Carlos Barbeiro')).toBeTruthy();
      expect(screen.getByText('Voltar para a lista da equipe')).toBeTruthy();
    });

    it('permite alternar entre abas do OWNER', () => {
      renderContainer(<UnifiedAvailabilityContainer barbershopId="shop-1" />);

      // Inicialmente em "Da barbearia"
      expect(screen.getByTestId('availability-screen-mock')).toBeTruthy();

      // Clica em "Meus horários"
      fireEvent.click(screen.getByText('Meus horários'));
      expect(screen.getByTestId('barber-schedule-screen-mock')).toBeTruthy();

      // Clica em "Equipe"
      fireEvent.click(screen.getByText('Equipe'));
      expect(screen.getByText('Horários da Equipe')).toBeTruthy();
      expect(screen.getByText('Carlos Barbeiro')).toBeTruthy();
      expect(screen.getByText('Marcos Barbeiro')).toBeTruthy();
    });
  });

  describe('3. Comportamento do Contêiner para BARBERMAN (Segurança e Isolamento)', () => {
    beforeEach(() => {
      sessionState.identity = { id: 'user-barber-1', name: 'Carlos Barbeiro', accountType: 'BARBER' };
      sessionState.memberships = [
        { id: 'shop-1', role: 'BARBERMAN', state: 'ACTIVE', timezone: 'America/Sao_Paulo' },
      ];
    });

    it('abre diretamente o contexto pessoal do próprio barbeiro sem expor abas da unidade ou equipe', () => {
      renderContainer(<UnifiedAvailabilityContainer barbershopId="shop-1" />);

      const personalMock = screen.getByTestId('barber-schedule-screen-mock');
      expect(personalMock).toBeTruthy();

      expect(screen.queryByText('Da barbearia')).toBeNull();
      expect(screen.queryByText('Equipe')).toBeNull();
    });

    it('ignora barbermanId de terceiro e mantém o barbeiro restrito ao seu próprio id', () => {
      renderContainer(
        <UnifiedAvailabilityContainer
          barbershopId="shop-1"
          barbermanId="user-barber-2"
          professionalName="Marcos Barbeiro"
        />,
      );

      const personalMock = screen.getByTestId('barber-schedule-screen-mock');
      expect(personalMock).toBeTruthy();
      // O nome do barbeiro renderizado é o da sessão, não do terceiro
      expect(screen.getByText('Jornada de Carlos Barbeiro')).toBeTruthy();
    });
  });

  describe('4. Proteção contra Vínculo Inativo ou Revogado', () => {
    it('bloqueia o contêiner se o vínculo na unidade estiver INACTIVE', () => {
      sessionState.memberships = [
        { id: 'shop-1', role: 'OWNER', state: 'INACTIVE', timezone: 'America/Sao_Paulo' },
      ];

      renderContainer(<UnifiedAvailabilityContainer barbershopId="shop-1" />);

      expect(screen.getByText('Horários indisponíveis')).toBeTruthy();
      expect(screen.queryByTestId('availability-screen-mock')).toBeNull();
      expect(screen.queryByTestId('barber-schedule-screen-mock')).toBeNull();
    });

    it('bloqueia o contêiner se a sessão não possuir unidades vinculadas', () => {
      sessionState.memberships = [];

      renderContainer(<UnifiedAvailabilityContainer barbershopId="shop-1" />);

      expect(screen.getByText('Horários indisponíveis')).toBeTruthy();
    });
  });
});
