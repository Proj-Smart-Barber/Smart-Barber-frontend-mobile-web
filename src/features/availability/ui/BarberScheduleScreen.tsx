import { Platform as ShadowPlatform } from 'react-native';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator, Animated, Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { FormProvider } from 'react-hook-form';
import { Button, ErrorState, SegmentedFilter, Spinner, Text } from '@/shared/ui';
import { LiquidGlassView } from '@/shared/navigation/LiquidGlassView';
import { useNavigation } from '@/shared/navigation/navigation-context';
import { useAdaptiveLayout, useTheme } from '@/shared/theme';
import { useSession } from '@/features/auth';
import { getBarberScheduleContext } from '../model/barber-schedule-access';
import { AvailabilityDay } from './AvailabilityDay';
import { AvailabilityMenuButton } from './AvailabilityScreen';
import { buildScheduleDayViews } from '../model/availability.types';
import type { ScheduleScopeState, AvailabilityException } from '../api/availability.contract';
import { useBarberScheduleViewModel } from '../model/use-barber-schedule-view-model';
import { confirmScheduleDiscard, useUnsavedScheduleGuard } from '../model/use-unsaved-schedule-guard';
import {
  useExceptionsQuery,
  useCreateExceptionMutation,
  useUpdateExceptionMutation,
  useRemoveExceptionMutation,
} from '../api/availability.api';
import { ExceptionCard } from './ExceptionCard';
import { ExceptionForm } from './ExceptionForm';
import { normalizeBarberScheduleError } from '../api/barber-schedule-error';
import type { AvailabilityExceptionFormValues } from '../model/availability.schema';

const STATE_OPTIONS: { value: ScheduleScopeState; label: string }[] = [
  { value: 'INHERIT', label: 'Da unidade' },
  { value: 'CUSTOM', label: 'Própria' },
  { value: 'CLOSED', label: 'Fechada' },
];

const STATE_COPY: Record<ScheduleScopeState, string> = {
  INHERIT: 'Você atende nos mesmos horários da unidade. Mudanças no expediente geral passam a valer para você.',
  CUSTOM: 'Defina seus dias e períodos próprios de atendimento de forma independente.',
  CLOSED: 'Você não recebe novas reservas em nenhum dia da semana até escolher outra opção.',
};

function useKeyboardVisible() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (Platform.OS === 'web') return;
    const show = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', () => setVisible(true));
    const hide = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', () => setVisible(false));
    return () => { show.remove(); hide.remove(); };
  }, []);
  return visible;
}

export function BarberScheduleScreen({ barbershopId, barbermanId, barberName, hideTopBar = false, actorId }: {
  barbershopId: string; barbermanId: string; barberName: string; hideTopBar?: boolean; actorId?: string;
}) {
  // Keep the previous scope until a changed session unit is explicitly acknowledged.
  const [editingShop, setEditingShop] = useState(barbershopId);
  const changedShop = editingShop !== barbershopId;
  return <ScheduleEditor key={`${editingShop}:${barbermanId}`} shopId={editingShop} barbermanId={barbermanId}
    barberName={barberName} changedShop={changedShop} onChangeShop={() => setEditingShop(barbershopId)} hideTopBar={hideTopBar} actorId={actorId} />;
}

