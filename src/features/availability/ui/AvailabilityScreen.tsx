import { ScrollView, View, StyleSheet } from 'react-native';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Spinner, ErrorState, Button, Text } from '@/shared/ui';
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
  const vm = useAvailabilityViewModel();

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

  if (vm.isLoadingInitial) return <Spinner />;

  if (vm.isFatalError) {
    return (
      <ErrorState
        title="Não foi possível carregar a jornada"
        description="Verifique sua conexão e tente novamente."
      />
    );
  }

  async function onSubmitJourney(values: AvailabilityFormValues) {
    const entries: Omit<WeeklyScheduleEntry, 'id'>[] = values.days.flatMap((day) =>
      day.entries.map((entry) => ({
        weekday: entry.weekday,
        barbermanId: entry.barbermanId,
        range: entry.range,
      })),
    );
    await vm.handleSaveSchedule(entries);
  }

  async function onSubmitException(values: AvailabilityExceptionFormValues) {
    await vm.handleCreateException({
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
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {/* Timezone da unidade — Critério de Aceite 3 */}
        {vm.barbershop && (
          <Text variant="caption" style={styles.timezone}>
            Fuso horário: {vm.barbershop.timezone}
          </Text>
        )}

        {/* Área de alerta global — Critério de Aceite 4 */}
        {vm.formError && <AvailabilityError error={vm.formError} />}

        {/* ── Jornada recorrente ── */}
        <Text variant="h3">Jornada semanal</Text>

        {vm.scheduleDays.map((day, dayIndex) => (
          <AvailabilityDay
            key={day.weekday}
            day={day}
            dayIndex={dayIndex}
            fieldArrayName="days"
            disabled={vm.isSaving}
          />
        ))}

        <Button
          title={vm.isSaving ? 'Salvando...' : 'Salvar jornada'}
          onPress={methods.handleSubmit(onSubmitJourney)}
          disabled={vm.isSaving}
        />

        {/* ── Exceções ── */}
        <View style={styles.section}>
          <Text variant="h3">Exceções</Text>

          {vm.exceptions.length === 0 ? (
            <Text variant="caption">Nenhuma exceção cadastrada.</Text>
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
          <ExceptionForm
            onSubmit={onSubmitException}
            disabled={vm.isSaving}
          />
        </View>
      </ScrollView>
    </FormProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, gap: 12 },
  timezone: { opacity: 0.6 },
  section: { gap: 8, marginTop: 24 },
});
