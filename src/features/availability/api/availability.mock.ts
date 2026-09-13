/**
 * Adapter de DESENVOLVIMENTO da Disponibilidade.
 *
 * Simula o domínio de disponibilidade em memória e passa os DTOs de mock
 * pelo mapper antes de devolver à UI. O adapter HTTP real possui seu próprio
 * contrato de transporte, pois a API atual usa camelCase e wrappers distintos.
 */
import type {
  AvailabilityException,
  AvailabilitySlot,
  AvailabilityWriteContext,
  IAvailabilityRepository,
  WeeklyScheduleEntry,
} from './availability.contract';
import type { Barbershop } from '@/entities/barbershop';
import { ENV } from '@/shared/config/env';
import {
  mapBarbershopDto,
  mapWeeklyScheduleList,
  mapExceptionList,
  mapSlotList,
} from './availability.mapper';
import type {
  BarbershopRawDto,
  WeeklyScheduleEntryRawDto,
  AvailabilityExceptionRawDto,
} from './availability.dto';

/** Seed fixo até barbershopId existir de verdade na sessão (Issue empresa pendente na main). */
export const SEED_BARBERSHOP_ID = ENV.BARBERSHOP_ID;

const MOCK_BARBERSHOP_RAW: BarbershopRawDto = {
  id: SEED_BARBERSHOP_ID,
  name: 'Barbearia Exemplo',
  timezone: 'America/Sao_Paulo',
};

// Jornada inicial: seg-sex com pausa para almoço (dois ranges por dia),
// sábado corrido — confirmado no protótipo Stitch "Jornada e Horários".
const INITIAL_SCHEDULE_RAW: WeeklyScheduleEntryRawDto[] = [
  { id: 'sch-001', day_of_week: 'MONDAY', barberman_id: null, open_time: '08:00', close_time: '12:00' },
  { id: 'sch-002', day_of_week: 'MONDAY', barberman_id: null, open_time: '13:00', close_time: '18:00' },
  { id: 'sch-003', day_of_week: 'TUESDAY', barberman_id: null, open_time: '08:00', close_time: '12:00' },
  { id: 'sch-004', day_of_week: 'TUESDAY', barberman_id: null, open_time: '13:00', close_time: '18:00' },
  { id: 'sch-005', day_of_week: 'WEDNESDAY', barberman_id: null, open_time: '08:00', close_time: '12:00' },
  { id: 'sch-006', day_of_week: 'WEDNESDAY', barberman_id: null, open_time: '13:00', close_time: '18:00' },
  { id: 'sch-007', day_of_week: 'THURSDAY', barberman_id: null, open_time: '08:00', close_time: '12:00' },
  { id: 'sch-008', day_of_week: 'THURSDAY', barberman_id: null, open_time: '13:00', close_time: '18:00' },
  { id: 'sch-009', day_of_week: 'FRIDAY', barberman_id: null, open_time: '08:00', close_time: '12:00' },
  { id: 'sch-010', day_of_week: 'FRIDAY', barberman_id: null, open_time: '13:00', close_time: '18:00' },
  { id: 'sch-011', day_of_week: 'SATURDAY', barberman_id: null, open_time: '09:00', close_time: '14:00' },
  // SUNDAY ausente = fechado
];

const INITIAL_EXCEPTIONS_RAW: AvailabilityExceptionRawDto[] = [
  {
    id: 'exc-001',
    date: '2026-12-25',
    barberman_id: null,
    open_time: null,
    close_time: null,
    reason: 'Natal',
  },
];

let nextScheduleSeq = INITIAL_SCHEDULE_RAW.length + 1;
let nextExceptionSeq = INITIAL_EXCEPTIONS_RAW.length + 1;

export class AvailabilityMockAdapter implements IAvailabilityRepository {
  private readonly latencyMs: number;
  private scheduleRaw: WeeklyScheduleEntryRawDto[] = [...INITIAL_SCHEDULE_RAW];
  private exceptionsRaw: AvailabilityExceptionRawDto[] = [...INITIAL_EXCEPTIONS_RAW];

  constructor(latencyMs = 350) {
    this.latencyMs = latencyMs;
  }

