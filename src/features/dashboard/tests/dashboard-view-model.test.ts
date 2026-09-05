import { describe, expect, it } from 'vitest';
import {
  formatCurrency,
  getGreetingByHour,
  mapStatusBadgeTone,
  mapStatusLabel,
  findNextAppointment,
} from '../model/dashboard.helpers';
import type { DashboardAppointment } from '../api/dashboard.contract';

describe('Dashboard Presentation Helpers', () => {
  describe('getGreetingByHour', () => {
    it('deve retornar Bom dia para horários matutinos', () => {
      expect(getGreetingByHour(5)).toBe('Bom dia');
      expect(getGreetingByHour(9)).toBe('Bom dia');
      expect(getGreetingByHour(11)).toBe('Bom dia');
    });

    it('deve retornar Boa tarde para horários vespertinos', () => {
      expect(getGreetingByHour(12)).toBe('Boa tarde');
      expect(getGreetingByHour(15)).toBe('Boa tarde');
      expect(getGreetingByHour(17)).toBe('Boa tarde');
    });

    it('deve retornar Boa noite para horários noturnos e madrugada', () => {
      expect(getGreetingByHour(18)).toBe('Boa noite');
      expect(getGreetingByHour(22)).toBe('Boa noite');
      expect(getGreetingByHour(3)).toBe('Boa noite');
    });
  });

  describe('formatCurrency', () => {
    it('deve formatar centavos para moeda brasileira BRL', () => {
      expect(formatCurrency(4000)).toBe('R$ 40,00');
      expect(formatCurrency(14280)).toBe('R$ 142,80');
      expect(formatCurrency(0)).toBe('R$ 0,00');
    });
  });

  describe('mapStatusLabel e mapStatusBadgeTone', () => {
    it('deve mapear status para labels em português amigáveis', () => {
      expect(mapStatusLabel('CONFIRMED')).toBe('Confirmado');
      expect(mapStatusLabel('IN_SERVICE')).toBe('Em atendimento');
      expect(mapStatusLabel('COMPLETED')).toBe('Concluído');
      expect(mapStatusLabel('WAITING')).toBe('Aguardando');
      expect(mapStatusLabel('CANCELLED')).toBe('Cancelado');
      expect(mapStatusLabel('NO_SHOW')).toBe('Não compareceu');
    });

    it('deve mapear status para tons semânticos de badge do design system', () => {
      expect(mapStatusBadgeTone('CONFIRMED')).toBe('brand');
      expect(mapStatusBadgeTone('IN_SERVICE')).toBe('warning');
      expect(mapStatusBadgeTone('COMPLETED')).toBe('success');
      expect(mapStatusBadgeTone('CANCELLED')).toBe('error');
      expect(mapStatusBadgeTone('NO_SHOW')).toBe('error');
    });
  });

  describe('findNextAppointment', () => {
    const mockAppointments: DashboardAppointment[] = [
      {
        id: '1',
        customerName: 'Cliente 1',
        customerPhone: '11999999999',
        serviceTitle: 'Barba Terapia',
        servicePriceInCents: 3500,
        durationMinutes: 30,
        barbermanId: 'barber-1',
        barbermanName: 'João',
        scheduledTime: '09:00',
        status: 'COMPLETED',
      },
      {
        id: '2',
        customerName: 'Cliente 2',
        customerPhone: '11988888888',
        serviceTitle: 'Corte Degradê',
        servicePriceInCents: 5000,
        durationMinutes: 45,
        barbermanId: 'barber-1',
        barbermanName: 'João',
        scheduledTime: '10:30',
        status: 'CONFIRMED',
      },
      {
        id: '3',
        customerName: 'Cliente 3',
        customerPhone: '11977777777',
        serviceTitle: 'Combo Cabelo + Barba',
        servicePriceInCents: 8000,
        durationMinutes: 60,
        barbermanId: 'barber-1',
        barbermanName: 'João',
        scheduledTime: '11:45',
        status: 'WAITING',
      },
    ];

    it('deve encontrar o próximo atendimento não-concluído da lista', () => {
      const next = findNextAppointment(mockAppointments);
      expect(next).toBeDefined();
      expect(next?.id).toBe('2');
      expect(next?.customerName).toBe('Cliente 2');
    });

    it('deve retornar null se todos estiverem concluídos ou cancelados', () => {
      const completedList: DashboardAppointment[] = [
        { ...mockAppointments[0], status: 'COMPLETED' },
        { ...mockAppointments[1], status: 'CANCELLED' },
      ];
      expect(findNextAppointment(completedList)).toBeNull();
    });
  });
});
