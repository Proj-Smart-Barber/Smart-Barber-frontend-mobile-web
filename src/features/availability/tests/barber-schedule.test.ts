import { describe, expect, it } from 'vitest';
import { AvailabilityMockAdapter } from '../api/availability.mock';
import { barberScheduleSchema, personalEntries, scheduleForm, sameSchedule } from '../model/barber-schedule.schema';
import type { WeeklyScheduleEntry } from '../api/availability.contract';

const entry = (start = '09:00', end = '12:00', barbermanId: string | null = 'A'): WeeklyScheduleEntry =>
  ({ id: 'test', weekday: 'MONDAY', barbermanId, range: { start, end } });
const opening = [entry('08:00', '12:00', null), entry('13:00', '18:00', null)];

const custom = (...entries: WeeklyScheduleEntry[]) => scheduleForm({ schedules: entries, state: 'CUSTOM' });

describe('Minha jornada — formulário', () => {
  it('representa sete dias, folgas e vários períodos', () => {
    const form = custom(entry(), entry('13:00', '17:00'));
    expect(form.days).toHaveLength(7);
    expect(form.days[0].entries).toHaveLength(2);
    expect(form.days[6].entries).toEqual([]);
    expect(barberScheduleSchema(opening).safeParse(form).success).toBe(true);
  });
  it.each([['12:00', '09:00'], ['09:00', '09:00'], ['25:00', '26:00'],
    ['23:00', '02:00'], ['09:00', '17:00'], ['07:00', '10:00']])(
    'rejeita %s–%s, incluindo intervalo que atravessa fechamento', (start, end) => {
      expect(barberScheduleSchema(opening).safeParse(custom(entry(start, end))).success).toBe(false);
    });
  it('rejeita sobreposição e permite períodos adjacentes', () => {
    expect(barberScheduleSchema(opening).safeParse(custom(entry(), entry('11:00', '12:00'))).success).toBe(false);
    expect(barberScheduleSchema(opening).safeParse(custom(entry('08:00', '09:00'), entry())).success).toBe(true);
  });
  it('CUSTOM exige períodos; INHERIT e CLOSED não os enviam e não se confundem com vazio', () => {
    const schema = barberScheduleSchema(opening);
    expect(schema.safeParse(custom()).success).toBe(false);
    for (const state of ['INHERIT', 'CLOSED'] as const) {
      const form = scheduleForm({ schedules: [entry()], state });
      expect(form.state).toBe(state);
      expect(form.days.every(day => day.entries.length === 0)).toBe(true);
      expect(schema.safeParse(form).success).toBe(true);
      expect(personalEntries(form, 'A')).toEqual([]);
    }
  });
  it('sem expediente da unidade não aceita períodos próprios', () => {
    expect(barberScheduleSchema([]).safeParse(custom(entry())).success).toBe(false);
    expect(barberScheduleSchema([]).safeParse(scheduleForm({ schedules: [], state: 'CLOSED' })).success).toBe(true);
  });
  it('aceita a união de períodos gerais contíguos sem inventar uma pausa', () => {
    const contiguous = [entry('08:00', '12:00', null), entry('12:00', '18:00', null)];
    expect(barberScheduleSchema(contiguous).safeParse(custom(entry('09:00', '17:00'))).success).toBe(true);
  });
  it('ignora horários de outro profissional ao validar abertura', () => {
    expect(barberScheduleSchema([entry()]).safeParse(custom(entry())).success).toBe(false);
  });
  it('deriva identidade exclusivamente da sessão', () => {
    expect(personalEntries(custom(entry('09:00', '12:00', 'B')), 'A')[0].barbermanId).toBe('A');
    expect(() => personalEntries(custom(), '')).toThrow();
  });
  it('compara jornadas sem depender de IDs ou da ordem', () => {
    expect(sameSchedule([entry(), entry('13:00', '17:00')], [entry('13:00', '17:00'), { ...entry(), id: 'new' }])).toBe(true);
    expect(sameSchedule([entry()], [])).toBe(false);
  });
});
describe('Minha jornada — isolamento e regressão do mock', () => {
  it('semana vazia A não apaga B, geral ou outra unidade', async () => {
    const repo = new AvailabilityMockAdapter(0);
    const general = await repo.getWeeklySchedule('shop-1');
    await repo.saveWeeklySchedule('shop-1', [entry()], 'A');
    await repo.saveWeeklySchedule('shop-1', [entry()], 'B');
    await repo.saveWeeklySchedule('shop-2', [entry()], 'A');
    await repo.saveWeeklySchedule('shop-1', [], 'A');
    expect(await repo.getWeeklySchedule('shop-1', 'A')).toEqual([]);
    expect(await repo.getWeeklySchedule('shop-1', 'B')).toHaveLength(1);
    expect(await repo.getWeeklySchedule('shop-2', 'A')).toHaveLength(1);
    expect(await repo.getWeeklySchedule('shop-1')).toEqual(general);
  });
  it('salvar geral é isolado por unidade e não apaga profissional', async () => {
    const repo = new AvailabilityMockAdapter(0);
    await repo.saveWeeklySchedule('one', [entry()], 'A');
    await repo.saveWeeklySchedule('one', []);
    expect(await repo.getWeeklySchedule('one')).toEqual([]);
    expect(await repo.getWeeklySchedule('two')).toHaveLength(11);
    expect(await repo.getWeeklySchedule('one', 'A')).toHaveLength(1);
    expect((await repo.getBarbershop('two')).id).toBe('two');
  });
  it('escopo explícito prevalece sobre entradas adulteradas', async () => {
    const repo = new AvailabilityMockAdapter(0);
    await repo.saveWeeklySchedule('shop', [entry('09:00', '12:00', 'B')], 'A');
    expect((await repo.getWeeklySchedule('shop', 'A'))[0].barbermanId).toBe('A');
    expect(await repo.getWeeklySchedule('shop', 'B')).toEqual([]);
  });
  it('consultas retornam cópias e não permitem editar o armazenamento', async () => {
    const repo = new AvailabilityMockAdapter(0);
    const result = await repo.getWeeklySchedule('shop');
    result[0].range.start = '00:00';
    expect((await repo.getWeeklySchedule('shop'))[0].range.start).toBe('08:00');
  });
});
