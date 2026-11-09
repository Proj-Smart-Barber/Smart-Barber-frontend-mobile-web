// @vitest-environment happy-dom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider } from '@/shared/theme';
import { NearbyFiltersSheet, type NearbyFiltersSheetProps } from '../ui/nearby-filters-sheet';
import type { NearbyFilterSelection } from '../model/nearby-filter-selection';

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

describe('NearbyFiltersSheet — Gaveta com rascunho sem efeitos remotos (H2)', () => {
  const defaultProps: NearbyFiltersSheetProps = {
    visible: true,
    value: { mode: 'ALL', radiusKm: 10 },
    isLocationAvailable: true,
    locationStatus: 'ready',
    canAskAgain: true,
    onClose: vi.fn(),
    onApply: vi.fn(),
    onRecoverPermission: vi.fn(),
    onRetryPosition: vi.fn(),
    onManualSearch: vi.fn(),
  };

  function renderSheet(overrideProps: Partial<NearbyFiltersSheetProps> = {}) {
    const props = { ...defaultProps, ...overrideProps };
    return render(
      <ThemeProvider initialMode="dark">
        <NearbyFiltersSheet {...props} />
      </ThemeProvider>,
    );
  }

  it('draft_does_not_apply_until_confirmation: alterar seleções não chama onApply antes de clicar Aplicar', () => {
    const onApply = vi.fn();
    const onClose = vi.fn();

    renderSheet({ onApply, onClose });

    // Clica no raio de 25 km (altera draft para NEARBY + 25km)
    const radius25Btn = screen.getByRole('button', { name: /Raio de 25 quilômetros/i });
    fireEvent.click(radius25Btn);

    // onApply e onClose NÃO devem ter sido chamados ainda
    expect(onApply).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();

    // Clica no botão "Aplicar filtros"
    const applyBtn = screen.getByRole('button', { name: /Aplicar filtros/i });
    fireEvent.click(applyBtn);

    // Agora sim onApply é chamado exatamente 1 vez com o draft confirmado
    expect(onApply).toHaveBeenCalledTimes(1);
    expect(onApply).toHaveBeenCalledWith({
      mode: 'NEARBY',
      radiusKm: 25,
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('close_discards_draft: fechar via botão X descarta o rascunho sem aplicar', () => {
    const onApply = vi.fn();
    const onClose = vi.fn();

    renderSheet({
      value: { mode: 'ALL', radiusKm: 10 },
      onApply,
      onClose,
    });

    // Modifica draft para 50km
    const radius50Btn = screen.getByRole('button', { name: /Raio de 50 quilômetros/i });
    fireEvent.click(radius50Btn);

    // Clica no botão X para fechar
    const closeButtons = screen.getAllByRole('button', { name: /Fechar filtros/i });
    fireEvent.click(closeButtons[0]);

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onApply).not.toHaveBeenCalled();
  });

  it('reset_preserves_external_search: limpar filtros redefine apenas o rascunho para ALL/10km sem aplicar imediatamente', () => {
    const onApply = vi.fn();
    const onClose = vi.fn();

    renderSheet({
      value: { mode: 'NEARBY', radiusKm: 25 },
      onApply,
      onClose,
    });

    // Clica no botão Limpar filtros
    const resetBtn = screen.getByRole('button', { name: /Limpar filtros/i });
    fireEvent.click(resetBtn);

    // Não deve chamar onApply ou onClose
    expect(onApply).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();

    // Confirma que a opção "Todas as distâncias" passou a estar selecionada no draft
    const allDistancesBtn = screen.getByRole('button', { name: /Sem limite de distância/i });
    expect(allDistancesBtn.getAttribute('aria-selected')).toBe('true');

    // Ao clicar em Aplicar, confirma ALL com 10km
    const applyBtn = screen.getByRole('button', { name: /Aplicar filtros/i });
    fireEvent.click(applyBtn);

    expect(onApply).toHaveBeenCalledWith({
      mode: 'ALL',
      radiusKm: 10,
    });
  });

  it('reopen_uses_applied_selection: reabrir a gaveta recarrega a seleção aplicada previamente', () => {
    const appliedValue: NearbyFilterSelection = { mode: 'NEARBY', radiusKm: 50 };
    const { rerender } = render(
      <ThemeProvider initialMode="dark">
        <NearbyFiltersSheet {...defaultProps} visible={false} value={appliedValue} />
      </ThemeProvider>,
    );

    // Reabre
    rerender(
      <ThemeProvider initialMode="dark">
        <NearbyFiltersSheet {...defaultProps} visible={true} value={appliedValue} />
      </ThemeProvider>,
    );

    const radius50Btn = screen.getByRole('button', { name: /Raio de 50 quilômetros/i });
    expect(radius50Btn.getAttribute('aria-selected')).toBe('true');
  });

  it('nearby_requires_current_valid_position: exibe painel de status quando locationStatus for denied ou indisponível', () => {
    const onRecoverPermission = vi.fn();
    renderSheet({
      locationStatus: 'denied',
      isLocationAvailable: false,
      onRecoverPermission,
    });

    expect(screen.getByText('Localização não permitida')).toBeDefined();
    const recoverBtn = screen.getByText('Permitir localização');
    fireEvent.click(recoverBtn);
    expect(onRecoverPermission).toHaveBeenCalledTimes(1);
  });
});
