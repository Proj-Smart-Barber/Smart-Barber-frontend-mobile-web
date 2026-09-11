import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Spinner, ErrorState, Button, Text } from '@/shared/ui';
import { useAdaptiveLayout, useTheme } from '@/shared/theme';
import { useAvailabilityViewModel } from '../model/use-availability-view-model';
import { AvailabilityError } from './AvailabilityError';
import { AvailabilityDay } from './AvailabilityDay';
import { ExceptionCard } from './ExceptionCard';
import { ExceptionForm } from './ExceptionForm';
import { weeklyScheduleEntrySchema, scheduleDaySchema } from '../model/availability.schema';
import type { WeeklyScheduleEntry } from '../api/availability.contract';
import type { AvailabilityExceptionFormValues } from '../model/availability.schema';

const formSchema = z.object({
  days: z.array(
    z.object({
      weekday: weeklyScheduleEntrySchema.shape.weekday,
      // scheduleDaySchema (não weeklyScheduleEntrySchema puro) — é o refine que
      // detecta sobreposição de ranges dentro do mesmo dia (Critério de Aceite 4).
      // Sem isso o conflito nunca era validado, só o formato de cada range isolado.
      entries: scheduleDaySchema,
    }),
  ),
});

type AvailabilityFormValues = z.infer<typeof formSchema>;

