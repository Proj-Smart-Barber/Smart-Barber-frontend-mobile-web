import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { useSession } from '@/features/auth';
import { operationAttemptStore } from '@/shared/operations/operation-attempt-store';
import {
  availabilityRepository, AVAILABILITY_QUERY_KEYS, fetchScheduleScope, invalidateScheduleConsumers,
  useBarbershopQuery, useScheduleScopeQuery,
} from '../api/availability.api';
import type { ScheduleScopeDocument, ScheduleScopeState } from '../api/availability.contract';
import { normalizeBarberScheduleError, type BarberScheduleError } from '../api/barber-schedule-error';
import { getBarberScheduleContext } from './barber-schedule-access';
import { barberScheduleSchema, personalEntries, scheduleForm, type BarberScheduleForm } from './barber-schedule.schema';
import {
  closeScheduleAttempt, matchesScheduleScope, reconcileSchedule, saveSchedule, SCHEDULE_OPERATION,
  type ScheduleReconcileOutcome, type ScheduleSaveOutcome,
} from './schedule-operation-engine';
import { WEEKDAY_ORDER } from './availability.types';

/** Tentativa cujo resultado ainda não é conhecido: o rascunho fica bloqueado para novo envio. */
export interface PendingScheduleAttempt {
  requestId: string;
  /** 'unknown' = resposta perdida; 'pending' = servidor ainda processa; 'applied-view' = aplicada, releitura falhou. */
  state: 'unknown' | 'pending' | 'applied-view';
}

/** Conflito de versão: o usuário revisa explicitamente a jornada salva antes de decidir. */
export interface ScheduleVersionReview { remote: ScheduleScopeDocument }

export interface ScheduleConflictView {
  kind: 'booking' | 'custom';
  items: BarberScheduleError['conflicts'];
}

const MESSAGES = {
  saved: 'Jornada salva com sucesso.',
  appliedUnreadable: 'Jornada salva, mas não foi possível atualizar a visualização. Consulte os dados salvos.',
  unknown: 'Não foi possível confirmar o salvamento. Consulte o resultado antes de tentar novamente.',
  accessLost: 'Seu acesso a esta unidade mudou. A edição foi mantida, mas não pode ser enviada.',
  clock: 'Não foi possível validar o horário do servidor. Atualize a jornada e tente novamente.',
  storage: 'Não foi possível registrar a tentativa neste aparelho. Nada foi enviado; tente novamente.',
  pendingAttempt: 'Há uma tentativa anterior sem resultado confirmado. Consulte o resultado antes de salvar.',
} as const;

