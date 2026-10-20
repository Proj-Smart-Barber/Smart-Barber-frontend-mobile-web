// @vitest-environment happy-dom
import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import AccountNotificationDetailScreen from '@/app/(account)/notifications/[notificationId]';

const fixture = vi.hoisted(() => ({ replace: vi.fn(), back: vi.fn(), missing: false, accountType: 'CLIENT' }));
vi.mock('expo-router', () => ({ useRouter: () => fixture, useLocalSearchParams: () => ({ notificationId: 'notification-fixture' }) }));
vi.mock('react-native', () => ({ View: ({children}: React.PropsWithChildren) => <div>{children}</div>, ScrollView: ({children}: React.PropsWithChildren) => <div>{children}</div>, StyleSheet: { create: (styles: unknown) => styles } }));
vi.mock('@/shared/theme', () => ({ useTheme: () => ({ colors: { feedback: {error: 'red'}, background: {primary: 'black'}, text: { primary: 'white', muted: 'gray' } }, spacing: {md: 16} }) }));
vi.mock('@/shared/ui', () => ({ Text: ({children}: React.PropsWithChildren) => <span>{children}</span>, Card: ({children}: React.PropsWithChildren) => <div>{children}</div>, Button: ({title,onPress}: {title: string; onPress: () => void}) => <button onClick={onPress}>{title}</button>, Spinner: () => null, Badge: () => null }));
vi.mock('@/features/auth', () => ({ useSession: () => ({ identity: {id: 'fixture-client', accountType: fixture.accountType} }) }));
vi.mock('@/features/notifications/model/notification-queries', () => ({ useNotificationsFeed: () => ({ data: { notifications: fixture.missing ? [] : [{id: 'notification-fixture', title: 'Reserva confirmada', message: 'Fixture', readAt: '2026-10-20T00:00:00Z', createdAt: '2026-10-20T00:00:00Z'}] }, isLoading: false }), useMarkNotificationRead: () => ({ mutate: vi.fn() }) }));
vi.mock('@/features/invitations/model/use-invitation-response', () => ({ useInvitationDetail: () => ({ data: null, isLoading: false }) }));
vi.mock('@/features/invitations/ui/InvitationCard', () => ({ InvitationCard: () => null }));
afterEach(() => { cleanup(); vi.clearAllMocks(); fixture.missing = false; fixture.accountType = 'CLIENT'; });

it('returns to the notifications feed without relying on browser history', () => {
  render(<AccountNotificationDetailScreen />);
  fireEvent.click(screen.getByRole('button', { name: '← Voltar para notificações' }));
  expect(fixture.replace).toHaveBeenCalledWith('/(client)/notifications');
  expect(fixture.back).not.toHaveBeenCalled();
});

it('returns to the feed when the notification is not found', () => {
  fixture.missing = true;
  render(<AccountNotificationDetailScreen />);
  fireEvent.click(screen.getByRole('button', {name: 'Voltar'}));
  expect(fixture.replace).toHaveBeenCalledWith('/(client)/notifications');
});

it('keeps the account feed for operational profiles', () => {
  fixture.accountType = 'OWNER';
  render(<AccountNotificationDetailScreen />);
  fireEvent.click(screen.getByRole('button', { name: '← Voltar para notificações' }));
  expect(fixture.replace).toHaveBeenCalledWith('/(account)/notifications');
});