export function AvailabilityScreen() {
  const router = useRouter();
  const vm = useAvailabilityViewModel();
  const { colors, spacing, radius, isDark, toggleTheme } = useTheme();
  const { isExpanded, contentMaxWidth } = useAdaptiveLayout();
  const [saveFeedback, setSaveFeedback] = useState<
    | { variant: 'success' | 'error'; title: string; message: string }
    | null
  >(null);

  useEffect(() => {
    if (!saveFeedback) return;

    const timeout = setTimeout(() => setSaveFeedback(null), 4500);
    return () => clearTimeout(timeout);
  }, [saveFeedback]);

  const methods = useForm<AvailabilityFormValues>({
    resolver: zodResolver(formSchema),
    // onBlur (+ onChange após o 1º erro, padrão do RHF) — o gestor vê o conflito
    // ao sair do campo, sem precisar apertar "Salvar jornada" (Critério de Aceite 4:
    // aviso "imediato").
    mode: 'onBlur',
    values: vm.scheduleDays
      ? {
          days: vm.scheduleDays.map((d) => ({
            weekday: d.weekday,
            entries: d.entries,
          })),
        }
      : undefined,
  });

  if (vm.isLoadingInitial) {
    return (
      <SafeAreaView
        style={[styles.stateScreen, { backgroundColor: colors.background.primary }]}
        edges={['top', 'bottom']}
      >
        <View style={styles.stateContent}>
          <Spinner />
          <Text variant="caption" color={colors.text.secondary}>
            Carregando disponibilidade…
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (vm.isFatalError) {
    return (
      <SafeAreaView
        style={[styles.stateScreen, { backgroundColor: colors.background.primary }]}
        edges={['top', 'bottom']}
      >
        <View style={[styles.stateContent, { paddingHorizontal: spacing[5] }]}>
          <ErrorState
            title="Não foi possível carregar a jornada"
            description="Verifique sua conexão e tente novamente."
          />
        </View>
      </SafeAreaView>
    );
  }

  async function onSubmitJourney(values: AvailabilityFormValues) {
    setSaveFeedback(null);

    const entries: Omit<WeeklyScheduleEntry, 'id'>[] = values.days.flatMap((day) =>
      day.entries.map((entry) => ({
        weekday: entry.weekday,
        barbermanId: entry.barbermanId,
        range: entry.range,
      })),
    );

    const saved = await vm.handleSaveSchedule(entries);

    if (saved) {
      setSaveFeedback({
        variant: 'success',
        title: 'Alterações salvas',
        message: 'A jornada de atendimento foi atualizada com sucesso.',
      });
      return;
    }

    setSaveFeedback({
      variant: 'error',
      title: 'Não foi possível salvar',
      message: 'Verifique os campos preenchidos e tente novamente.',
    });
  }

  function onInvalidJourney() {
    vm.clearFormError();
    setSaveFeedback({
      variant: 'error',
      title: 'Não foi possível salvar',
      message: 'Verifique os campos preenchidos e corrija os horários destacados.',
    });
  }

  async function onSubmitException(values: AvailabilityExceptionFormValues) {
    return vm.handleCreateException({
      date: values.date,
      barbermanId: values.barbermanId ?? null,
      openTime: values.openTime ?? null,
      closeTime: values.closeTime ?? null,
      reason: values.reason ?? null,
    });
  }

  return (
    // FormProvider expõe o contexto do form para AvailabilityDay e TimeRangeInput
    // via useFormContext(), eliminando prop drilling de Control
    <FormProvider {...methods}>
      <SafeAreaView
        style={[styles.screen, { backgroundColor: colors.background.primary }]}
        edges={['top', 'bottom']}
      >
        <KeyboardAvoidingView
          style={styles.screen}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={[
              styles.content,
              {
                paddingHorizontal: spacing[isExpanded ? 8 : 5],
                paddingTop: spacing[4],
                paddingBottom: spacing[10],
              },
            ]}
            keyboardShouldPersistTaps="handled"
            contentInsetAdjustmentBehavior="automatic"
            showsVerticalScrollIndicator={false}
          >
            <View style={[styles.contentInner, { maxWidth: contentMaxWidth }]}>
              <View style={styles.topBar}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Voltar"
                  hitSlop={8}
                  onPress={() => router.back()}
                  style={({ pressed }) => [
                    styles.backButton,
                    {
                      backgroundColor: pressed ? colors.surface.selected : colors.surface.default,
                      borderColor: colors.border.subtle,
                      borderRadius: radius.md,
                    },
                  ]}
                >
                  <Ionicons name="arrow-back" size={20} color={colors.text.primary} />
                </Pressable>

                <View style={styles.topBarTitle}>
                  <Text variant="bodySm" weight="semibold" color={colors.text.primary}>
                    Disponibilidade
                  </Text>
                  <Text variant="caption" color={colors.text.secondary}>
                    Configuração operacional
                  </Text>
                </View>

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={isDark ? 'Ativar modo claro' : 'Ativar modo escuro'}
                  accessibilityHint={
                    isDark
                      ? 'Muda a interface para o tema claro'
                      : 'Muda a interface para o tema escuro'
                  }
                  hitSlop={8}
                  onPress={toggleTheme}
                  style={({ pressed }) => [
                    styles.themeButton,
                    {
                      backgroundColor: pressed ? colors.surface.selected : colors.surface.default,
                      borderColor: colors.border.subtle,
                      borderRadius: radius.full,
                    },
                  ]}
                >
                  <Ionicons
                    name={isDark ? 'sunny-outline' : 'moon-outline'}
                    size={20}
                    color={colors.text.primary}
                  />
                </Pressable>
              </View>

              <View style={styles.hero}>
                <View
                  style={[
                    styles.heroAccent,
                    { backgroundColor: colors.brand.primary, borderRadius: radius.full },
                  ]}
                />
                <Text variant="display" color={colors.text.primary}>
                  Configure os horários{isExpanded ? ' de atendimento.' : '\nde atendimento.'}
                </Text>
                <Text variant="body" color={colors.text.secondary} style={styles.heroDescription}>
                  Defina a jornada recorrente da unidade e registre exceções para datas específicas.
                </Text>
              </View>

              {/* Área de alerta global — Critério de Aceite 4 */}
              {vm.formError && !saveFeedback && <AvailabilityError error={vm.formError} />}

              <View style={[styles.mainGrid, isExpanded && styles.mainGridExpanded]}>
                {/* ── Jornada recorrente ── */}
                <View style={[styles.journeyColumn, isExpanded && styles.journeyColumnExpanded]}>
                  <View
                    style={[
                      styles.sectionIntro,
                      {
                        backgroundColor: colors.background.secondary,
                        borderRadius: radius.lg,
                      },
                    ]}
                  >
                    <View style={styles.sectionIntroHeader}>
                      <View
                        style={[
                          styles.sectionIcon,
                          {
                            backgroundColor: colors.surface.selected,
                            borderRadius: radius.md,
                          },
                        ]}
                      >
                        <Ionicons name="calendar-outline" size={20} color={colors.brand.primary} />
                      </View>
                      <View style={styles.sectionIntroCopy}>
                        <Text variant="badge" color={colors.brand.primary}>
                          JORNADA SEMANAL
                        </Text>
                        <Text variant="h2" color={colors.text.primary}>
                          Horários recorrentes
                        </Text>
                      </View>
                    </View>
                    <Text variant="bodySm" color={colors.text.secondary}>
                      Ative os dias de atendimento e organize um ou mais intervalos por dia.
                    </Text>
                  </View>

                  <View style={[styles.daysList, { gap: spacing[3] }]}>
                    {vm.scheduleDays.map((day, dayIndex) => (
                      <AvailabilityDay
                        key={day.weekday}
                        day={day}
                        dayIndex={dayIndex}
                        fieldArrayName="days"
                        disabled={vm.isSaving}
                      />
                    ))}
                  </View>
                </View>

                {/* ── Exceções ── */}
                <View style={[styles.sideColumn, isExpanded && styles.sideColumnExpanded]}>
                  <View
                    style={[
                      styles.sectionIntro,
                      {
                        backgroundColor: colors.background.secondary,
                        borderRadius: radius.lg,
                      },
                    ]}
                  >
                    <View style={styles.sectionIntroHeader}>
                      <View
                        style={[
                          styles.sectionIcon,
                          {
                            backgroundColor: colors.surface.selected,
                            borderRadius: radius.md,
                          },
                        ]}
                      >
                        <Ionicons name="calendar-clear-outline" size={20} color={colors.brand.primary} />
                      </View>
                      <View style={styles.sectionIntroCopy}>
                        <Text variant="badge" color={colors.brand.primary}>
                          EXCEÇÕES
                        </Text>
                        <Text variant="h2" color={colors.text.primary}>
                          Datas especiais
                        </Text>
                      </View>
                    </View>
                    <Text variant="bodySm" color={colors.text.secondary}>
                      Feriados, folgas ou horários diferentes da jornada semanal.
                    </Text>
                  </View>

                  <View style={[styles.exceptionList, { gap: spacing[3] }]}>
                    {vm.exceptions.length === 0 ? (
                      <View
                        style={[
                          styles.emptyExceptions,
                          {
                            backgroundColor: colors.surface.default,
                            borderColor: colors.border.subtle,
                            borderRadius: radius.lg,
                          },
                        ]}
                      >
                        <Ionicons name="calendar-outline" size={24} color={colors.text.muted} />
                        <View style={styles.emptyCopy}>
                          <Text variant="bodySm" weight="semibold" color={colors.text.primary}>
                            Nenhuma exceção cadastrada
                          </Text>
                          <Text variant="caption" color={colors.text.secondary}>
                            A jornada semanal será utilizada normalmente.
                          </Text>
                        </View>
                      </View>
                    ) : (
                      vm.exceptions.map((exception) => (
                        <ExceptionCard
                          key={exception.id}
                          exception={exception}
                          onRemove={vm.handleRemoveException}
                          disabled={vm.isSaving}
                        />
                      ))
                    )}

                    {/* Formulário de nova exceção — Critério de Aceite 1 */}
                    <ExceptionForm onSubmit={onSubmitException} disabled={vm.isSaving} />
                  </View>

                  {/* Timezone da unidade — Critério de Aceite 3 */}
                  {vm.barbershop && (
                    <View
                      style={[
                        styles.timezoneCard,
                        {
                          backgroundColor: colors.surface.default,
                          borderColor: colors.border.subtle,
                          borderRadius: radius.lg,
                        },
                      ]}
                    >
                      <View
                        style={[
                          styles.timezoneIcon,
                          {
                            backgroundColor: colors.surface.elevated,
                            borderRadius: radius.md,
                          },
                        ]}
                      >
                        <Ionicons name="globe-outline" size={20} color={colors.text.secondary} />
                      </View>
                      <View style={styles.timezoneCopy}>
                        <Text variant="caption" color={colors.text.secondary}>
                          Fuso da unidade
                        </Text>
                        <Text variant="bodySm" weight="semibold" color={colors.text.primary}>
                          {vm.barbershop.timezone}
                        </Text>
                      </View>
                    </View>
                  )}
                </View>
              </View>
            </View>
          </ScrollView>

          <View
            style={[
              styles.footer,
              {
                backgroundColor: colors.background.primary,
                borderTopColor: colors.border.subtle,
                paddingHorizontal: spacing[isExpanded ? 8 : 5],
                paddingVertical: spacing[3],
              },
            ]}
          >
            <View
              style={[
                styles.footerInner,
                { maxWidth: contentMaxWidth },
                isExpanded && styles.footerInnerExpanded,
              ]}
            >
              {isExpanded ? (
                <View style={styles.footerCopy}>
                  <Text variant="bodySm" weight="semibold" color={colors.text.primary}>
                    Jornada da unidade
                  </Text>
                  <Text variant="caption" color={colors.text.secondary}>
                    Revise os horários antes de salvar.
                  </Text>
                </View>
              ) : null}

              <Button
                title="Salvar alterações"
                leftIcon={
                  <Ionicons name="checkmark-circle-outline" size={20} color={colors.text.inverse} />
                }
                onPress={methods.handleSubmit(onSubmitJourney, onInvalidJourney)}
                loading={vm.isSaving}
                disabled={vm.isSaving}
                style={isExpanded ? styles.saveButtonExpanded : styles.saveButtonCompact}
              />
            </View>
          </View>
        </KeyboardAvoidingView>

        <Modal
          visible={Boolean(saveFeedback)}
          transparent
          animationType="fade"
          statusBarTranslucent
          onRequestClose={() => setSaveFeedback(null)}
        >
          <View
            style={[
              styles.feedbackBackdrop,
              { backgroundColor: colors.background.overlay },
              Platform.OS === 'web'
                ? ({
                    backdropFilter: 'blur(10px)',
                    WebkitBackdropFilter: 'blur(10px)',
                  } as any)
                : null,
            ]}
          >
            {saveFeedback ? (
              <View
                accessibilityRole="alert"
                accessibilityLiveRegion="assertive"
                style={[
                  styles.feedbackCard,
                  {
                    backgroundColor: colors.background.elevated,
                    borderColor:
                      saveFeedback.variant === 'success'
                        ? colors.feedback.successBorder
                        : colors.feedback.errorBorder,
                    borderRadius: radius.xl,
                    padding: spacing[6],
                  },
                ]}
              >
                <View
                  style={[
                    styles.feedbackIcon,
                    {
                      backgroundColor:
                        saveFeedback.variant === 'success'
                          ? colors.feedback.successBackground
                          : colors.feedback.errorBackground,
                      borderRadius: radius.full,
                    },
                  ]}
                >
                  <Ionicons
                    name={
                      saveFeedback.variant === 'success'
                        ? 'checkmark-circle'
                        : 'alert-circle'
                    }
                    size={34}
                    color={
                      saveFeedback.variant === 'success'
                        ? colors.feedback.success
                        : colors.feedback.error
                    }
                  />
                </View>

                <View style={styles.feedbackCopy}>
                  <Text variant="h2" color={colors.text.primary} style={styles.feedbackTitle}>
                    {saveFeedback.title}
                  </Text>
                  <Text
                    variant="bodySm"
                    color={colors.text.secondary}
                    style={styles.feedbackMessage}
                  >
                    {saveFeedback.message}
                  </Text>
                </View>

                <View
                  style={[
                    styles.feedbackAccent,
                    {
                      backgroundColor:
                        saveFeedback.variant === 'success'
                          ? colors.feedback.success
                          : colors.feedback.error,
                      borderRadius: radius.full,
                    },
                  ]}
                />
              </View>
            ) : null}
          </View>
        </Modal>
      </SafeAreaView>
    </FormProvider>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scroll: { flex: 1 },
  stateScreen: { flex: 1, justifyContent: 'center' },
  stateContent: { alignItems: 'center', justifyContent: 'center', gap: 12 },
  content: { flexGrow: 1 },
  contentInner: { width: '100%', alignSelf: 'center' },
  topBar: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  topBarTitle: { flex: 1 },
  themeButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  feedbackBackdrop: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  feedbackCard: {
    width: '100%',
    maxWidth: 420,
    minHeight: 220,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    overflow: 'hidden',
  },
  feedbackIcon: {
    width: 68,
    height: 68,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  feedbackCopy: {
    width: '100%',
    alignItems: 'center',
  },
  feedbackTitle: {
    textAlign: 'center',
  },
  feedbackMessage: {
    maxWidth: 320,
    marginTop: 8,
    textAlign: 'center',
  },
  feedbackAccent: {
    width: 44,
    height: 4,
    marginTop: 22,
  },
  hero: { marginTop: 28, marginBottom: 32 },
  heroAccent: { width: 36, height: 4, marginBottom: 16 },
  heroDescription: { maxWidth: 640, marginTop: 10 },
  mainGrid: { width: '100%', gap: 32 },
  mainGridExpanded: { flexDirection: 'row', alignItems: 'flex-start', gap: 24 },
  journeyColumn: { width: '100%' },
  journeyColumnExpanded: { flex: 1.55 },
  sideColumn: { width: '100%' },
  sideColumnExpanded: { flex: 1, minWidth: 320 },
  sectionIntro: { padding: 20, gap: 14, marginBottom: 14 },
  sectionIntroHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  sectionIcon: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  sectionIntroCopy: { flex: 1, gap: 2 },
  daysList: { width: '100%' },
  exceptionList: { width: '100%' },
  emptyExceptions: {
    minHeight: 88,
    padding: 16,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  emptyCopy: { flex: 1, gap: 2 },
  timezoneCard: {
    marginTop: 16,
    padding: 16,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  timezoneIcon: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  timezoneCopy: { flex: 1, gap: 2 },
  footer: { borderTopWidth: 1 },
  footerInner: { width: '100%', alignSelf: 'center' },
  footerInnerExpanded: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 24,
  },
  footerCopy: { flex: 1 },
  saveButtonCompact: { width: '100%' },
  saveButtonExpanded: { width: 300 },
});