export function useBarberScheduleViewModel(shopId: string, barbermanId: string) {
  const session = useSession();
  const sessionRef = useRef(session);
  sessionRef.current = session;
  const shop = useBarbershopQuery(shopId);
  const general = useScheduleScopeQuery(shopId);
  const personal = useScheduleScopeQuery(shopId, barbermanId);
  const cache = useQueryClient();
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const alive = useRef(true);
  const [pending, setPending] = useState<PendingScheduleAttempt | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [accessLost, setAccessLost] = useState(false);
  const [conflict, setConflict] = useState<ScheduleConflictView | null>(null);
  const [versionReview, setVersionReview] = useState<ScheduleVersionReview | null>(null);
  const baseline = useRef<ScheduleScopeDocument | null>(null);
  const opening = useMemo(() => general.data?.schedules ?? [], [general.data]);
  const schema = useMemo(() => barberScheduleSchema(opening), [opening]);
  const methods = useForm<BarberScheduleForm>({ resolver: zodResolver(schema),
    defaultValues: scheduleForm({ schedules: [], state: 'CLOSED' }), mode: 'onBlur' });
  const { isDirty } = methods.formState;
  const initialized = useRef(false);

  const adopt = useCallback((document: ScheduleScopeDocument) => {
    baseline.current = document;
    methods.reset(scheduleForm(document));
  }, [methods]);

  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);

  // Respostas antigas nunca sobrescrevem edição: só adota o documento com formulário limpo.
  useEffect(() => {
    if (personal.data && !busy && !pending && !versionReview && (!initialized.current || !isDirty)) {
      adopt(personal.data);
      initialized.current = true;
    } else if (personal.data && !baseline.current) baseline.current = personal.data;
  }, [personal.data, busy, pending, versionReview, isDirty, adopt]);

  // Uma tentativa deixada em aberto por recarga/queda continua recuperável por referência opaca.
  useEffect(() => {
    let cancelled = false;
    void operationAttemptStore.listReferences(barbermanId).then(async refs => {
      for (const ref of refs) {
        if (ref.resourceKind !== 'SCHEDULE' || ref.operation !== SCHEDULE_OPERATION) continue;
        if (!['submitting', 'uncertain'].includes(ref.status)) continue;
        if (ref.resourceId && !matchesScheduleScope(ref.resourceId, shopId, barbermanId)) continue;
        if (!cancelled) setPending({ requestId: ref.requestId, state: 'unknown' });
        return;
      }
    }).catch(() => undefined);
    return () => { cancelled = true; };
  }, [shopId, barbermanId]);

  const isCurrentContext = useCallback(() => {
    const context = getBarberScheduleContext(sessionRef.current);
    return Boolean(context && context.shopId === shopId && context.userId === barbermanId);
  }, [shopId, barbermanId]);

  const applyDocument = useCallback((document: ScheduleScopeDocument) => {
    cache.setQueryData(AVAILABILITY_QUERY_KEYS.scope(shopId, barbermanId), document);
    cache.setQueryData(AVAILABILITY_QUERY_KEYS.schedule(shopId, barbermanId),
      document.state === 'CUSTOM' ? document.schedules : []);
    adopt(document);
    setConflict(null); setVersionReview(null); setPending(null);
    void invalidateScheduleConsumers(cache, shopId);
  }, [cache, shopId, barbermanId, adopt]);

  const markFieldErrors = useCallback((values: BarberScheduleForm, error: BarberScheduleError) => {
    const fields = values.days.flatMap((day, dayIndex) => day.entries.map((_, entryIndex) => ({ dayIndex, entryIndex })));
    error.details.forEach(detail => {
      const match = /^schedules\[(\d+)\]\.(openTime|closeTime)$/.exec(detail.field ?? '');
      const target = match ? fields[Number(match[1])] : undefined;
      if (target && match) {
        methods.setError(`days.${target.dayIndex}.entries.${target.entryIndex}.range.${match[2] === 'openTime' ? 'start' : 'end'}`,
          { message: detail.reason ?? error.message });
        return;
      }
      const index = WEEKDAY_ORDER.findIndex(day => day === detail.dayOfWeek);
      if (index >= 0) methods.setError(`days.${index}.entries`, { message: detail.reason ?? error.message });
    });
  }, [methods]);

  const showReviewFor = useCallback(async () => {
    try {
      const remote = await fetchScheduleScope(shopId, barbermanId);
      if (!alive.current) return;
      cache.setQueryData(AVAILABILITY_QUERY_KEYS.scope(shopId, barbermanId), remote);
      setVersionReview({ remote });
    } catch {
      if (alive.current) setFeedback('Não foi possível consultar a jornada salva. Sua edição foi mantida.');
    }
  }, [shopId, barbermanId, cache]);

  const handleOutcome = useCallback(async (outcome: ScheduleSaveOutcome, values: BarberScheduleForm) => {
    if (!alive.current || outcome.kind === 'session-changed') return;
    switch (outcome.kind) {
      case 'saved': applyDocument(outcome.document); setFeedback(MESSAGES.saved); return;
      case 'unknown': setPending({ requestId: outcome.requestId, state: 'unknown' }); setFeedback(MESSAGES.unknown); return;
      case 'access-revoked': setAccessLost(true); setFeedback(outcome.error.message || MESSAGES.accessLost); return;
      case 'blocked':
        if (outcome.reason === 'PENDING_ATTEMPT' && outcome.requestId) setPending({ requestId: outcome.requestId, state: 'unknown' });
        setFeedback(outcome.reason === 'CLOCK_UNAVAILABLE' ? MESSAGES.clock
          : outcome.reason === 'STORAGE_UNAVAILABLE' ? MESSAGES.storage
          : outcome.reason === 'PENDING_ATTEMPT' ? MESSAGES.pendingAttempt : null);
        if (outcome.reason === 'CLOCK_UNAVAILABLE') void personal.refetch();
        return;
      case 'rejected': {
        const { error } = outcome;
        setFeedback(error.message);
        if (error.code === 'SCHEDULE_VERSION_CONFLICT') await showReviewFor();
        else if (error.code === 'SCHEDULE_BOOKING_CONFLICT') setConflict({ kind: 'booking', items: error.conflicts });
        else if (error.code === 'SCHEDULE_CUSTOM_CONFLICT') setConflict({ kind: 'custom', items: error.conflicts });
        else markFieldErrors(values, error);
      }
    }
  }, [applyDocument, markFieldErrors, personal, showReviewFor]);

  async function save(values: BarberScheduleForm) {
    if (lock.current || pending || accessLost || versionReview) return;
    const document = baseline.current;
    if (!document) { setFeedback('A jornada salva ainda não foi carregada.'); return; }
    lock.current = true; setBusy(true); setFeedback(null); setConflict(null);
    try {
      if (!isCurrentContext()) { setAccessLost(true); setFeedback(MESSAGES.accessLost); return; }
      const outcome = await saveSchedule(
        availabilityRepository,
        {
          actorId: barbermanId,
          shopId,
          barbermanId,
          state: values.state,
          entries: personalEntries(values, barbermanId),
          expectedVersion: document.version,
        },
        { isContextActive: isCurrentContext },
      );
      await handleOutcome(outcome, values);
    } finally { lock.current = false; if (alive.current) setBusy(false); }
  }

  const applyReconcile = useCallback(async (outcome: ScheduleReconcileOutcome) => {
    if (!alive.current || outcome.kind === 'session-changed') return;
    if (outcome.kind === 'applied') {
      if (outcome.document) { applyDocument(outcome.document); setFeedback('Jornada confirmada pelo servidor.'); return; }
      try { applyDocument(await fetchScheduleScope(shopId, barbermanId)); setFeedback('Jornada confirmada pelo servidor.'); }
      catch { setPending({ requestId: outcome.requestId, state: 'applied-view' }); setFeedback(MESSAGES.appliedUnreadable); }
      return;
    }
    if (outcome.kind === 'access-revoked') { setPending(null); setAccessLost(true); setFeedback(MESSAGES.accessLost); return; }
    if (outcome.kind === 'not-applied') {
      setPending(null); setFeedback('A tentativa não foi aplicada. Sua edição foi mantida.');
      await showReviewFor();
      return;
    }
    setPending({ requestId: outcome.requestId, state: outcome.kind });
    setFeedback(outcome.kind === 'pending' ? 'O servidor ainda processa a tentativa. Consulte novamente em instantes.'
      : 'O servidor ainda não confirmou o resultado. Sua edição foi mantida.');
  }, [applyDocument, shopId, barbermanId, showReviewFor]);

  /** Consulta o contrato de operações; nunca reenvia o PUT nem sobrescreve o rascunho. */
  async function reconcile() {
    if (lock.current || !pending) return;
    lock.current = true; setBusy(true);
    try { await applyReconcile(await reconcileSchedule(barbermanId, pending.requestId, barbermanId, {}, shopId)); }
    finally { lock.current = false; if (alive.current) setBusy(false); }
  }

  /** Encerra no servidor uma tentativa sem resposta; só então o rascunho pode ser enviado com nova chave. */
  async function abandonAttempt() {
    if (lock.current || !pending) return;
    lock.current = true; setBusy(true);
    try { await applyReconcile(await closeScheduleAttempt(barbermanId, pending.requestId, barbermanId, {}, shopId)); }
    finally { lock.current = false; if (alive.current) setBusy(false); }
  }

  /** Mantém a edição, mas passa a basear o próximo envio na versão revisada. */
  function keepMyEdit() {
    if (!versionReview) return;
    baseline.current = versionReview.remote;
    setVersionReview(null); setFeedback('Jornada salva revisada. Confira sua edição e salve novamente.');
  }
  function useSavedSchedule() {
    if (!versionReview) return;
    adopt(versionReview.remote); setVersionReview(null); setFeedback('Jornada salva carregada.');
  }

  function chooseState(state: ScheduleScopeState) {
    if (lock.current || busy || pending || accessLost || versionReview || !isCurrentContext()) return;
    const form = methods.getValues();
    if (form.state === state) return;
    const effective = personal.data?.effectiveSchedules?.length ? personal.data.effectiveSchedules : opening;
    // Ao abrir CUSTOM sem períodos, parte do que já é ofertado, sem alterar o servidor.
    const seed = state === 'CUSTOM' && !form.days.some(day => day.entries.length > 0)
      ? scheduleForm({ schedules: effective.map(entry => ({ ...entry, barbermanId })), state: 'CUSTOM' }) : null;
    methods.reset(seed ?? { ...form, state }, { keepDefaultValues: true });
  }

  function discard() {
    if (lock.current || busy || pending || accessLost || versionReview) return;
    if (baseline.current) methods.reset(scheduleForm(baseline.current));
    setFeedback(null); setConflict(null);
  }

  async function retry() {
    await Promise.all([shop.refetch(), general.refetch(), personal.refetch()]);
  }

  const document = personal.data ?? baseline.current;
  const loadError = shop.error ?? general.error ?? personal.error;
  return { methods, shop: shop.data, opening, general: general.data ?? null, document,
    busy, pending, feedback, conflict, versionReview, accessLost,
    generalClosed: general.data ? general.data.state === 'CLOSED' || general.data.schedules.length === 0 : false,
    needsReview: Boolean(personal.data?.needsReview),
    save, reconcile, abandonAttempt, keepMyEdit, useSavedSchedule, chooseState, discard, retry, isDirty,
    loading: shop.isPending || general.isPending || personal.isPending,
    error: loadError ? normalizeBarberScheduleError(loadError).message : null };
}
