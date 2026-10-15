import { describe, expect, it, vi } from 'vitest';
import { AvailabilityMockAdapter } from '../api/availability.mock';
import { BarberScheduleError } from '../api/barber-schedule-error';
import { barberScheduleSchema, personalEntries, scheduleForm, sameSchedule } from '../model/barber-schedule.schema';
import { saveBarberSchedule } from '../model/save-barber-schedule';
import type { WeeklyScheduleEntry } from '../api/availability.contract';

const entry = (start = '09:00', end = '12:00', barbermanId: string | null = 'A'): WeeklyScheduleEntry =>
  ({ id: 'test', weekday: 'MONDAY', barbermanId, range: { start, end } });
const opening = [entry('08:00', '12:00', null), entry('13:00', '18:00', null)];

describe('Minha jornada — formulário', () => {
  it('representa sete dias, folgas e vários períodos', () => {
    const form = scheduleForm([entry(), entry('13:00', '17:00')]);
    expect(form.days).toHaveLength(7);
    expect(form.days[0].entries).toHaveLength(2);
    expect(form.days[6].entries).toEqual([]);
    expect(barberScheduleSchema(opening).safeParse(form).success).toBe(true);
  });
  it.each([['12:00', '09:00'], ['09:00', '09:00'], ['25:00', '26:00'],
    ['23:00', '02:00'], ['09:00', '17:00'], ['07:00', '10:00']])(
    'rejeita %s–%s, incluindo intervalo que atravessa fechamento', (start, end) => {
      expect(barberScheduleSchema(opening).safeParse(scheduleForm([entry(start, end)])).success).toBe(false);
    });
  it('rejeita sobreposição e permite períodos adjacentes', () => {
    expect(barberScheduleSchema(opening).safeParse(scheduleForm([entry(), entry('11:00', '12:00')])).success).toBe(false);
    expect(barberScheduleSchema(opening).safeParse(scheduleForm([entry('08:00', '09:00'), entry()])).success).toBe(true);
  });
  it('sem abertura aceita somente semana fechada', () => {
    expect(barberScheduleSchema([]).safeParse(scheduleForm([])).success).toBe(true);
    expect(barberScheduleSchema([]).safeParse(scheduleForm([entry()])).success).toBe(false);
  });
  it('aceita a união de períodos gerais contíguos sem inventar uma pausa', () => {
    const contiguous = [entry('08:00', '12:00', null), entry('12:00', '18:00', null)];
    expect(barberScheduleSchema(contiguous).safeParse(scheduleForm([entry('09:00', '17:00')])).success).toBe(true);
  });
  it('ignora horários de outro profissional ao validar abertura', () => {
    expect(barberScheduleSchema([entry()]).safeParse(scheduleForm([entry()])).success).toBe(false);
  });
  it('deriva identidade exclusivamente da sessão e preserva semana vazia', () => {
    expect(personalEntries(scheduleForm([entry('09:00', '12:00', 'B')]), 'A')[0].barbermanId).toBe('A');
    expect(personalEntries(scheduleForm([]), 'A')).toEqual([]);
    expect(() => personalEntries(scheduleForm([]), '')).toThrow();
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

describe('Minha jornada — gravação e recuperação', () => {
  it.each([401, 403, 409, 422, 503, 0])('falha %s é determinística e não grava', async status => {
    const repo = new AvailabilityMockAdapter(0);
    repo.failNextSchedule('write', 'shop', 'A', new BarberScheduleError('Falha simulada', status, 'TEST'));
    const result = await saveBarberSchedule(repo, 'shop', 'A', [entry()]);
    expect(result.kind).toBe('rejected');
    expect(await repo.getWeeklySchedule('shop', 'A')).toEqual([]);
    expect((await saveBarberSchedule(repo, 'shop', 'A', [entry()])).kind).toBe('saved');
  });
  it('erro em A não afeta B nem outra unidade', async () => {
    const repo = new AvailabilityMockAdapter(0);
    repo.failNextSchedule('read', 'shop', 'A', new BarberScheduleError('Sessão expirada', 401, 'UNAUTHORIZED'));
    expect(await repo.getWeeklySchedule('shop', 'B')).toEqual([]);
    expect(await repo.getWeeklySchedule('other', 'A')).toEqual([]);
    await expect(repo.getWeeklySchedule('shop', 'A')).rejects.toMatchObject({ status: 401 });
    expect(await repo.getWeeklySchedule('shop', 'A')).toEqual([]);
  });
  it('PUT confirmado + GET falho informa sucesso parcial, sem repetir escrita', async () => {
    const repo = new AvailabilityMockAdapter(0);
    repo.failNextSchedule('write', 'shop', 'A', new BarberScheduleError('Releitura falhou', 503, 'REFETCH_FAILED', 'saved'));
    const spy = vi.spyOn(repo, 'saveWeeklySchedule');
    const result = await saveBarberSchedule(repo, 'shop', 'A', [entry()]);
    expect(result.kind).toBe('unconfirmed-view');
    expect(result.message).toContain('Jornada salva');
    expect(await repo.getWeeklySchedule('shop', 'A')).toHaveLength(1);
    expect(spy).toHaveBeenCalledTimes(1);
  });
  it('timeout após gravação reconcilia com GET, sem segundo PUT', async () => {
    const repo = new AvailabilityMockAdapter(0);
    repo.failNextSchedule('write', 'shop', 'A', new BarberScheduleError('Timeout', 0, 'TIMEOUT', 'unknown'));
    const spy = vi.spyOn(repo, 'saveWeeklySchedule');
    expect((await saveBarberSchedule(repo, 'shop', 'A', [entry()])).kind).toBe('saved');
    expect(spy).toHaveBeenCalledTimes(1);
  });
  it('timeout com GET falho mantém estado desconhecido', async () => {
    const repo = new AvailabilityMockAdapter(0);
    repo.failNextSchedule('write', 'shop', 'A', new BarberScheduleError('Timeout', 0, 'TIMEOUT', 'unknown'));
    repo.failNextSchedule('read', 'shop', 'A', new BarberScheduleError('Rede', 0, 'NETWORK'));
    expect((await saveBarberSchedule(repo, 'shop', 'A', [entry()])).kind).toBe('unknown');
  });
  it('timeout sem gravação não presume sucesso nem repete PUT', async () => {
    const repo = new AvailabilityMockAdapter(0);
    const spy = vi.spyOn(repo, 'saveWeeklySchedule').mockRejectedValue(new BarberScheduleError('Timeout', 0, 'TIMEOUT', 'unknown'));
    expect((await saveBarberSchedule(repo, 'shop', 'A', [entry()])).kind).toBe('unknown');
    expect(spy).toHaveBeenCalledTimes(1);
  });
  it('proíbe gravação sem identidade ou unidade', async () => {
    const repo = new AvailabilityMockAdapter(0);
    const spy = vi.spyOn(repo, 'saveWeeklySchedule');
    await expect(saveBarberSchedule(repo, 'shop', '', [])).rejects.toThrow();
    await expect(saveBarberSchedule(repo, '', 'A', [])).rejects.toThrow();
    expect(spy).not.toHaveBeenCalled();
  });
});
