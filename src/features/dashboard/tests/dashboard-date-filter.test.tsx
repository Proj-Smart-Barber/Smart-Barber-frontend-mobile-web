// @vitest-environment happy-dom
import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
vi.mock('react-native', () => ({
  View: ({ children }: any) => <div>{children}</div>,
  Modal: ({ visible, children }: any) => visible ? <div role="dialog">{children}</div> : null,
  Pressable: ({ children, onPress, accessibilityLabel }: any) => <div aria-label={accessibilityLabel} onClick={onPress}>{children}</div>,
}));
vi.mock('@/shared/theme', () => ({ useTheme: () => ({ spacing: { 2: 8 }, colors: { background: { primary: '#fff' } } }) }));
vi.mock('@/shared/ui', () => ({ Button: ({ title, onPress, disabled }: any) => <button disabled={disabled} onClick={onPress}>{title}</button> }));
vi.mock('@/features/agenda', () => ({ AgendaDatePicker: () => null }));
import { DashboardDateFilter } from '../ui/DashboardDateFilter';
afterEach(cleanup);

function setup() {
  const props = { selectedDate: '2026-11-16', todayIso: '2026-11-16', label: 'Seg, 16 de nov', period: 'DAY' as const,
    onPeriodChange: vi.fn(), onSelectDate: vi.fn(), onToday: vi.fn() };
  render(<DashboardDateFilter {...props} />);
  return props;
}
it('keeps period controls inside a selector and applies changes only on confirmation', () => {
  const props = setup();
  expect(screen.queryByRole('dialog')).toBeNull();
  expect(screen.queryByText('Semana')).toBeNull();
  fireEvent.click(screen.getByText('Filtros'));
  fireEvent.click(screen.getByText('Semana'));
  expect(props.onPeriodChange).not.toHaveBeenCalled();
  fireEvent.click(screen.getByText('Aplicar filtros'));
  expect(props.onPeriodChange).toHaveBeenCalledWith('WEEK');
  expect(props.onSelectDate).toHaveBeenCalledWith('2026-11-16');
  expect(screen.queryByRole('dialog')).toBeNull();
});
it('discards a draft when the selector is dismissed', () => {
  const props = setup();
  fireEvent.click(screen.getByText('Filtros'));
  fireEvent.click(screen.getByText('Semana'));
  fireEvent.click(screen.getByLabelText('Fechar filtros'));
  expect(props.onPeriodChange).not.toHaveBeenCalled();
  expect(props.onSelectDate).not.toHaveBeenCalled();
});