function ScheduleEditor({ shopId, barbermanId, barberName, changedShop, onChangeShop, hideTopBar = false, actorId }: {
  shopId: string; barbermanId: string; barberName: string; changedShop: boolean; onChangeShop: () => void; hideTopBar?: boolean; actorId?: string;
}) {
  const vm = useBarberScheduleViewModel(shopId, barbermanId, actorId);
  const session = useSession();
  const context = getBarberScheduleContext(session);
  const currentActorId = actorId ?? context?.userId ?? '';
  const isSelf = currentActorId === barbermanId;
  const { colors, spacing, radius } = useTheme();
  const { isExpanded, contentMaxWidth } = useAdaptiveLayout();
  const { openDrawer, onContentScroll, scrollCollapseProgress } = useNavigation();
  const [screenWidth, setScreenWidth] = useState(0);
  const showSideColumn = screenWidth >= 960;
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const keyboardVisible = useKeyboardVisible();
  const watchedState = vm.methods.watch('state');
  const stateCopy = useMemo<Record<ScheduleScopeState, string>>(() => ({
    INHERIT: isSelf
      ? 'Você atende nos mesmos horários da unidade. Mudanças no expediente geral passam a valer para você.'
      : `${barberName} atende nos mesmos horários da unidade. Mudanças no expediente geral passam a valer para este profissional.`,
    CUSTOM: isSelf
      ? 'Defina seus dias e períodos próprios de atendimento de forma independente.'
      : `Defina os dias e períodos próprios de atendimento de ${barberName} de forma independente.`,
    CLOSED: isSelf
      ? 'Você não recebe novas reservas em nenhum dia da semana até escolher outra opção.'
      : `${barberName} não recebe novas reservas em nenhum dia da semana até escolher outra opção.`,
  }), [isSelf, barberName]);
  useUnsavedScheduleGuard(vm.isDirty || Boolean(vm.pending), vm.busy);
  const locked = vm.busy || changedShop || Boolean(vm.pending) || vm.accessLost || Boolean(vm.versionReview);
  const days = buildScheduleDayViews([]);
  const operatingDays = days.filter(day => vm.opening.some(entry => entry.weekday === day.weekday)).length;
  const canSave = !locked && !vm.error && (vm.isDirty || vm.needsReview);
  const submit = vm.methods.handleSubmit(vm.save);
  const stickyTranslateY = scrollCollapseProgress.interpolate({ inputRange: [0, 1], outputRange: [0, -76] });
  const stickyOpacity = scrollCollapseProgress.interpolate({ inputRange: [0, 0.8, 1], outputRange: [1, 0.15, 0] });

  const exceptionsQuery = useExceptionsQuery(shopId, barbermanId);
  const unitExceptionsQuery = useExceptionsQuery(shopId, undefined);
  const unitClosures = useMemo(
    () => (unitExceptionsQuery.data ?? []).filter(e => !e.barbermanId),
    [unitExceptionsQuery.data],
  );

  const createExceptionMutation = useCreateExceptionMutation(shopId, barbermanId);
  const updateExceptionMutation = useUpdateExceptionMutation(shopId, barbermanId);
  const removeExceptionMutation = useRemoveExceptionMutation(shopId, barbermanId);
  const [editingExceptionId, setEditingExceptionId] = useState<string | null>(null);
  const [exceptionError, setExceptionError] = useState<string | null>(null);
  const [exceptionSuccess, setExceptionSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!exceptionSuccess) return;
    const timer = setTimeout(() => setExceptionSuccess(null), 4000);
    return () => clearTimeout(timer);
  }, [exceptionSuccess]);

  const exceptions = exceptionsQuery.data ?? [];
  const editingException = exceptions.find(e => e.id === editingExceptionId) ?? null;

  async function handleCreateException(values: AvailabilityExceptionFormValues) {
    setExceptionError(null);
    setExceptionSuccess(null);
    try {
      await createExceptionMutation.mutateAsync({
        date: values.date,
        barbermanId,
        openTime: values.openTime ?? null,
        closeTime: values.closeTime ?? null,
        reason: values.reason ?? null,
      });
      setExceptionSuccess(
        values.openTime ? 'Bloqueio parcial registrado com sucesso.' : 'Folga de dia inteiro registrada com sucesso.',
      );
      return true;
    } catch (err) {
      const norm = normalizeBarberScheduleError(err);
      setExceptionError(norm.message);
      return false;
    }
  }

  async function handleUpdateException(values: AvailabilityExceptionFormValues) {
    if (!editingException) return false;
    setExceptionError(null);
    setExceptionSuccess(null);
    try {
      await updateExceptionMutation.mutateAsync({
        exceptionId: editingException.id,
        exception: {
          date: values.date,
          openTime: values.openTime ?? null,
          closeTime: values.closeTime ?? null,
          reason: values.reason ?? null,
        },
      });
      setEditingExceptionId(null);
      setExceptionSuccess('Exceção atualizada com sucesso.');
      return true;
    } catch (err) {
      const norm = normalizeBarberScheduleError(err);
      setExceptionError(norm.message);
      return false;
    }
  }

  async function handleRemoveException(exceptionId: string) {
    setExceptionError(null);
    setExceptionSuccess(null);
    try {
      await removeExceptionMutation.mutateAsync(exceptionId);
      setExceptionSuccess('Exceção removida com sucesso.');
    } catch (err) {
      const norm = normalizeBarberScheduleError(err);
      setExceptionError(norm.message);
    }
  }

  function openMenu() {
    // O rascunho permanece nesta tela (push), mas o menu é um ponto de saída: confirma antes.
    if (!vm.isDirty && !vm.pending) { openDrawer(); return; }
    confirmScheduleDiscard(openDrawer, 'menu');
  }

  function chooseState(state: ScheduleScopeState) {
    vm.chooseState(state);
  }

  const effectiveForInherit = vm.document?.state === 'INHERIT' ? vm.document.effectiveSchedules : vm.opening;
  const unitHours = (weekday: string) => vm.opening.filter(entry => entry.weekday === weekday)
    .map(entry => `${entry.range.start}–${entry.range.end}`).join(' / ') || 'Fechada';

  return (
    <SafeAreaView edges={['top', 'bottom']} onLayout={event => setScreenWidth(event.nativeEvent.layout.width)}
      style={[styles.screen, { backgroundColor: colors.background.primary }]}>
      <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentInsetAdjustmentBehavior="automatic"
          onScroll={onContentScroll}
          scrollEventThrottle={16}
          contentContainerStyle={{ alignItems: 'center', paddingHorizontal: spacing[isExpanded ? 8 : 5],
            paddingTop: spacing[isExpanded ? 4 : 10],
            paddingBottom: Math.max(insets.bottom, 16) + (isExpanded ? 40 : 188) }}
        >
          <View style={{ width: '100%', maxWidth: contentMaxWidth, gap: spacing[6] }}>
            <View style={styles.hero}>
              <View style={[styles.heroAccent, { backgroundColor: colors.brand.primary, borderRadius: radius.full }]} />
              <Text variant="badge" color={colors.text.brand}>
                {isSelf ? 'SEU TEMPO, SUA JORNADA' : 'JORNADA DO PROFISSIONAL'}
              </Text>
              <Text variant="display" color={colors.text.primary}>
                {isSelf
                  ? `Configure seus horários${isExpanded ? ' de atendimento.' : '\nde atendimento.'}`
                  : `Horários de ${barberName}`}
              </Text>
              <Text variant="body" color={colors.text.secondary} style={styles.heroDescription}>
                {isSelf
                  ? 'Escolha entre seguir a unidade, definir horários próprios ou ficar fechado.'
                  : `Configure a jornada de trabalho e folgas de ${barberName}.`}
              </Text>
            </View>

            {vm.accessLost && (
              <Notice tone="error" icon="lock-closed-outline" text="Seu acesso a esta unidade mudou. Sua edição foi mantida nesta tela, mas não pode ser enviada." />
            )}
            {changedShop && (
              <LiquidGlassView variant="card" contentStyle={{ padding: spacing[4], gap: spacing[3] }}>
                <Text accessibilityLiveRegion="polite" color={colors.text.primary}>
                  A unidade da sessão mudou. Sua edição anterior foi mantida; abra a nova unidade para continuar.
                </Text>
                <Button title="Abrir unidade selecionada" disabled={vm.busy}
                  onPress={() => vm.isDirty || vm.pending ? confirmScheduleDiscard(onChangeShop) : onChangeShop()} />
              </LiquidGlassView>
            )}

            {vm.loading ? (
              <View style={styles.loadingState}><Spinner /><Text color={colors.text.secondary}>Carregando sua jornada…</Text></View>
            ) : (
              <>
                {vm.error && <ErrorState title="Não foi possível atualizar a jornada" description={vm.error} onRetry={() => void vm.retry()} />}
                {vm.shop && vm.document && (
                  <View style={[styles.mainGrid, showSideColumn && styles.mainGridExpanded]}>
                    <View style={[styles.journeyColumn, { gap: spacing[3] }]}>
                      <View style={[styles.sectionIntro, { backgroundColor: colors.background.secondary, borderRadius: radius.lg }]}>
                        <View style={styles.sectionHeading}>
                          <View style={[styles.sectionIcon, { backgroundColor: colors.surface.selected, borderRadius: radius.md }]}>
                            <Ionicons name="calendar-outline" size={20} color={colors.brand.primary} />
                          </View>
                          <View style={{ flex: 1, gap: spacing[1] }}>
                            <Text variant="badge" color={colors.text.brand}>JORNADA SEMANAL</Text>
                            <Text variant="h2" color={colors.text.primary}>Horários recorrentes</Text>
                          </View>
                        </View>
                        <SegmentedFilter
                          options={STATE_OPTIONS}
                          value={watchedState}
                          onChange={chooseState}
                          disabled={locked || Boolean(vm.error)}
                        />
                        <Text variant="bodySm" color={colors.text.secondary}>{stateCopy[watchedState]}</Text>
                      </View>

                      {vm.needsReview && (
                        <Notice tone="info" icon="alert-circle-outline"
                          text="Sua jornada ainda não foi revisada. Até confirmar uma opção, você aparece fechado. Escolha e toque em Confirmar jornada." />
                      )}
                      {vm.generalClosed && watchedState === 'INHERIT' && (
                        <Notice tone="error" icon="business-outline"
                          text="A unidade está com o expediente geral fechado. Ao herdar a unidade, você aparece sem horários ofertados." />
                      )}
                      {vm.feedback && <Notice tone="info" icon="information-circle-outline" text={vm.feedback} live />}

                      {vm.versionReview && (
                        <LiquidGlassView variant="card" contentStyle={{ padding: spacing[4], gap: spacing[3] }}>
                          <Text variant="subhead" color={colors.text.primary}>A jornada salva mudou</Text>
                          <Text variant="bodySm" color={colors.text.secondary}>
                            Outra sessão alterou sua jornada (versão {vm.versionReview.remote.version}). Compare o estado salvo no servidor com a sua edição antes de decidir.
                          </Text>
                          <View style={{ gap: spacing[2], padding: spacing[3], backgroundColor: colors.background.secondary, borderRadius: radius.md }}>
                            <Text variant="caption" weight="bold" color={colors.brand.primary}>
                              JORNADA SALVA NO SERVIDOR ({STATE_OPTIONS.find(o => o.value === vm.versionReview?.remote.state)?.label ?? vm.versionReview.remote.state})
                            </Text>
                            {vm.versionReview.remote.state === 'CUSTOM' ? (
                              days.map(day => {
                                const remoteEntries = vm.versionReview!.remote.schedules.filter(e => e.weekday === day.weekday);
                                return (
                                  <Text key={`remote-${day.weekday}`} variant="caption" color={colors.text.secondary}>
                                    {day.label}: {remoteEntries.map(e => `${e.range.start}–${e.range.end}`).join(' / ') || 'Folga'}
                                  </Text>
                                );
                              })
                            ) : (
                              <Text variant="caption" color={colors.text.secondary}>
                                {vm.versionReview.remote.state === 'INHERIT'
                                  ? 'Segue o expediente geral da unidade.'
                                  : 'Fechada (sem horários ofertados).'}
                              </Text>
                            )}
                          </View>
                          <View style={{ gap: spacing[2], padding: spacing[3], backgroundColor: colors.background.secondary, borderRadius: radius.md }}>
                            <Text variant="caption" weight="bold" color={colors.text.primary}>
                              SUA EDIÇÃO LOCAL ({STATE_OPTIONS.find(o => o.value === watchedState)?.label ?? watchedState})
                            </Text>
                            {watchedState === 'CUSTOM' ? (
                              vm.methods.getValues().days.map((dayForm, idx) => {
                                const label = days[idx]?.label ?? dayForm.weekday;
                                return (
                                  <Text key={`local-${dayForm.weekday}`} variant="caption" color={colors.text.secondary}>
                                    {label}: {dayForm.entries.map(e => `${e.range.start}–${e.range.end}`).join(' / ') || 'Folga'}
                                  </Text>
                                );
                              })
                            ) : (
                              <Text variant="caption" color={colors.text.secondary}>
                                {watchedState === 'INHERIT'
                                  ? 'Segue o expediente geral da unidade.'
                                  : 'Fechada (sem horários ofertados).'}
                              </Text>
                            )}
                          </View>
                          <Button title="Manter minha edição e revisar" disabled={vm.busy} onPress={vm.keepMyEdit} />
                          <Button title="Carregar jornada salva" variant="outline" disabled={vm.busy}
                            onPress={() => vm.isDirty ? confirmScheduleDiscard(vm.useSavedSchedule) : vm.useSavedSchedule()} />
                        </LiquidGlassView>
                      )}

                      {vm.conflict?.kind === 'booking' && (
                        <LiquidGlassView variant="card" contentStyle={{ padding: spacing[4], gap: spacing[3] }}>
                          <Text variant="subhead" color={colors.text.primary}>Reservas impedem esta alteração</Text>
                          {vm.conflict.items.bookings.slice(0, 5).map(item => (
                            <Text key={item.bookingId} variant="bodySm" color={colors.text.secondary}>
                              {item.date} · {item.startTime}–{item.endTime}
                            </Text>
                          ))}
                          <Button title="Abrir Agenda" variant="outline" onPress={() => router.push('/(app)/agenda')} />
                        </LiquidGlassView>
                      )}
                      {vm.conflict?.kind === 'custom' && (
                        <LiquidGlassView variant="card" contentStyle={{ padding: spacing[4], gap: spacing[3] }}>
                          <Text variant="subhead" color={colors.text.primary}>Jornadas individuais impedem esta alteração</Text>
                          <Button title="Abrir Equipe" variant="outline" onPress={() => router.push('/(app)/team')} />
                        </LiquidGlassView>
                      )}

                      {vm.pending && (
                        <LiquidGlassView variant="card" contentStyle={{ padding: spacing[4], gap: spacing[3] }}>
                          <Text variant="subhead" color={colors.text.primary}>Resultado do salvamento pendente</Text>
                          <Text variant="bodySm" color={colors.text.secondary}>
                            Consulte o servidor antes de salvar de novo. Sua edição está preservada.
                          </Text>
                          <Button title="Consultar resultado" variant="outline" onPress={() => void vm.reconcile()}
                            disabled={vm.busy || changedShop} loading={vm.busy} />
                          {vm.pending.state === 'unknown' && (
                            <Button title="Encerrar tentativa e revisar" variant="outline" onPress={() => void vm.abandonAttempt()}
                              disabled={vm.busy || changedShop} />
                          )}
                        </LiquidGlassView>
                      )}

                      {watchedState === 'CUSTOM' ? (
                        <FormProvider {...vm.methods}>
                          <View style={{ gap: spacing[3] }}>
                            {days.map((day, index) => (
                              <View key={day.weekday} style={{ gap: spacing[2] }}>
                                <AvailabilityDay day={day} dayIndex={index} fieldArrayName="days" barbermanId={barbermanId}
                                  disabled={locked || Boolean(vm.error)} />
                                <View style={[styles.openingInfo, { paddingHorizontal: spacing[3] }]}>
                                  <Ionicons name="business-outline" size={14} color={colors.text.muted} />
                                  <Text variant="caption" color={colors.text.secondary} style={styles.flexText}>
                                    Unidade: {unitHours(day.weekday)}
                                  </Text>
                                </View>
                              </View>
                            ))}
                          </View>
                        </FormProvider>
                      ) : (
                        <LiquidGlassView variant="card" contentStyle={{ padding: spacing[4], gap: spacing[2] }}>
                          <Text variant="subhead" color={colors.text.primary}>
                            {watchedState === 'INHERIT' ? 'Horários ofertados com a unidade' : 'Sem atendimento'}
                          </Text>
                          {days.map(day => (
                            <Text key={day.weekday} variant="bodySm" color={colors.text.secondary}>
                              {day.label}: {watchedState === 'INHERIT' && !vm.generalClosed
                                ? (effectiveForInherit.filter(entry => entry.weekday === day.weekday)
                                  .map(entry => `${entry.range.start}–${entry.range.end}`).join(' / ') || 'Fechada')
                                : 'Fechada'}
                            </Text>
                          ))}
                        </LiquidGlassView>
                      )}
                      {vm.methods.formState.errors.days?.message && (
                        <Text accessibilityRole="alert" variant="bodySm" color={colors.feedback.error}>
                          {String(vm.methods.formState.errors.days.message)}
                        </Text>
                      )}

                      {/* ── Folgas e datas especiais individuais ── */}
                      <View style={[styles.sectionIntro, { backgroundColor: colors.background.secondary, borderRadius: radius.lg, marginTop: spacing[4] }]}>
                        <View style={styles.sectionHeading}>
                          <View style={[styles.sectionIcon, { backgroundColor: colors.surface.selected, borderRadius: radius.md }]}>
                            <Ionicons name="calendar-clear-outline" size={20} color={colors.brand.primary} />
                          </View>
                          <View style={{ flex: 1, gap: spacing[1] }}>
                            <Text variant="badge" color={colors.text.brand}>FOLGAS E EXCEÇÕES</Text>
                            <Text variant="h2" color={colors.text.primary}>
                              {isSelf ? 'Minhas datas especiais' : `Datas especiais de ${barberName}`}
                            </Text>
                          </View>
                        </View>
                        <Text variant="bodySm" color={colors.text.secondary}>
                          {isSelf
                            ? 'Gerencie suas folgas ou horários especiais de atendimento.'
                            : `Gerencie as folgas e horários especiais de atendimento de ${barberName}.`}
                        </Text>
                      </View>

                      <View style={{ gap: spacing[3] }}>
                        {exceptionError && (
                          <Notice tone="error" icon="alert-circle-outline" text={exceptionError} live />
                        )}
                        {exceptionSuccess && (
                          <Notice tone="info" icon="checkmark-circle-outline" text={exceptionSuccess} live />
                        )}

                        {/* Fechamentos gerais da unidade — somente leitura */}
                        {unitClosures.length > 0 && (
                          <View style={{ gap: spacing[2], marginBottom: spacing[2] }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                              <Ionicons name="business-outline" size={16} color={colors.text.secondary} />
                              <Text variant="caption" weight="bold" color={colors.text.secondary}>
                                FECHAMENTOS GERAIS DA UNIDADE (SOMENTE LEITURA)
                              </Text>
                            </View>
                            {unitClosures.map((closure: AvailabilityException) => (
                              <ExceptionCard
                                key={`unit-closure-${closure.id}`}
                                exception={closure}
                                readOnly
                              />
                            ))}
                          </View>
                        )}

                        {exceptionsQuery.isLoading ? (
                          <View style={styles.loadingState}>
                            <Spinner />
                            <Text color={colors.text.secondary}>Carregando folgas e datas especiais…</Text>
                          </View>
                        ) : exceptionsQuery.isError ? (
                          <ErrorState
                            title="Não foi possível carregar as exceções"
                            description="Ocorreu uma falha ao consultar suas datas especiais."
                            onRetry={() => void exceptionsQuery.refetch()}
                          />
                        ) : exceptions.length === 0 ? (
                          <LiquidGlassView variant="card" contentStyle={{ padding: spacing[4], alignItems: 'center', gap: spacing[2] }}>
                            <Ionicons name="calendar-outline" size={24} color={colors.text.muted} />
                            <Text variant="bodySm" weight="semibold" color={colors.text.primary}>
                              Nenhuma folga ou exceção cadastrada
                            </Text>
                            <Text variant="caption" color={colors.text.secondary}>
                              Sua jornada semanal será utilizada normalmente em todas as datas.
                            </Text>
                          </LiquidGlassView>
                        ) : (
                          exceptions.map(exc => (
                            <ExceptionCard
                              key={exc.id}
                              exception={exc}
                              onEdit={e => setEditingExceptionId(e.id)}
                              onRemove={handleRemoveException}
                              disabled={locked || createExceptionMutation.isPending || updateExceptionMutation.isPending || removeExceptionMutation.isPending}
                            />
                          ))
                        )}

                        {editingException ? (
                          <ExceptionForm
                            key={`edit-${editingException.id}`}
                            mode="edit"
                            scope="individual"
                            initialValues={{
                              date: editingException.date,
                              barbermanId,
                              openTime: editingException.openTime,
                              closeTime: editingException.closeTime,
                              reason: editingException.reason,
                            }}
                            onSubmit={handleUpdateException}
                            onCancelEdit={() => setEditingExceptionId(null)}
                            disabled={locked || updateExceptionMutation.isPending}
                          />
                        ) : (
                          <ExceptionForm
                            key="create-new"
                            mode="create"
                            scope="individual"
                            initialValues={{
                              date: '',
                              barbermanId,
                              openTime: null,
                              closeTime: null,
                              reason: null,
                            }}
                            onSubmit={handleCreateException}
                            disabled={locked || createExceptionMutation.isPending}
                          />
                        )}
                      </View>
                    </View>

                    <View style={[styles.sideColumn, showSideColumn && styles.sideColumnExpanded, { gap: spacing[3] }]}>
                      <LiquidGlassView variant="card" contentStyle={{ padding: spacing[5], gap: spacing[3] }}>
                        <View style={styles.sectionHeading}>
                          <View style={[styles.sectionIcon, { backgroundColor: colors.surface.selected, borderRadius: radius.md }]}>
                            <Ionicons name="person-outline" size={20} color={colors.brand.primary} />
                          </View>
                          <View style={{ flex: 1, gap: spacing[1] }}>
                            <Text variant="badge" color={colors.text.brand}>
                              {isSelf ? 'SEU PERFIL' : 'PROFISSIONAL'}
                            </Text>
                            <Text variant="subhead" color={colors.text.primary} numberOfLines={2}>{barberName}</Text>
                          </View>
                        </View>
                        <View style={[styles.separator, { backgroundColor: colors.border.subtle }]} />
                        <View style={{ gap: spacing[2] }}>
                          <Text variant="caption" color={colors.text.muted}>UNIDADE VINCULADA</Text>
                          <Text variant="bodySm" weight="semibold" color={colors.text.primary}>{vm.shop.name}</Text>
                          <View style={styles.infoLine}>
                            <Ionicons name="globe-outline" size={16} color={colors.text.secondary} />
                            <Text variant="caption" color={colors.text.secondary} style={styles.flexText}>Fuso horário: {vm.shop.timezone}</Text>
                          </View>
                          <View style={styles.infoLine}>
                            <Ionicons name="calendar-clear-outline" size={16} color={colors.text.secondary} />
                            <Text variant="caption" color={colors.text.secondary} style={styles.flexText}>{operatingDays} dias de funcionamento da unidade</Text>
                          </View>
                        </View>
                      </LiquidGlassView>

                      <LiquidGlassView variant="card" contentStyle={{ padding: spacing[5], gap: spacing[3] }}>
                        <View style={styles.sectionHeading}>
                          <Ionicons name="information-circle-outline" size={22} color={colors.brand.primary} />
                          <Text variant="subhead" color={colors.text.primary}>Como funciona</Text>
                        </View>
                        <Text variant="bodySm" color={colors.text.secondary}>
                          Em horários próprios, use períodos separados para criar pausas. Dias sem período são folgas.
                        </Text>
                        <Text variant="bodySm" color={colors.text.secondary}>
                          Suas folgas e horários especiais podem ser cadastrados e gerenciados na seção de exceções.
                        </Text>
                      </LiquidGlassView>

                      {isExpanded && (
                        <LiquidGlassView variant="card" contentStyle={{ padding: spacing[5], gap: spacing[3] }}>
                          <View style={styles.sectionHeading}>
                            <Ionicons name="save-outline" size={21} color={colors.brand.primary} />
                            <Text variant="subhead" color={colors.text.primary}>Salvar alterações</Text>
                          </View>
                          <Text variant="bodySm" color={colors.text.secondary}>
                            {vm.isDirty ? 'Você possui alterações não salvas.' : vm.needsReview ? 'Confirme sua jornada.' : 'Sua jornada está atualizada.'}
                          </Text>
                          <Button title={vm.needsReview ? 'Confirmar jornada' : isSelf ? 'Salvar minha jornada' : 'Salvar horários'} loading={vm.busy}
                            disabled={!canSave} onPress={() => { void submit(); }} />
                          <Button title="Descartar alterações" variant="outline"
                            disabled={locked || !vm.isDirty} onPress={() => confirmScheduleDiscard(vm.discard)} />
                        </LiquidGlassView>
                      )}
                    </View>
                  </View>
                )}
              </>
            )}
          </View>
        </ScrollView>

        {!isExpanded && !keyboardVisible && vm.shop && vm.document && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={vm.needsReview ? 'Confirmar jornada' : isSelf ? 'Salvar jornada' : 'Salvar horários'}
            accessibilityState={{ disabled: !canSave, busy: vm.busy }}
            disabled={!canSave}
            onPress={() => { void submit(); }}
            style={({ pressed }) => [styles.floatingSaveButton, {
              right: spacing[5], bottom: Math.max(insets.bottom, 12) + 100, backgroundColor: colors.brand.primary,
              opacity: !canSave ? 0.45 : pressed ? 0.82 : 1 }]}
          >
            {vm.busy ? <ActivityIndicator color="#FFFFFF" /> : <Ionicons name="checkmark-sharp" size={25} color="#FFFFFF" />}
          </Pressable>
        )}
      </KeyboardAvoidingView>

      {!hideTopBar && (
        <Animated.View
          style={[[styles.stickyHeaderOverlay, { paddingHorizontal: spacing[isExpanded ? 8 : 5],
            opacity: stickyOpacity, transform: [{ translateY: stickyTranslateY }] }], { pointerEvents: "box-none" }]}>
          <View style={{ width: '100%', maxWidth: contentMaxWidth }}>
            <LiquidGlassView variant="navigation" borderRadius={radius.xl} intensity={60} elevated style={{ width: '100%' }}
              contentStyle={{ minHeight: 60, flexDirection: 'row', alignItems: 'center', gap: spacing[3],
                paddingHorizontal: spacing[3], paddingVertical: spacing[2] }}>
              {!isExpanded ? <AvailabilityMenuButton onPress={openMenu} /> : null}
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text variant="bodySm" weight="semibold" color={colors.text.primary} numberOfLines={1}>Minha jornada</Text>
                <Text variant="caption" color={colors.text.secondary} numberOfLines={1}>Disponibilidade do profissional</Text>
              </View>
            </LiquidGlassView>
          </View>
        </Animated.View>
      )}
    </SafeAreaView>
  );
}

