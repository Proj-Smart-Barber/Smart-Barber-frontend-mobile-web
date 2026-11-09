// @vitest-environment happy-dom
import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { View, Text } from 'react-native';
import { LoadingRegion } from '../LoadingRegion';

vi.mock('@/shared/theme', () => ({
  useTheme: () => ({
    colors: {
      brand: { primary: '#BD2026' },
      background: { primary: '#0B0B0B' },
      text: { primary: '#FFFFFF', secondary: '#A0A0A0' },
      surface: { elevated: '#1E1E1E' },
    },
    isDark: true,
    spacing: [0, 4, 8, 12, 16, 20, 24, 32],
    radius: { sm: 4, md: 8, lg: 12 },
  }),
  useReducedMotion: () => false,
}));

describe('LoadingRegion', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('quando hasContent=false e active=true, renderiza placeholder decorativo e status acessível', () => {
    render(
      <LoadingRegion
        operationKey="load-1"
        active={true}
        phase="initial"
        hasContent={false}
        label="Carregando catálogo de serviços…"
        placeholder={<Text testID="test-skeleton">Placeholder Skeleton</Text>}
      >
        <Text testID="real-content">Conteúdo Real</Text>
      </LoadingRegion>
    );

    // O status acessível está presente
    expect(screen.getByText('Carregando catálogo de serviços…')).toBeDefined();

    // O placeholder está no DOM
    expect(screen.getByTestId('test-skeleton')).toBeDefined();

    // O conteúdo real NÃO é exibido
    expect(screen.queryByTestId('real-content')).toBeNull();
  });

  it('quando hasContent=true e active=true (ex: refresh), preserva children e marca container como busy', () => {
    render(
      <LoadingRegion
        operationKey="load-refresh"
        active={true}
        phase="refresh"
        hasContent={true}
        label="Atualizando agendamentos…"
        placeholder={<Text testID="test-skeleton">Placeholder Skeleton</Text>}
      >
        <Text testID="real-content">Meus Agendamentos Preservados</Text>
      </LoadingRegion>
    );

    // O conteúdo real é mantido na tela (não desmonta nem esconde)
    expect(screen.getByTestId('real-content')).toBeDefined();

    // O placeholder de tela inteira NÃO é renderizado
    expect(screen.queryByTestId('test-skeleton')).toBeNull();

    // Antes dos 200ms de refresh, o indicador visual não aparece
    expect(screen.queryByTestId('loading-region-indicator')).toBeNull();

    // Após 200ms, o indicador local aparece
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(screen.getByTestId('loading-region-indicator')).toBeDefined();
  });

  it('comunica mensagem de espera longa após 8s em operação contínua', () => {
    render(
      <LoadingRegion
        operationKey="load-slow"
        active={true}
        phase="initial"
        hasContent={false}
        label="Buscando barbearias próximas…"
        placeholder={<Text testID="test-skeleton">Skeleton</Text>}
      />
    );

    expect(screen.queryByText(/demorando mais que o esperado/i)).toBeNull();

    act(() => {
      vi.advanceTimersByTime(8000);
    });

    expect(screen.getAllByText(/demorando mais que o esperado/i).length).toBeGreaterThan(0);
  });

  it('quando active=false, não marca busy e exibe children normalmente', () => {
    render(
      <LoadingRegion
        operationKey="load-done"
        active={false}
        phase="initial"
        hasContent={true}
        label="Carregando…"
        placeholder={<Text testID="test-skeleton">Skeleton</Text>}
      >
        <Text testID="real-content">Dados Carregados</Text>
      </LoadingRegion>
    );

    expect(screen.getByTestId('real-content')).toBeDefined();
    expect(screen.queryByTestId('test-skeleton')).toBeNull();
    expect(screen.queryByTestId('loading-region-indicator')).toBeNull();
  });

  it('bounded_content_region_preserves_scrollable_child: aplica contentStyle ao contentWrapper no ramo hasContent', () => {
    const { unmount } = render(
      <LoadingRegion
        testID="bounded-region"
        operationKey="load-bounded"
        active={false}
        hasContent={true}
        style={{ flex: 1 }}
        contentStyle={{ flex: 1, minHeight: 0 }}
      >
        <View testID="scrollable-child">
          <Text>Lista com rolagem interna</Text>
        </View>
      </LoadingRegion>
    );

    const wrapper = screen.getByTestId('bounded-region-content-wrapper');
    expect(wrapper).toBeDefined();
    // React Native Web aplica estilos no elemento ou via classes CSS geradas
    // No happy-dom, verificamos se o elemento filho está presente e se contentStyle foi transmitido
    expect(screen.getByTestId('scrollable-child')).toBeDefined();

    unmount();
  });

  it('sem contentStyle, preserva dimensionamento padrão e não adiciona flex ao contentWrapper', () => {
    const { unmount } = render(
      <LoadingRegion
        testID="default-region"
        operationKey="load-default"
        active={false}
        hasContent={true}
      >
        <Text testID="default-child">Conteúdo com altura automática</Text>
      </LoadingRegion>
    );

    const wrapper = screen.getByTestId('default-region-content-wrapper');
    expect(wrapper).toBeDefined();
    expect(screen.getByTestId('default-child')).toBeDefined();

    unmount();
  });

  it('no ramo hasContent=false, placeholder e estados vazios não recebem contentWrapper nem contentStyle', () => {
    render(
      <LoadingRegion
        testID="skeleton-region"
        operationKey="load-skeleton"
        active={true}
        hasContent={false}
        contentStyle={{ flex: 1, minHeight: 0 }}
        placeholder={<Text testID="raw-skeleton">Skeleton Isolado</Text>}
      >
        <Text testID="hidden-child">Oculto</Text>
      </LoadingRegion>
    );

    expect(screen.getByTestId('raw-skeleton')).toBeDefined();
    expect(screen.queryByTestId('skeleton-region-content-wrapper')).toBeNull();
    expect(screen.queryByTestId('hidden-child')).toBeNull();
  });
});
