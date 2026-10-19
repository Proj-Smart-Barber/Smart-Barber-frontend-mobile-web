import { useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { availabilityRepository, AVAILABILITY_QUERY_KEYS, useBarbershopQuery,
  useWeeklyScheduleQuery } from '../api/availability.api';
import { normalizeBarberScheduleError } from '../api/barber-schedule-error';
import { barberScheduleSchema, personalEntries, sameSchedule, scheduleForm,
  type BarberScheduleForm } from './barber-schedule.schema';
import { saveBarberSchedule } from './save-barber-schedule';
import { WEEKDAY_ORDER } from './availability.types';

export function useBarberScheduleViewModel(shopId: string, barbermanId: string) {
  const shop = useBarbershopQuery(shopId);
  const general = useWeeklyScheduleQuery(shopId);
  const personal = useWeeklyScheduleQuery(shopId, barbermanId);
  const cache = useQueryClient();
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const [pending, setPending] = useState<'unconfirmed-view' | 'unknown' | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const schema = useMemo(() => barberScheduleSchema(general.data ?? []), [general.data]);
  const methods = useForm<BarberScheduleForm>({ resolver: zodResolver(schema),
    defaultValues: scheduleForm([]), mode: 'onBlur' });
  const { isDirty } = methods.formState;
  const initialized = useRef(false);
  useEffect(() => {
    if (personal.data && !busy && !pending && (!initialized.current || !isDirty)) {
      methods.reset(scheduleForm(personal.data));
      initialized.current = true;
    }
  }, [personal.data, busy, pending, isDirty, methods]);

  async function save(values: BarberScheduleForm) {
    if (lock.current || pending) return;
    lock.current = true; setBusy(true); setFeedback(null);
    try {
      const result = await saveBarberSchedule(availabilityRepository, shopId, barbermanId,
        personalEntries(values, barbermanId));
      setFeedback(result.message);
      if (result.kind === 'saved') {
        cache.setQueryData(AVAILABILITY_QUERY_KEYS.schedule(shopId, barbermanId), result.entries);
        methods.reset(scheduleForm(result.entries));
        void cache.invalidateQueries({ queryKey: AVAILABILITY_QUERY_KEYS.slotsBase(shopId) });
      } else if (result.kind === 'rejected') {
        const fields = values.days.flatMap((day, dayIndex) => day.entries.map((_, entryIndex) => ({ dayIndex, entryIndex })));
        result.error.details.forEach(detail => {
          const match = /^schedules\[(\d+)\]\.(openTime|closeTime)$/.exec(detail.field ?? '');
          const target = match ? fields[Number(match[1])] : undefined;
          if (target && match) {
            methods.setError(`days.${target.dayIndex}.entries.${target.entryIndex}.range.${match[2] === 'openTime' ? 'start' : 'end'}`,
              { message: detail.reason ?? result.error.message });
            return;
          }
          const index = WEEKDAY_ORDER.findIndex(day => day === detail.dayOfWeek);
          if (index >= 0) methods.setError(`days.${index}.entries`, {
            message: detail.reason ?? result.error.message,
          });
        });
      } else setPending(result.kind);
    } finally { lock.current = false; setBusy(false); }
  }

  /** A GET only: never retries a PUT or overwrites an unsaved draft. */
  async function reconcile() {
    if (lock.current) return;
    lock.current = true; setBusy(true);
    try {
      const current = await availabilityRepository.getWeeklySchedule(shopId, barbermanId);
      cache.setQueryData(AVAILABILITY_QUERY_KEYS.schedule(shopId, barbermanId), current);
      if (sameSchedule(personalEntries(methods.getValues(), barbermanId), current)) {
        methods.reset(scheduleForm(current));
        setFeedback('Jornada confirmada e visualização atualizada.');
      } else {
        setFeedback('Dados salvos consultados. Sua edição foi mantida e difere da jornada salva. Revise antes de salvar novamente.');
      }
      void cache.invalidateQueries({ queryKey: AVAILABILITY_QUERY_KEYS.slotsBase(shopId) });
      setPending(null);
    } catch {
      setFeedback('Não foi possível consultar os dados salvos. Sua edição foi mantida. Tente recarregar novamente.');
    } finally { lock.current = false; setBusy(false); }
  }

  function discard() {
    methods.reset(scheduleForm(personal.data ?? []));
    setFeedback(null);
  }
  async function retry() {
    await Promise.all([shop.refetch(), general.refetch(), personal.refetch()]);
  }
  const error = shop.error ?? general.error ?? personal.error;
  return { methods, shop: shop.data, opening: general.data ?? [], busy, pending, feedback,
    save, reconcile, discard, retry, isDirty,
    loading: shop.isPending || general.isPending || personal.isPending,
    error: error ? normalizeBarberScheduleError(error).message : null };
}