function Notice({ tone, icon, text, live }: {
  tone: 'info' | 'error'; icon: any; text: string; live?: boolean;
}) {
  const { colors, radius } = useTheme();
  return (
    <View style={[styles.notice, { backgroundColor: tone === 'error' ? colors.feedback.errorBackground : colors.surface.selected, borderRadius: radius.md }]}>
      <Ionicons name={icon} size={20} color={tone === 'error' ? colors.feedback.error : colors.brand.primary} />
      <Text accessibilityRole={tone === 'error' || live ? 'alert' : undefined} accessibilityLiveRegion={live ? 'polite' : undefined} color={colors.text.primary} style={styles.flexText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  stickyHeaderOverlay: { position: 'absolute', top: 8, left: 0, right: 0, alignItems: 'center', zIndex: 80 },
  floatingSaveButton: {
    position: 'absolute', width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center',
    elevation: 8, zIndex: 20, ...(ShadowPlatform.OS === 'web' ? { boxShadow: `0px 4px 8px rgba(0,0,0,${0.28})` } : { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.28, shadowRadius: 8, }),
  },
  hero: { gap: 12, paddingTop: 16, paddingBottom: 12 },
  heroAccent: { width: 44, height: 4, marginBottom: 4 },
  heroDescription: { maxWidth: 620 },
  mainGrid: { gap: 20 },
  mainGridExpanded: { flexDirection: 'row', alignItems: 'flex-start' },
  journeyColumn: { flex: 1, minWidth: 0 },
  sideColumn: { width: '100%' },
  sideColumnExpanded: { width: 310 },
  sectionIntro: { padding: 20, gap: 14 },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  sectionIcon: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  notice: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 16 },
  flexText: { flex: 1 },
  openingInfo: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  infoLine: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  separator: { height: 1 },
  loadingState: { alignItems: 'center', justifyContent: 'center', gap: 12, paddingVertical: 72 },
});
