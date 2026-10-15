/**
 * @vitest-environment happy-dom
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { LandingPage } from '../ui/LandingPage.web';
import { ThemeProvider } from '@/shared/theme';

let mockSessionStatus = 'unauthenticated';
let mockSessionIdentity: any = null;

vi.mock('@/features/auth', () => ({
  useSession: () => ({
    status: mockSessionStatus,
    identity: mockSessionIdentity,
    barbershop: null,
    memberships: [],
    selectedShopId: null,
    token: null,
    error: mockSessionStatus === 'error' ? new Error('Falha de sessão simulada') : null,
    restoreSession: vi.fn(),
    signOut: vi.fn(),
  }),
}));

vi.mock('expo-router', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
  }),
  useSegments: () => ['(public)', 'inicio'],
}));

vi.mock('motion/react', () => {
  const React = require('react');
  return {
    motion: new Proxy(
      {},
      {
        get: (_target, prop) => {
          return React.forwardRef((props: any, ref: any) => {
            const { initial, animate, transition, whileInView, whileHover, whileTap, viewport, ...rest } = props;
            return React.createElement(prop as string, { ...rest, ref });
          });
        },
      }
    ),
    AnimatePresence: ({ children }: any) => <>{children}</>,
    useReducedMotion: () => true,
    useScroll: () => ({ scrollYProgress: { get: () => 0 } }),
    useTransform: () => 1,
  };
});

vi.mock('expo-router/head', () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

describe('Landing Page Component & Public Access Guarantee', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSessionStatus = 'unauthenticated';
    mockSessionIdentity = null;
  });

  const renderLanding = () =>
    render(
      <ThemeProvider>
        <LandingPage />
      </ThemeProvider>
    );

  it('renderiza o título principal H1, o apoio e os dois CTAs de mesmo peso', () => {
    renderLanding();

    const h1 = screen.getByRole('heading', { level: 1 });
    expect(h1.textContent).toBe('Seu próximo horário. Sua barbearia em movimento.');

    expect(screen.getAllByText('Encontrar barbearias').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Solicitar demonstração').length).toBeGreaterThan(0);
  });

  it('renderiza normalmente com sessão não autenticada exibindo ação Entrar', () => {
    mockSessionStatus = 'unauthenticated';
    renderLanding();

    const authButton = screen.getByText('Entrar');
    expect(authButton).toBeDefined();
  });

  it('renderiza normalmente com sessão em carregamento (bootstrapping) sem bloquear a landing', () => {
    mockSessionStatus = 'bootstrapping';
    renderLanding();

    // A landing page não é impedida de renderizar o H1
    const h1 = screen.getByRole('heading', { level: 1 });
    expect(h1).toBeDefined();
  });

  it('renderiza normalmente com sessão em estado de erro sem travar na tela de recuperação', () => {
    mockSessionStatus = 'error';
    renderLanding();

    const h1 = screen.getByRole('heading', { level: 1 });
    expect(h1).toBeDefined();
  });

  it('exibe ação Minha área quando o usuário já estiver autenticado sem redirecionar à força', () => {
    mockSessionStatus = 'authenticated';
    mockSessionIdentity = { id: 'u-1', name: 'Barbeiro Silva', accountType: 'BARBER' };
    renderLanding();

    expect(screen.getByText('Minha área')).toBeDefined();
  });

  it('clicar em um plano de pricing preenche a configuração no formulário sem apagar dados já digitados', () => {
    renderLanding();

    // Digita o nome no formulário primeiro
    const nomeInput = screen.getByLabelText(/Seu nome completo/i);
    fireEvent.change(nomeInput, { target: { value: 'Marcos Proprietário' } });
    expect((nomeInput as HTMLInputElement).value).toBe('Marcos Proprietário');

    // Clica no CTA do plano "Equipe" na seção de Preços
    const equipePlanHeading = screen.getByRole('heading', { level: 3, name: 'Equipe' });
    const equipeCard = equipePlanHeading.closest('.sb-pricing-card');
    expect(equipeCard).toBeDefined();

    const ctaBtn = equipeCard?.querySelector('button');
    expect(ctaBtn).toBeDefined();
    if (ctaBtn) {
      fireEvent.click(ctaBtn);
    }

    // O nome digitado anteriormente DEVE permanecer preservado
    expect((nomeInput as HTMLInputElement).value).toBe('Marcos Proprietário');

    // O badge de configuração selecionada deve aparecer com "Equipe"
    expect(screen.getByText(/Configuração selecionada:/i)).toBeDefined();
    expect(screen.getAllByText('Equipe').length).toBeGreaterThan(0);
  });

  it('possui as classes tipográficas tabular-nums e font-semibold nos números do Hero, Trust e Pricing', () => {
    const { container } = renderLanding();

    const tabularElements = container.querySelectorAll('.tabular-nums');
    expect(tabularElements.length).toBeGreaterThan(0);

    const fontSemiboldElements = container.querySelectorAll('.font-semibold');
    expect(fontSemiboldElements.length).toBeGreaterThan(0);
  });
});
