// @vitest-environment happy-dom
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import * as api from '../api/bookings.api';
import { CustomerLookup } from '../ui/CustomerLookup';
import { BookingRecovery } from '../ui/BookingRecovery';
import { bookingOperationEngine } from '../model/booking-operation-engine';
vi.mock('react-native', () => ({
  Platform: { OS: 'web', select: (options: any) => options.web ?? options.default },
  View: ({ children }: any) => <div>{children}</div>, ScrollView: ({ children }: any) => <div>{children}</div>,
  Pressable: ({ children, onPress }: any) => <button onClick={onPress}>{children}</button>,
  TextInput: ({ value, onChangeText }: any) => <input value={value} onChange={e => onChangeText(e.target.value)} />,
}));
vi.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
vi.mock('expo-router', () => ({ useRouter: () => ({ replace: vi.fn() }) }));
vi.mock('@/shared/theme', () => ({ useTheme: () => ({
  spacing: Array(20).fill(8), radius: { lg: 12, md: 8, xl: 16 },
  colors: { text: { primary: '#fff', secondary: '#ccc', muted: '#888' }, brand: { primary: '#f00' }, feedback: { error: '#f00', warning: '#ff0', success: '#0f0' }, background: { primary: '#000', card: '#111' }, surface: { input: '#111', default: '#111' }, border: { default: '#777' } },
}) }));
vi.mock('@/shared/ui', () => ({
  Text: ({ children }: any) => <span>{children}</span>, Badge: ({ label }: any) => <span>{label}</span>,
  Button: ({ title, onPress, disabled, loading }: any) => <button onClick={onPress} disabled={disabled || loading}>{title}</button>,
}));
vi.mock('@/shared/navigation/LiquidGlassView', () => ({ LiquidGlassView: ({ children }: any) => <div>{children}</div> }));
vi.mock('@/features/auth', () => ({ useSession: () => ({ identity: { id: 'actor' } }) }));
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
describe('Customer and recovery rendered regressions', () => {
  it('editing a pending lookup unlocks search and discards the earlier customer', async () => {
    let resolveA!: (value: any) => void;
    vi.spyOn(api, 'lookupCustomer').mockImplementationOnce(() => new Promise(resolve => { resolveA = resolve; })).mockResolvedValueOnce({ id: 'B', name: 'Cliente B', isEligible: true });
    render(<CustomerLookup shopId="shop" selectedCustomer={null} onSelectCustomer={vi.fn()} />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'a@example.invalid' } });
    fireEvent.click(screen.getByText('Localizar Cliente'));
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'b@example.invalid' } });
    expect((screen.getByText('Localizar Cliente') as HTMLButtonElement).disabled).toBe(false);
    fireEvent.click(screen.getByText('Localizar Cliente'));
    await waitFor(() => expect(screen.getByText('Cliente B')).toBeTruthy());
    await act(async () => resolveA({ id: 'A', name: 'Cliente A', isEligible: true }));
    expect(screen.queryByText('Cliente A')).toBeNull();
  });
  it.each([{ state: 'APPLIED', accessChanged: true, originScope: 'UNIT' }, { state: 'APPLIED', resource: { data: { booking: { id: 'b' } } } }])('does not navigate a redacted or legacy result', async result => {
    vi.spyOn(bookingOperationEngine, 'reconcile').mockResolvedValue(result as any);
    const resolved = vi.fn();
    render(<BookingRecovery requestId="request" onResolvedNotApplied={vi.fn()} onResolvedApplied={resolved} />);
    fireEvent.click(screen.getByText('Verificar operação anterior'));
    await waitFor(() => expect(screen.getByText(/Os detalhes ou o contexto original não estão disponíveis/)).toBeTruthy());
    expect(resolved).not.toHaveBeenCalled();
  });
  it('passes the persisted origin with an authorized applied resource', async () => {
    const result = { state: 'APPLIED', originScope: 'UNIT', resource: { data: { booking: { id: 'b', barbershopId: 'shop' } } } };
    vi.spyOn(bookingOperationEngine, 'reconcile').mockResolvedValue(result as any);
    const resolved = vi.fn();
    render(<BookingRecovery requestId="request" onResolvedNotApplied={vi.fn()} onResolvedApplied={resolved} />);
    fireEvent.click(screen.getByText('Verificar operação anterior'));
    await waitFor(() => expect(resolved).toHaveBeenCalledWith(result));
  });
});
