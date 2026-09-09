import { z } from 'zod';

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

const timeSchema = z.string().regex(TIME_PATTERN, 'Horário inválido (use HH:mm)');

export const timeRangeSchema = z
  .object({ start: timeSchema, end: timeSchema })
  .refine((r) => r.end > r.start, {
    message: 'O horário final deve ser depois do inicial.',
    path: ['end'],
  });

export const weeklyScheduleEntrySchema = z.object({
  weekday: z.enum([
    'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY',
  ]),
  barbermanId: z.string().nullable(),
  range: timeRangeSchema,
});

/** Valida um dia inteiro: ranges não podem se sobrepor. */
export const scheduleDaySchema = z
  .array(weeklyScheduleEntrySchema)
  .refine(
    (entries) => {
      const sorted = [...entries].sort((a, b) => a.range.start.localeCompare(b.range.start));
      for (let i = 1; i < sorted.length; i++) {
        if (sorted[i]!.range.start < sorted[i - 1]!.range.end) return false;
      }
      return true;
    },
    { message: 'Existe conflito entre os intervalos deste dia.' },
  );

export const availabilityExceptionSchema = z
  .object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida (use YYYY-MM-DD)'),
    barbermanId: z.string().nullable(),
    openTime: timeSchema.nullable(),
    closeTime: timeSchema.nullable(),
    reason: z.string().nullable(),
  })
  .refine(
    (e) => {
      const bothFilled = e.openTime !== null && e.closeTime !== null;
      const bothEmpty = e.openTime === null && e.closeTime === null;
      return bothFilled || bothEmpty;
    },
    { message: 'Informe os dois horários ou deixe os dois em branco (dia fechado).', path: ['closeTime'] },
  )
  .refine(
    (e) => {
      if (e.openTime && e.closeTime) return e.closeTime > e.openTime;
      return true;
    },
    { message: 'O horário de fechamento deve ser depois do de abertura.', path: ['closeTime'] },
  );

export type TimeRangeFormValues = z.infer<typeof timeRangeSchema>;
export type WeeklyScheduleEntryFormValues = z.infer<typeof weeklyScheduleEntrySchema>;
export type AvailabilityExceptionFormValues = z.infer<typeof availabilityExceptionSchema>;
