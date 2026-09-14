/**
 * Adapter de DESENVOLVIMENTO da Agenda.
 *
 * Simula o backend: gera disponibilidade CONSOLIDADA (agendamentos,
 * buffers, holds e horários livres já resolvidos, como o servidor
 * deveria entregar) e devolve no formato bruto de DTO, passando pelo
 * mapper antes de chegar ao domínio.
 *
 * Substituir por AgendaHttpAdapter quando a API publicar o contrato.
 */
import type { AgendaDay, AgendaScope, IAgendaRepository } from './agenda.contract';
import type { AgendaDayRawDto, AgendaEntryRawDto } from './agenda.dto';
import { mapAgendaDayDto } from './agenda.mapper';
import { parseISODate, toISODate } from '../model/agenda.helpers';

const JOURNEY_START_MIN = 9 * 60; // 09:00
const JOURNEY_END_MIN = 18 * 60; // 18:00
const MIN_FREE_SLOT_MIN = 15;

const MOCK_SERVICES = [
  { title: 'Corte de cabelo', priceInCents: 4000, durationMin: 45 },
  { title: 'Barba Terapia com Toalha Quente', priceInCents: 4500, durationMin: 30 },
  { title: 'Combo Cabelo + Barba Alinhada', priceInCents: 8000, durationMin: 60 },
  { title: 'Degradê Navalhado + Pigmentação', priceInCents: 6500, durationMin: 45 },
  { title: 'Corte Social na Tesoura', priceInCents: 5000, durationMin: 30 },
] as const;

const MOCK_CUSTOMERS = [
  'Ana Pereira',
  'Lucas Mendes',
  'Rafael Guimarães',
  'Guilherme Castro',
  'Thiago Oliveira',
  'Bruno Vasconcelos',
  'Carlos Eduardo',
  'Diego Fernandes',
] as const;

const OWNER_PROFESSIONALS = [
  { id: 'e18f23b3-0a0e-4c1d-bf77-571f0559c29e', name: 'João Souza' },
  { id: 'barber-marcos', name: 'Marcos Barbeiro' },
] as const;

