import { describe, it, expect } from 'vitest';
import { resolveBookingContext } from '../model/resolve-booking-context';
import type { BookingDto } from '../api/bookings.dto';

describe('I4 — Validação de Escopos, RBAC Frontend e Não-Elevação de Privilégio (booking-scope)', () => {
  const fakeBookingShopA: BookingDto = {
    id: 'booking-scope-1',
    barbershopId: 'shop-A',
    barbermanId: 'barber-carlos',
    customerId: 'client-joao',
    createdByUserId: 'client-joao',
    date: '2026-10-15',
    startTime: '10:00',
    endTime: '10:30',
    status: 'CONFIRMED',
    version: 1,
    services: [{ id: 'srv-1', title: 'Corte', priceInCents: 5000, durationInMinutes: 30 }],
  };

  it('ator não autenticado tem acesso negado em qualquer escopo', () => {
    const res = resolveBookingContext({
      actorId: null,
      booking: fakeBookingShopA,
      requestedScope: 'PERSONAL',
    });
    expect(res.canAccess).toBe(false);
    expect(res.isValid).toBe(false);
  });

  describe('Escopo PERSONAL', () => {
    it('permite acesso quando o ator é o consumidor beneficiário', () => {
      const res = resolveBookingContext({
        actorId: 'client-joao',
        booking: fakeBookingShopA,
        requestedScope: 'PERSONAL',
      });
      expect(res.canAccess).toBe(true);
      expect(res.resolvedScope).toBe('PERSONAL');
      expect(res.canCancel).toBe(true);
      expect(res.canReschedule).toBe(true);
      expect(res.canComplete).toBe(false); // Consumidor não conclui fisicamente o serviço
      expect(res.canMarkNoShow).toBe(false); // Consumidor não marca No-Show
    });

    it('nega acesso se o ator for terceiro, impedindo privilégio pela URL', () => {
      const res = resolveBookingContext({
        actorId: 'client-outro',
        booking: fakeBookingShopA,
        requestedScope: 'PERSONAL',
      });
      expect(res.canAccess).toBe(false);
      expect(res.reason).toContain('Acesso negado: a reserva pertence a outro cliente');
    });
  });

  describe('Escopo UNIT', () => {
    it('nega acesso em UNIT se o ator não tiver vínculo operacional ativo com a unidade', () => {
      const res = resolveBookingContext({
        actorId: 'barber-carlos',
        selectedMembership: null,
        booking: fakeBookingShopA,
        requestedScope: 'UNIT',
      });
      expect(res.canAccess).toBe(false);
      expect(res.reason).toContain('Vínculo operacional ativo com a unidade é obrigatório');
    });

    it('OWNER da unidade A não ganha acesso a reservas da unidade B', () => {
      const res = resolveBookingContext({
        actorId: 'owner-user',
        selectedMembership: { shopId: 'shop-B', role: 'OWNER', status: 'ACTIVE' },
        booking: fakeBookingShopA, // pertence ao shop-A
        requestedScope: 'UNIT',
      });
      expect(res.canAccess).toBe(false);
      expect(res.reason).toContain('a reserva pertence a outra unidade');
    });

    it('BARBER da unidade A só pode acessar e gerenciar agendamentos da sua própria agenda', () => {
      // 1. Barbeiro correto
      const resAllowed = resolveBookingContext({
        actorId: 'barber-carlos',
        selectedMembership: { shopId: 'shop-A', role: 'BARBER', status: 'ACTIVE' },
        booking: fakeBookingShopA,
        requestedScope: 'UNIT',
      });
      expect(resAllowed.canAccess).toBe(true);
      expect(resAllowed.isBarberSelfOnly).toBe(true);

      // 2. Barbeiro diferente na mesma unidade
      const resDenied = resolveBookingContext({
        actorId: 'barber-outro',
        selectedMembership: { shopId: 'shop-A', role: 'BARBER', status: 'ACTIVE' },
        booking: fakeBookingShopA, // pertence a barber-carlos
        requestedScope: 'UNIT',
      });
      expect(resDenied.canAccess).toBe(false);
      expect(resDenied.reason).toContain('Profissional só pode acessar e gerenciar agendamentos da sua própria agenda');
    });

    it('OWNER da unidade A pode acessar agendamentos de qualquer profissional da sua unidade', () => {
      const resOwner = resolveBookingContext({
        actorId: 'owner-shop-A',
        selectedMembership: { shopId: 'shop-A', role: 'OWNER', status: 'ACTIVE' },
        booking: fakeBookingShopA,
        requestedScope: 'UNIT',
      });
      expect(resOwner.canAccess).toBe(true);
      expect(resOwner.isBarberSelfOnly).toBe(false);
      expect(resOwner.canComplete).toBe(true);
      expect(resOwner.canMarkNoShow).toBe(true);
    });
  });
});
