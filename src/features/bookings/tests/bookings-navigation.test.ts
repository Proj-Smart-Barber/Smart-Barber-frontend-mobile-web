import { describe, it, expect } from 'vitest';
import { getActiveDestinationFromPathname } from '@/shared/navigation/navigation.helpers';
import { resolveBookingContext } from '../model/resolve-booking-context';
import type { BookingDto } from '../api/bookings.dto';

describe('I6 — Rotas e Navegação por Perfil (bookings-navigation)', () => {
  const fakeUnitBooking: BookingDto = {
    id: 'booking-unit-1',
    barbershopId: 'shop-unit-1',
    barbermanId: 'barber-joao',
    customerId: 'client-pedro',
    date: '2026-10-15',
    startTime: '10:00',
    endTime: '10:30',
    status: 'CONFIRMED',
    version: 1,
    services: [{ id: 'srv-1', title: 'Corte', priceInCents: 5000, durationInMinutes: 30 }],
  };

  it('rotas públicas de atendimento e reservas pessoais são estritamente distintas', () => {
    // /atendimentos é rota operacional de equipe
    expect(getActiveDestinationFromPathname('/atendimentos')).toBe('atendimentos');
    expect(getActiveDestinationFromPathname('/(app)/atendimentos')).toBe('atendimentos');

    // /bookings e /(client)/bookings são consumo pessoal e não ativam aba atendimentos
    expect(getActiveDestinationFromPathname('/bookings')).not.toBe('atendimentos');
    expect(getActiveDestinationFromPathname('/(client)/bookings')).not.toBe('atendimentos');
    expect(getActiveDestinationFromPathname('/bookings/some-id')).not.toBe('atendimentos');
  });

  it('detalhes acessados pela equipe/agenda exigem contexto e vínculo unitário válido', () => {
    // Barbeiro da unidade tem acesso a atendimento da sua agenda
    const barberContext = resolveBookingContext({
      actorId: 'barber-joao',
      selectedMembership: { id: 'shop-unit-1', role: 'BARBER', state: 'ACTIVE' },
      booking: fakeUnitBooking,
      requestedScope: 'UNIT',
    });
    expect(barberContext.canAccess).toBe(true);
    expect(barberContext.resolvedScope).toBe('UNIT');

    // Barbeiro de outra unidade ou ator sem vínculo não tem acesso
    const externalUserContext = resolveBookingContext({
      actorId: 'other-user',
      selectedMembership: { id: 'shop-unit-2', role: 'BARBER', state: 'ACTIVE' },
      booking: fakeUnitBooking,
      requestedScope: 'UNIT',
    });
    expect(externalUserContext.canAccess).toBe(false);
  });

  it('consumidor comum sem vínculo unitário não acessa escopo UNIT', () => {
    const clientContext = resolveBookingContext({
      actorId: 'client-pedro',
      selectedMembership: null,
      booking: fakeUnitBooking,
      requestedScope: 'UNIT',
    });
    expect(clientContext.canAccess).toBe(false);
    expect(clientContext.reason).toContain('Vínculo');
  });

  it('consumidor acessa sua própria reserva em escopo PERSONAL', () => {
    const personalContext = resolveBookingContext({
      actorId: 'client-pedro',
      selectedMembership: null,
      booking: fakeUnitBooking,
      requestedScope: 'PERSONAL',
    });
    expect(personalContext.canAccess).toBe(true);
    expect(personalContext.resolvedScope).toBe('PERSONAL');
    expect(personalContext.canCancel).toBe(true);
    expect(personalContext.canReschedule).toBe(true);
  });
});
