import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { weeklyScheduleEntrySchema, scheduleDaySchema } from './availability.schema';
import { barberScheduleSchema, sameSchedule, scheduleForm } from './barber-schedule.schema';
import type { useAvailabilityViewModel } from './use-availability-view-model';

const generalSchema = z.object({ days: z.array(z.object({
  weekday: weeklyScheduleEntrySchema.shape.weekday,
  entries: scheduleDaySchema,
})) });
export type AvailabilityFormValues = z.infer<typeof generalSchema>;

export function useAvailabilityScheduleForm(vm: ReturnType<typeof useAvailabilityViewModel>) {
  const schema = useMemo(() => vm.isIndividual
    ? barberScheduleSchema(vm.opening ?? []) : generalSchema, [vm.isIndividual, vm.opening]);
  const methods = useForm<AvailabilityFormValues>({
    resolver: zodResolver(schema), defaultValues: scheduleForm([]), mode: 'onBlur',
  });
  const { isDirty } = methods.formState;
  useEffect(() => {
    // Refetches must not erase a draft or a write awaiting reconciliation.
    if (!vm.isLoadingInitial && !vm.isFatalError && !vm.isSaving && !vm.schedulePending && !isDirty) {
      methods.reset({ days: vm.scheduleDays.map(day => ({ weekday: day.weekday, entries: day.entries })) });
    }
  }, [vm.scheduleDays, vm.isLoadingInitial, vm.isFatalError, vm.isSaving, vm.schedulePending, isDirty, methods]);

  function entriesFrom(values: AvailabilityFormValues) {
    return values.days.flatMap(day => day.entries.map(entry => ({
      weekday: day.weekday, barbermanId: vm.barbermanId, range: { ...entry.range },
    })));
  }

  async function submitJourney(values: AvailabilityFormValues) {
    const result = await vm.handleSaveSchedule(entriesFrom(values));
    if (result?.kind === 'saved') methods.reset(scheduleForm(result.entries));
    if (result?.kind === 'rejected') {
      const fields = values.days.flatMap((day, dayIndex) => day.entries.map((_, entryIndex) => ({ dayIndex, entryIndex })));
      for (const detail of result.error.details) {
        const match = /^schedules\[(\d+)\]\.(openTime|closeTime)$/.exec(detail.field ?? '');
        const target = match ? fields[Number(match[1])] : undefined;
        if (target && match) {
          methods.setError(`days.${target.dayIndex}.entries.${target.entryIndex}.range.${match[2] === 'openTime' ? 'start' : 'end'}`,
            { message: detail.reason ?? result.message });
        } else {
          const dayIndex = values.days.findIndex(day => day.weekday === detail.dayOfWeek);
          if (dayIndex >= 0) methods.setError(`days.${dayIndex}.entries`, { message: detail.reason ?? result.message });
        }
      }
    }
    return result;
  }

  async function reconcileJourney() {
    const current = await vm.reconcileSchedule();
    if (current === null) return null;
    if (sameSchedule(entriesFrom(methods.getValues()), current)) {
      methods.reset(scheduleForm(current));
      return 'Jornada confirmada e visualização atualizada.';
    }
    return 'Dados salvos consultados. Sua edição foi mantida e difere da jornada salva. Revise antes de salvar novamente.';
  }
  return { methods, submitJourney, reconcileJourney };
}