function hashString(value: string): number {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/** PRNG determinístico (xorshift32) — mesma data/escopo, mesmo dia gerado. */
function createRng(seed: number): () => number {
  let state = seed || 1;
  return () => {
    state ^= state << 13;
    state >>>= 0;
    state ^= state >>> 17;
    state ^= state << 5;
    state >>>= 0;
    return state / 4294967296;
  };
}

function minutesToClock(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

function pickWeightedStatus(rng: () => number): string {
  const roll = rng();
  if (roll < 0.45) return 'CONFIRMED';
  if (roll < 0.65) return 'WAITING';
  if (roll < 0.8) return 'COMPLETED';
  if (roll < 0.9) return 'IN_SERVICE';
  if (roll < 0.95) return 'CANCELLED';
  return 'NO_SHOW';
}

function buildClosedDay(date: string): AgendaDayRawDto {
  return {
    date,
    summary: {
      total_slots: 0,
      booked_slots: 0,
      occupancy_rate_percent: 0,
      next_appointment: null,
      is_closed: true,
    },
    entries: [],
  };
}

function buildOpenDay(date: string, scope: AgendaScope, now: Date): AgendaDayRawDto {
  const rng = createRng(hashString(`${date}:${scope.role}:${scope.staffId}`));
  const entries: AgendaEntryRawDto[] = [];
  const isToday = date === toISODate(now);
  const professionals =
    scope.role === 'OWNER'
      ? OWNER_PROFESSIONALS.map((p) => ({ ...p }))
      : [{ id: scope.staffId, name: 'Barbeiro' }];

  let cursor = JOURNEY_START_MIN;
  const appointmentCount = 4 + Math.floor(rng() * 4); // 4 a 7 agendamentos
  let sequence = 0;
  let bookedCount = 0;

  while (sequence < appointmentCount && cursor + 60 <= JOURNEY_END_MIN) {
    const service = MOCK_SERVICES[Math.floor(rng() * MOCK_SERVICES.length)];
    const professional = professionals[Math.floor(rng() * professionals.length)];
    const customer = MOCK_CUSTOMERS[Math.floor(rng() * MOCK_CUSTOMERS.length)];
    const status = pickWeightedStatus(rng);
    const paymentRoll = rng();

    entries.push({
      type: 'APPOINTMENT',
      id: `apt-${date}-${sequence}`,
      start_time: minutesToClock(cursor),
      end_time: minutesToClock(cursor + service.durationMin),
      customer_name: customer,
      service_title: service.title,
      service_price_in_cents: service.priceInCents,
      professional_id: professional.id,
      professional_name: professional.name,
      status,
      payment_status: paymentRoll < 0.5 ? 'PAID' : paymentRoll < 0.8 ? 'PENDING' : null,
      checked_in_at: status === 'IN_SERVICE' ? minutesToClock(cursor) : null,
      has_conflict: rng() < 0.05,
    });
    bookedCount++;
    sequence++;
    cursor += service.durationMin;

    // Buffer de preparo entre atendimentos
    if (rng() < 0.7 && cursor + 10 <= JOURNEY_END_MIN && sequence < appointmentCount) {
      entries.push({
        type: 'BUFFER',
        id: `buf-${date}-${sequence}`,
        start_time: minutesToClock(cursor),
        end_time: minutesToClock(cursor + 10),
        kind: 'Preparo',
      });
      cursor += 10;
    }

    // Respiro entre blocos: hold temporário (somente hoje) ou horário livre
    const gap = [0, 15, 20, 30][Math.floor(rng() * 4)];
    if (gap >= MIN_FREE_SLOT_MIN && cursor + gap <= JOURNEY_END_MIN) {
      if (isToday && rng() < 0.5) {
        const expiresInMinutes = 3 + Math.floor(rng() * 8); // 3 a 10 min
        entries.push({
          type: 'HOLD',
          id: `hold-${date}-${sequence}`,
          start_time: minutesToClock(cursor),
          end_time: minutesToClock(cursor + gap),
          expires_at: new Date(now.getTime() + expiresInMinutes * 60_000).toISOString(),
          reason: null,
        });
        bookedCount++;
      } else {
        entries.push({
          type: 'FREE_SLOT',
          id: `free-${date}-${sequence}`,
          start_time: minutesToClock(cursor),
          end_time: minutesToClock(cursor + gap),
        });
      }
      cursor += gap;
    }
  }

  // Faixa final livre até o fim da jornada
  if (JOURNEY_END_MIN - cursor >= MIN_FREE_SLOT_MIN) {
    entries.push({
      type: 'FREE_SLOT',
      id: `free-${date}-final`,
      start_time: minutesToClock(cursor),
      end_time: minutesToClock(JOURNEY_END_MIN),
    });
  }

  const nextAppointment = entries
    .filter(
      (entry): entry is Extract<AgendaEntryRawDto, { type: 'APPOINTMENT' }> =>
        entry.type === 'APPOINTMENT' &&
        (entry.status === 'CONFIRMED' || entry.status === 'WAITING' || entry.status === 'IN_SERVICE'),
    )
    .sort((a, b) => a.start_time.localeCompare(b.start_time))[0];

  const totalSlots = Math.floor((JOURNEY_END_MIN - JOURNEY_START_MIN) / 30);

  return {
    date,
    summary: {
      total_slots: totalSlots,
      booked_slots: bookedCount,
      occupancy_rate_percent: Math.min(100, Math.round((bookedCount / totalSlots) * 100)),
      next_appointment: nextAppointment
        ? {
            start_time: nextAppointment.start_time,
            customer_name: nextAppointment.customer_name,
            service_title: nextAppointment.service_title,
            professional_name: nextAppointment.professional_name,
          }
        : null,
      is_closed: false,
    },
    entries,
  };
}

export class AgendaMockAdapter implements IAgendaRepository {
  private latencyMs: number;

  constructor(latencyMs = 350) {
    this.latencyMs = latencyMs;
  }

  async getAgendaDay(params: { scope: AgendaScope; date: string }): Promise<AgendaDay> {
    await new Promise((resolve) => setTimeout(resolve, this.latencyMs));

    const now = new Date();
    const weekday = parseISODate(params.date).getDay();

    // Domingo sem expediente
    if (weekday === 0) {
      return mapAgendaDayDto(buildClosedDay(params.date));
    }

    return mapAgendaDayDto(buildOpenDay(params.date, params.scope, now));
  }
}
