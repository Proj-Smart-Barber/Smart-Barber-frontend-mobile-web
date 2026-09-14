import { describe, expect, it } from 'vitest';
import { AgendaMockAdapter } from '../api/agenda.mock';
import type { AgendaDay, AgendaDaySummary } from '../api/agenda.contract';
import { timeToMinutes } from '../model/agenda.helpers';

const OWNER_SCOPE = { role: 'OWNER' as const, staffId: 'owner-1' };
const BARBER_SCOPE = { role: 'BARBER' as const, staffId: 'barber-42' };

const JOURNEY_START_MIN = 9 * 60;
const JOURNEY_END_MIN = 18 * 60;

function assertValidTimeline(day: AgendaDay): void {
  expect(day.entries.length).toBeGreaterThan(0);

  const sorted = [...day.entries].sort(
    (a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime),
  );

  let previousEnd = JOURNEY_START_MIN;
  for (const entry of sorted) {
    const start = timeToMinutes(entry.startTime);
    const end = timeToMinutes(entry.endTime);

    expect(start).toBeGreaterThanOrEqual(JOURNEY_START_MIN);
    expect(end).toBeLessThanOrEqual(JOURNEY_END_MIN);
    expect(end).toBeGreaterThan(start);
    // Sem sobreposição: blocos consolidados sequenciais
    expect(start).toBeGreaterThanOrEqual(previousEnd);
    previousEnd = end;

    if (entry.type === 'FREE_SLOT') {
      expect(end - start).toBeGreaterThanOrEqual(15);
    }
  }
}

/** Remove a expiração dos holds para comparações determinísticas. */
function toComparableJson(day: AgendaDay): string {
  return JSON.stringify({
    ...day,
    entries: day.entries.map((entry) =>
      entry.type === 'HOLD' ? { ...entry, expiresAt: null } : entry,
    ),
  });
}

describe('AgendaMockAdapter', () => {
  const adapter = new AgendaMockAdapter(0);

  it('deve retornar dia fechado no domingo, sem entradas', async () => {
    const day = await adapter.getAgendaDay({ scope: OWNER_SCOPE, date: '2026-09-06' }); // domingo

    expect(day.summary.isClosed).toBe(true);
    expect(day.entries).toHaveLength(0);
    expect(day.summary.nextAppointment).toBeNull();
  });

  it('deve gerar dia operacional consolidado e válido na segunda-feira', async () => {
    const day = await adapter.getAgendaDay({ scope: OWNER_SCOPE, date: '2026-10-05' }); // segunda-feira

    expect(day.summary.isClosed).toBe(false);
    expect(day.date).toBe('2026-10-05');
    assertValidTimeline(day);

    const appointments = day.entries.filter((e) => e.type === 'APPOINTMENT');
    expect(appointments.length).toBeGreaterThanOrEqual(4);
    expect(day.summary.bookedSlots).not.toBeNull();
    expect(day.summary.occupancyRatePercent).not.toBeNull();
  });

  it('deve ser determinístico para a mesma data e escopo', async () => {
    const first = await adapter.getAgendaDay({ scope: OWNER_SCOPE, date: '2026-10-05' });
    const second = await adapter.getAgendaDay({ scope: OWNER_SCOPE, date: '2026-10-05' });

    expect(toComparableJson(second)).toBe(toComparableJson(first));
  });

  it('deve respeitar o escopo BARBER: apenas o próprio profissional', async () => {
    const day = await adapter.getAgendaDay({ scope: BARBER_SCOPE, date: '2026-10-05' });

    const appointments = day.entries.filter((e) => e.type === 'APPOINTMENT');
    expect(appointments.length).toBeGreaterThan(0);
    appointments.forEach((entry) => {
      if (entry.type === 'APPOINTMENT') {
        expect(entry.professionalId).toBe(BARBER_SCOPE.staffId);
      }
    });
  });

  it('deve expor resumo com ocupação coerente', async () => {
    const day = await adapter.getAgendaDay({ scope: OWNER_SCOPE, date: '2026-10-05' });
    const summary: AgendaDaySummary = day.summary;

    expect(summary.totalSlots).toBeGreaterThan(0);
    expect(summary.bookedSlots).toBeLessThanOrEqual(summary.totalSlots ?? 0);
    expect(summary.occupancyRatePercent).toBeGreaterThanOrEqual(0);
    expect(summary.occupancyRatePercent).toBeLessThanOrEqual(100);
  });
});
