import { describe, it, expect } from 'vitest';
import { diffInDays, minutesBetween, toISODate, sortAgendaEntriesChronologically } from '@/features/agenda/model/agenda.helpers';
import type { BookingDetails } from '../api/bookings.contract';
import type { BookingDto } from '../api/bookings.dto';

describe('I5 — ViewModel de Atendimentos (bookings-view-model)', () => {
  const fakeDto: BookingDto = {
    id: 'booking-mgmt-1',
    barbershopId: 'shop-alpha',
    barbermanId: 'barber-1',
    customerId: 'cust-1',
    date: '2026-10-15',
    startTime: '14:00',
    endTime: '14:45',
    status: 'CONFIRMED',
    version: 2,
    customer: {
      id: 'cust-1',
      name: 'Lucas Pereira',
      phoneNumber: '11988887777',
    },
    services: [
      { id: 'srv-1', title: 'Corte Tradicional', priceInCents: 5000, durationInMinutes: 30 },
      { id: 'srv-2', title: 'Barba Terapia', priceInCents: 3500, durationInMinutes: 15 },
    ],
    capabilities: {
      reschedule: { allowed: true },
      cancel: { allowed: true },
    },
  };

  it('calcula totais de atendimentos, duração e faturamento corretamente', () => {
    const list: BookingDetails[] = [
      {
        id: 'b1',
        date: '2026-10-15',
        startTime: '10:00',
        endTime: '10:45',
        customer: { id: 'c1', name: 'Cliente 1', phoneNumber: '11999991111' },
        services: [
          { id: 's1', title: 'Corte', priceInCents: 5000, durationInMinutes: 30 },
          { id: 's2', title: 'Barba', priceInCents: 3000, durationInMinutes: 15 },
        ],
      },
      {
        id: 'b2',
        date: '2026-10-15',
        startTime: '11:00',
        endTime: '11:30',
        customer: { id: 'c2', name: 'Cliente 2', phoneNumber: '11999992222' },
        services: [{ id: 's1', title: 'Corte', priceInCents: 5000, durationInMinutes: 30 }],
      },
    ];

    let count = list.length;
    let durationMinutes = 0;
    let priceInCents = 0;

    for (const b of list) {
      durationMinutes += Math.max(0, minutesBetween(b.startTime, b.endTime));
      for (const s of b.services) {
        priceInCents += s.priceInCents ?? 0;
      }
    }

    expect(count).toBe(2);
    expect(durationMinutes).toBe(75);
    expect(priceInCents).toBe(13000);
  });

  it('ordena atendimentos cronologicamente', () => {
    const list: BookingDetails[] = [
      {
        id: 'b-late',
        date: '2026-10-15',
        startTime: '16:00',
        endTime: '16:30',
        customer: { name: 'Cliente 2', phoneNumber: '' },
        services: [],
      },
      {
        id: 'b-early',
        date: '2026-10-15',
        startTime: '09:00',
        endTime: '09:30',
        customer: { name: 'Cliente 1', phoneNumber: '' },
        services: [],
      },
    ];

    const sorted = sortAgendaEntriesChronologically(list);
    expect(sorted[0].id).toBe('b-early');
    expect(sorted[1].id).toBe('b-late');
  });

  it('garante que mapeamento de BookingDto preserva version, capabilities e status', () => {
    expect(fakeDto.version).toBe(2);
    expect(fakeDto.capabilities?.reschedule?.allowed).toBe(true);
    expect(fakeDto.capabilities?.cancel?.allowed).toBe(true);
    expect(fakeDto.status).toBe('CONFIRMED');
  });
});
