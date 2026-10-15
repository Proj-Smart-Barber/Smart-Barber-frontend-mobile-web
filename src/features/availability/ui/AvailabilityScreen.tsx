import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, Skeleton, Spinner, ErrorState, Button, Text } from '@/shared/ui';
import { LiquidGlassView } from '@/shared/navigation/LiquidGlassView';
import { useNavigation } from '@/shared/navigation/navigation-context';
import { useAdaptiveLayout, useTheme } from '@/shared/theme';
import { useAvailabilityViewModel } from '../model/use-availability-view-model';
import { AvailabilityError } from './AvailabilityError';
import { AvailabilityDay } from './AvailabilityDay';
import { ExceptionCard } from './ExceptionCard';
import { ExceptionForm } from './ExceptionForm';
import { weeklyScheduleEntrySchema, scheduleDaySchema } from '../model/availability.schema';
import type { AvailabilityException, WeeklyScheduleEntry } from '../api/availability.contract';
import type { AvailabilityExceptionFormValues } from '../model/availability.schema';

const formSchema = z.object({
  days: z.array(
    z.object({
      weekday: weeklyScheduleEntrySchema.shape.weekday,
      entries: scheduleDaySchema,
    }),
  ),
});

type AvailabilityFormValues = z.infer<typeof formSchema>;

