import { describe, expect, it } from 'vitest';
import { mapAgendaDayDto } from '../api/agenda.mapper';
import type { AgendaDayRawDto } from '../api/agenda.dto';

function buildValidDayDto(): AgendaDayRawDto {
  return {
    date: '2026-10-05',
    summary: {
      total_slots: 18,
      booked_slots: 6,
      occupancy_rate_percent: 33,
      next_appointment: {
        start_time: '09:00',
        customer_name: 'Ana Pereira',
        service_title: 'Corte de cabelo',
        professional_name: 'João Souza',
      },
      is_closed: false,
    },
    entries: [
      {
        type: 'APPOINTMENT',
        id: 'apt-1',
        start_time: '09:00',
        end_time: '09:45',
        customer_name: 'Ana Pereira',
        service_title: 'Corte de cabelo',
        service_price_in_cents: 4000,
        professional_id: 'b-1',
        professional_name: 'João Souza',
        status: 'CONFIRMED',
        payment_status: 'PAID',
        checked_in_at: null,
        has_conflict: false,
      },
      {
        type: 'FREE_SLOT',
        id: 'free-1',
        start_time: '10:00',
        end_time: '10:45',
      },
      {
        type: 'HOLD',
        id: 'hold-1',
        start_time: '11:00',
        end_time: '11:20',
        expires_at: '2026-10-05T11:10:00.000Z',
        reason: null,
      },
      {
        type: 'BUFFER',
        id: 'buf-1',
        start_time: '11:20',
        end_time: '11:30',
        kind: 'Preparo',
      },
    ],
  };
}

describe('Agenda Mapper', () => {
  it('deve mapear um dia válido para o domínio', () => {
    const day = mapAgendaDayDto(buildValidDayDto());

    expect(day.date).toBe('2026-10-05');
    expect(day.entries).toHaveLength(4);

    const [appointment, freeSlot, hold, buffer] = day.entries;
    expect(appointment).toMatchObject({
      type: 'APPOINTMENT',
      startTime: '09:00',
      endTime: '09:45',
      customerName: 'Ana Pereira',
      paymentStatus: 'PAID',
      checkedInAt: null,
      hasConflict: false,
    });
    expect(freeSlot).toMatchObject({ type: 'FREE_SLOT', startTime: '10:00', endTime: '10:45' });
    expect(hold).toMatchObject({ type: 'HOLD', expiresAt: '2026-10-05T11:10:00.000Z' });
    expect(buffer).toMatchObject({ type: 'BUFFER', kind: 'Preparo' });

    expect(day.summary.occupancyRatePercent).toBe(33);
    expect(day.summary.nextAppointment).toMatchObject({
      startTime: '09:00',
      customerName: 'Ana Pereira',
    });
  });

  it('deve descartar entradas com tipo desconhecido ou campos inválidos', () => {
    const dto = buildValidDayDto();
    (dto.entries as any[]).push(
      { type: 'UNKNOWN', id: 'x', start_time: '12:00', end_time: '12:30' },
      { type: 'APPOINTMENT', id: '', start_time: '12:00', end_time: '12:30' },
      { type: 'FREE_SLOT', id: 'f-bad', start_time: '25:00', end_time: '12:30' },
      { type: 'HOLD', id: 'h-bad', start_time: 'ok', end_time: '12:30' },
    );

    const day = mapAgendaDayDto(dto);
    expect(day.entries).toHaveLength(4);
  });

  it('deve descartar agendamento com status inexistente', () => {
    const dto = buildValidDayDto();
    (dto.entries[0] as any).status = 'PENDING_MAGIC';

    const day = mapAgendaDayDto(dto);
    expect(day.entries.filter((e) => e.type === 'APPOINTMENT')).toHaveLength(0);
  });

  it('deve normalizar pagamento desconhecido e check-in inválido para null', () => {
    const dto = buildValidDayDto();
    const appointment = dto.entries[0] as any;
    appointment.payment_status = 'MYSTERY';
    appointment.checked_in_at = '99:99';

    const day = mapAgendaDayDto(dto);
    expect(day.entries[0]).toMatchObject({ paymentStatus: null, checkedInAt: null });
  });

  it('deve lidar com resumo incompleto e próximo atendimento inválido', () => {
    const dto = buildValidDayDto();
    dto.summary = {
      total_slots: null,
      booked_slots: null,
      occupancy_rate_percent: null,
      next_appointment: { start_time: 'banana', customer_name: 'x', service_title: 'y', professional_name: 'z' },
      is_closed: false,
    };

    const day = mapAgendaDayDto(dto);
    expect(day.summary.totalSlots).toBeNull();
    expect(day.summary.occupancyRatePercent).toBeNull();
    expect(day.summary.nextAppointment).toBeNull();
    expect(day.summary.isClosed).toBe(false);
  });

  it('deve tratar payload sem entradas como dia vazio', () => {
    const dto = buildValidDayDto();
    dto.entries = undefined as unknown as [];

    const day = mapAgendaDayDto(dto);
    expect(day.entries).toHaveLength(0);
  });
});