  private delay(): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, this.latencyMs));
  }

  async getBarbershop(barbershopId: string): Promise<Barbershop> {
    await this.delay();
    const mapped = mapBarbershopDto(MOCK_BARBERSHOP_RAW);
    if (!mapped) throw new Error(`Barbearia ${barbershopId} inválida no mock.`);
    return mapped;
  }

  async getWeeklySchedule(
    _barbershopId: string,
    barbermanId?: string,
  ): Promise<WeeklyScheduleEntry[]> {
    await this.delay();
    const filtered = this.scheduleRaw.filter((entry) =>
      barbermanId ? entry.barberman_id === barbermanId : entry.barberman_id === null,
    );
    return mapWeeklyScheduleList(filtered);
  }

  async saveWeeklySchedule(
    _barbershopId: string,
    entries: Omit<WeeklyScheduleEntry, 'id'>[],
    _context?: AvailabilityWriteContext,
  ): Promise<WeeklyScheduleEntry[]> {
    await this.delay();
    const barbermanId = entries[0]?.barbermanId ?? null;

    // Substitui só as linhas do mesmo "dono" (loja geral ou profissional específico)
    const untouched = this.scheduleRaw.filter((e) => e.barberman_id !== barbermanId);
    const savedRaw: WeeklyScheduleEntryRawDto[] = entries.map((entry) => ({
      id: `sch-${nextScheduleSeq++}`,
      day_of_week: entry.weekday,
      barberman_id: entry.barbermanId,
      open_time: entry.range.start,
      close_time: entry.range.end,
    }));

    this.scheduleRaw = [...untouched, ...savedRaw];
    return mapWeeklyScheduleList(savedRaw);
  }

  async listExceptions(
    _barbershopId: string,
    barbermanId?: string,
  ): Promise<AvailabilityException[]> {
    await this.delay();
    const filtered = this.exceptionsRaw.filter((e) =>
      barbermanId ? e.barberman_id === barbermanId : e.barberman_id === null,
    );
    return mapExceptionList(filtered);
  }

  async createException(
    _barbershopId: string,
    exception: Omit<AvailabilityException, 'id'>,
  ): Promise<AvailabilityException> {
    await this.delay();
    const raw: AvailabilityExceptionRawDto = {
      id: `exc-${nextExceptionSeq++}`,
      date: exception.date,
      barberman_id: exception.barbermanId,
      open_time: exception.openTime,
      close_time: exception.closeTime,
      reason: exception.reason,
    };
    this.exceptionsRaw = [...this.exceptionsRaw, raw];
    const mapped = mapExceptionList([raw]);
    return mapped[0]!;
  }

  async updateException(
    _barbershopId: string,
    exceptionId: string,
    exception: Partial<Omit<AvailabilityException, 'id'>>,
  ): Promise<AvailabilityException> {
    await this.delay();
    const index = this.exceptionsRaw.findIndex((e) => e.id === exceptionId);
    if (index === -1) throw new Error(`Exceção ${exceptionId} não encontrada.`);

    const current = this.exceptionsRaw[index]!;
    const updated: AvailabilityExceptionRawDto = {
      ...current,
      ...(exception.date !== undefined && { date: exception.date }),
      ...(exception.barbermanId !== undefined && { barberman_id: exception.barbermanId }),
      ...(exception.openTime !== undefined && { open_time: exception.openTime }),
      ...(exception.closeTime !== undefined && { close_time: exception.closeTime }),
      ...(exception.reason !== undefined && { reason: exception.reason }),
    };
    this.exceptionsRaw[index] = updated;
    return mapExceptionList([updated])[0]!;
  }

  async removeException(_barbershopId: string, exceptionId: string): Promise<void> {
    await this.delay();
    this.exceptionsRaw = this.exceptionsRaw.filter((e) => e.id !== exceptionId);
  }

  async getCalculatedAvailability(
    _barbershopId: string,
    params: { serviceIds: string[]; date: string; barbermanId?: string },
  ): Promise<AvailabilitySlot[]> {
    await this.delay();
    // Mock simplificado: gera slots de 30 min dentro do período da manhã.
    // Não reflete a regra real (jornada + exceção + duração + bookings).
    // Substituir pelo AgendaHttpAdapter quando o endpoint real existir.
    const slots = mapSlotList([
      { start: `${params.date}T09:00:00-03:00`, end: `${params.date}T09:30:00-03:00` },
      { start: `${params.date}T09:30:00-03:00`, end: `${params.date}T10:00:00-03:00` },
      { start: `${params.date}T10:00:00-03:00`, end: `${params.date}T10:30:00-03:00` },
    ]);
    return slots;
  }
}