export function AvailabilityScreen({ barbershopId }: { barbershopId?: string | null }) {
  const vm = useAvailabilityViewModel(barbershopId);
  const { colors, spacing, radius, isDark } = useTheme();
  const { openDrawer, onContentScroll, scrollCollapseProgress } = useNavigation();
  const { isExpanded, contentMaxWidth } = useAdaptiveLayout();
  const insets = useSafeAreaInsets();
  const stickyHeaderTranslateY = scrollCollapseProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -76],
  });
  const stickyHeaderOpacity = scrollCollapseProgress.interpolate({
    inputRange: [0, 0.8, 1],
    outputRange: [1, 0.15, 0],
  });
  const [saveFeedback, setSaveFeedback] = useState<
    | { variant: 'success' | 'error'; title: string; message: string }
    | null
  >(null);
  const [editingExceptionId, setEditingExceptionId] = useState<string | null>(null);

  const editingException =
    vm.exceptions.find((exception) => exception.id === editingExceptionId) ?? null;

  const webBackgroundStyle =
    Platform.OS === 'web'
      ? ({
          backgroundImage:
            isDark
              ? 'radial-gradient(ellipse at 50% 0%, rgba(197, 160, 89, 0.08) 0%, rgba(20, 20, 20, 0.98) 70%)'
              : 'radial-gradient(ellipse at 50% 0%, rgba(197, 160, 89, 0.12) 0%, #F7F5F3 70%)',
        } as any)
      : null;

  useEffect(() => {
    if (!saveFeedback) return;

    const timeout = setTimeout(() => setSaveFeedback(null), 4500);
    return () => clearTimeout(timeout);
  }, [saveFeedback]);

  const methods = useForm<AvailabilityFormValues>({
    resolver: zodResolver(formSchema),
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
        style={[styles.screen, { backgroundColor: colors.background.primary }, webBackgroundStyle]}
        edges={['top', 'bottom']}
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
          showsVerticalScrollIndicator={false}
          onScroll={onContentScroll}
          scrollEventThrottle={16}
        >
          <View style={[styles.contentInner, { maxWidth: contentMaxWidth }]}>
            <View style={styles.topBar}>
              {!isExpanded ? <AvailabilityMenuButton onPress={openDrawer} /> : null}
              <View style={styles.topBarTitle}>
                <Text variant="bodySm" weight="semibold" color={colors.text.primary} numberOfLines={1}>
                  Disponibilidade
                </Text>
                <Text variant="caption" color={colors.text.secondary} numberOfLines={1}>
                  Configuração operacional
                </Text>
              </View>
            </View>

            <View style={styles.hero}>
              <View
                style={[
                  styles.heroAccent,
                  { backgroundColor: colors.brand.primary, borderRadius: radius.full },
                ]}
              />
              <Skeleton width={260} height={32} style={{ marginBottom: spacing[2] }} />
              <Skeleton width="80%" height={16} />
            </View>

            <View style={[styles.mainGrid, isExpanded && styles.mainGridExpanded]}>
              <View style={[styles.journeyColumn, isExpanded && styles.journeyColumnExpanded]}>
                <LiquidGlassView
                  variant="card"
                  style={{ width: '100%', marginBottom: spacing[3] }}
                  contentStyle={{ padding: spacing[4], gap: spacing[3] }}
                >
                  <Skeleton width={180} height={20} />
                  <Skeleton width="60%" height={14} />
                </LiquidGlassView>
                <View style={{ gap: spacing[3] }}>
                  {[0, 1, 2, 3, 4, 5, 6].map((i) => (
                    <LiquidGlassView
                      key={i}
                      variant="card"
                      style={{ width: '100%', minHeight: 64 }}
                      contentStyle={{ padding: spacing[4], justifyContent: 'center' }}
                    >
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Skeleton width={110} height={18} />
                        <Skeleton width={80} height={28} borderRadius={radius.md} />
                      </View>
                    </LiquidGlassView>
                  ))}
                </View>
              </View>

              <View style={[styles.sideColumn, isExpanded && styles.sideColumnExpanded]}>
                <LiquidGlassView
                  variant="card"
                  style={{ width: '100%', marginBottom: spacing[3] }}
                  contentStyle={{ padding: spacing[4], gap: spacing[3] }}
                >
                  <Skeleton width={150} height={20} />
                  <Skeleton width="70%" height={14} />
                </LiquidGlassView>
                <LiquidGlassView
                  variant="card"
                  style={{ width: '100%', minHeight: 96 }}
                  contentStyle={{ padding: spacing[4], gap: spacing[2] }}
                >
                  <Skeleton width={130} height={16} />
                  <Skeleton width="50%" height={14} />
                </LiquidGlassView>
              </View>
            </View>
          </View>
        </ScrollView>
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
            description={vm.configurationError ?? 'Verifique sua conexão e tente novamente.'}
            onRetry={vm.handleRetry}
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

  function toExceptionPayload(values: AvailabilityExceptionFormValues) {
    return {
      date: values.date,
      barbermanId: values.barbermanId ?? null,
      openTime: values.openTime ?? null,
      closeTime: values.closeTime ?? null,
      reason: values.reason ?? null,
    };
  }

  async function onSubmitException(values: AvailabilityExceptionFormValues) {
    return vm.handleCreateException(toExceptionPayload(values));
  }

  async function onUpdateException(values: AvailabilityExceptionFormValues) {
    if (!editingException) return false;

    const updated = await vm.handleUpdateException(
      editingException.id,
      toExceptionPayload(values),
    );

    if (updated) {
      setSaveFeedback({
        variant: 'success',
        title: 'Exceção atualizada',
        message: 'A data especial foi atualizada com sucesso.',
      });
    }

    return updated;
  }

  async function onRemoveException(exceptionId: string) {
    const removed = await vm.handleRemoveException(exceptionId);

    if (removed && editingExceptionId === exceptionId) {
      setEditingExceptionId(null);
    }
  }

  function startEditingException(exception: AvailabilityException) {
    vm.clearFormError();
    setEditingExceptionId(exception.id);
  }

  return (
    // FormProvider expõe o contexto do form para AvailabilityDay e TimeRangeInput
    // via useFormContext(), eliminando prop drilling de Control
    <FormProvider {...methods}>
      <SafeAreaView
        style={[styles.screen, { backgroundColor: colors.background.primary }, webBackgroundStyle]}
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
                paddingTop: spacing[isExpanded ? 4 : 10],
                paddingBottom: Math.max(insets.bottom, 16) + (isExpanded ? 40 : 88),
              },
            ]}
            keyboardShouldPersistTaps="handled"
            contentInsetAdjustmentBehavior="automatic"
            showsVerticalScrollIndicator={false}
            onScroll={onContentScroll}
            scrollEventThrottle={16}
          >
            <View style={[styles.contentInner, { maxWidth: contentMaxWidth }]}>
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
                          onEdit={startEditingException}
                          onRemove={onRemoveException}
                          disabled={vm.isSaving}
                        />
                      ))
                    )}

                    {editingException ? (
                      <ExceptionForm
                        key={`edit-${editingException.id}`}
                        mode="edit"
                        initialValues={{
                          date: editingException.date,
                          barbermanId: editingException.barbermanId,
                          openTime: editingException.openTime,
                          closeTime: editingException.closeTime,
                          reason: editingException.reason,
                        }}
                        onSubmit={onUpdateException}
                        onCancelEdit={() => setEditingExceptionId(null)}
                        disabled={vm.isSaving}
                      />
                    ) : (
                      <ExceptionForm onSubmit={onSubmitException} disabled={vm.isSaving} />
                    )}
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
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Salvar disponibilidade"
            accessibilityHint="Salva os horários recorrentes configurados para esta unidade"
            accessibilityState={{ disabled: vm.isSaving }}
            disabled={vm.isSaving}
            onPress={methods.handleSubmit(onSubmitJourney, onInvalidJourney)}
            style={({ pressed }) => [
              styles.floatingSaveButton,
              {
                right: spacing[5],
                bottom: Math.max(insets.bottom, 12) + 100,
                backgroundColor: colors.brand.primary,
                opacity: vm.isSaving ? 0.7 : pressed ? 0.82 : 1,
              },
            ]}
          >
            {vm.isSaving ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Ionicons name="checkmark-sharp" size={25} color="#FFFFFF" />
            )}
          </Pressable>
        </KeyboardAvoidingView>

        <Animated.View
          pointerEvents="box-none"
          style={[
            styles.stickyHeaderOverlay,
            {
              paddingHorizontal: spacing[isExpanded ? 8 : 5],
              opacity: stickyHeaderOpacity,
              transform: [{ translateY: stickyHeaderTranslateY }],
            },
          ]}
        >
          <View style={{ width: '100%', maxWidth: contentMaxWidth }}>
            <LiquidGlassView
              variant="navigation"
              borderRadius={radius.xl}
              intensity={60}
              elevated
              style={{ width: '100%' }}
              contentStyle={{
                minHeight: 60,
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing[3],
                paddingHorizontal: spacing[3],
                paddingVertical: spacing[2],
              }}
            >
              {!isExpanded ? <AvailabilityMenuButton onPress={openDrawer} /> : null}
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text variant="bodySm" weight="semibold" color={colors.text.primary} numberOfLines={1}>
                  Disponibilidade
                </Text>
                <Text variant="caption" color={colors.text.secondary} numberOfLines={1}>
                  Configuração operacional
                </Text>
              </View>
            </LiquidGlassView>
          </View>
        </Animated.View>

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
  stickyHeaderOverlay: {
    position: 'absolute',
    top: 8,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 80,
  },
  topBar: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  menuButton: { width: 44, height: 44 },
  floatingSaveButton: {
    position: 'absolute',
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    zIndex: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 8,
  },
  topBarTitle: { flex: 1 },
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
});

function AvailabilityMenuButton({ onPress }: { onPress: () => void }) {
  const { colors, radius } = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Abrir menu"
      onPress={onPress}
      style={({ pressed }) => ({
        ...styles.menuButton,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: colors.border.default,
        backgroundColor: pressed ? colors.surface.selected : colors.surface.default,
      })}
    >
      <Ionicons name="menu-outline" size={22} color={colors.text.primary} />
    </Pressable>
  );
}
