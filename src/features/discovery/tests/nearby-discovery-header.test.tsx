// @vitest-environment happy-dom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider } from '@/shared/theme';
import {
  NearbyDiscoveryHeader,
  type NearbyDiscoveryHeaderProps,
} from '../ui/nearby-discovery-header';

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

describe('NearbyDiscoveryHeader — Cabeçalho rolável de controles (H1)', () => {
  const defaultProps: NearbyDiscoveryHeaderProps = {
    searchQuery: '',
    onSearchChange: vi.fn(),
    onClearSearch: vi.fn(),
    onOpenFilters: vi.fn(),
    onOpenMap: vi.fn(),
    activeFilterCount: 0,
    summary: 'Todas as distâncias',
    mapDisabled: false,
    mapDisabledReason: undefined,
    notice: undefined,
  };

  function renderHeader(overrideProps: Partial<NearbyDiscoveryHeaderProps> = {}) {
    const props = { ...defaultProps, ...overrideProps };
    return render(
      <ThemeProvider initialMode="dark">
        <NearbyDiscoveryHeader {...props} />
      </ThemeProvider>,
    );
  }

  it('header_actions_have_accessible_names: todos os botões de ação têm nomes acessíveis', () => {
    renderHeader({ activeFilterCount: 1 });

    const filterBtn = screen.getByRole('button', { name: /Filtros, 1 aplicado/i });
    expect(filterBtn).toBeDefined();

    const mapBtn = screen.getByRole('button', { name: /Abrir mapa de barbearias/i });
    expect(mapBtn).toBeDefined();

    const searchInput = screen.getByLabelText(/Buscar barbearia, endereço ou cidade/i);
    expect(searchInput).toBeDefined();
  });

  it('map_has_no_visible_text_label: botão Mapa é compacto e não exibe o texto visível "Mapa"', () => {
    renderHeader();

    const mapBtn = screen.getByRole('button', { name: /Abrir mapa de barbearias/i });
    expect(mapBtn).toBeDefined();

    // Não deve haver texto visível "Mapa" como filho textual do botão
    expect(mapBtn.textContent).not.toContain('Mapa');
    // Deve conter ícone map-outline
    expect(screen.getByTestId('icon-map-outline')).toBeDefined();
  });

  it('typing_keeps_same_input_node_and_focus: campo preserva valor e dispara onSearchChange', () => {
    const onSearchChange = vi.fn();
    const onClearSearch = vi.fn();
    const inputRef = React.createRef<any>();

    const { rerender } = render(
      <ThemeProvider initialMode="dark">
        <NearbyDiscoveryHeader
          {...defaultProps}
          searchQuery="Corte"
          onSearchChange={onSearchChange}
          onClearSearch={onClearSearch}
          inputRef={inputRef}
        />
      </ThemeProvider>,
    );

    const inputNodeBefore = screen.getByLabelText(/Buscar barbearia, endereço ou cidade/i) as HTMLInputElement;
    expect(inputNodeBefore.value).toBe('Corte');

    // Dispara digitação
    fireEvent.change(inputNodeBefore, { target: { value: 'Corte Degradê' } });
    expect(onSearchChange).toHaveBeenCalledWith('Corte Degradê');

    // Limpar busca
    const clearBtn = screen.getByRole('button', { name: /Limpar busca/i });
    fireEvent.click(clearBtn);
    expect(onClearSearch).toHaveBeenCalledTimes(1);

    // Re-renderização com novo valor preserva o mesmo elemento DOM
    rerender(
      <ThemeProvider initialMode="dark">
        <NearbyDiscoveryHeader
          {...defaultProps}
          searchQuery="Corte Degradê"
          onSearchChange={onSearchChange}
          onClearSearch={onClearSearch}
          inputRef={inputRef}
        />
      </ThemeProvider>,
    );

    const inputNodeAfter = screen.getByLabelText(/Buscar barbearia, endereço ou cidade/i) as HTMLInputElement;
    expect(inputNodeAfter).toBe(inputNodeBefore);
    expect(inputNodeAfter.value).toBe('Corte Degradê');
  });

  it('nearby_header_survives_loading_empty_error: renderiza resumo e avisos em diferentes estados', () => {
    const { rerender } = renderHeader({
      summary: 'Até 25 km (distância aproximada)',
      mapDisabled: true,
      mapDisabledReason: 'Carregando estabelecimentos e coordenadas...',
    });

    expect(screen.getByText('Até 25 km (distância aproximada)')).toBeDefined();
    expect(screen.getByText('Carregando estabelecimentos e coordenadas...')).toBeDefined();

    rerender(
      <ThemeProvider initialMode="dark">
        <NearbyDiscoveryHeader
          {...defaultProps}
          summary="Busca por nome ou bairro"
          notice={<div data-testid="test-notice">Aviso de erro de rede</div>}
        />
      </ThemeProvider>,
    );

    expect(screen.getByText('Busca por nome ou bairro')).toBeDefined();
    expect(screen.getByTestId('test-notice')).toBeDefined();
  });
});
