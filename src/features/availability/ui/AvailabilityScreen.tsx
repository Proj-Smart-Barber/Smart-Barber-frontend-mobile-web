import { ScrollView, View, StyleSheet } from 'react-native';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Spinner, ErrorState, Button, Text } from '@/shared/ui';
import { useAvailabilityViewModel } from '../model/use-availability-view-model';
import { AvailabilityError } from './AvailabilityError';
import { AvailabilityDay } from './AvailabilityDay';
import { ExceptionCard } from './ExceptionCard';
import { weeklyScheduleEntrySchema } from '../model/availability.schema';
import type { WeeklyScheduleEntry } from '../api/availability.contract';

const formSchema = z.object({
  days: z.array(
    z.object({
      weekday: weeklyScheduleEntrySchema.shape.weekday,
      entries: z.array(weeklyScheduleEntrySchema),
    })
  ),
});

type AvailabilityFormValues = z.infer<typeof formSchema>;

export function AvailabilityScreen() {
  const vm = useAvailabilityViewModel();

  const { control, handleSubmit } = useForm<AvailabilityFormValues>({
    resolver: zodResolver(formSchema),
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

  async function onSubmit(values: AvailabilityFormValues) {
    const entries: Omit<WeeklyScheduleEntry, 'id'>[] = values.days.flatMap((day) =>
      day.entries.map((entry) => ({
        weekday: entry.weekday,
        barbermanId: entry.barbermanId,
        range: entry.range,
      }))
    );
    await vm.handleSaveSchedule(entries);
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      {vm.barbershop && (
        <Text variant="caption" style={styles.timezone}>
          Fuso horário: {vm.barbershop.timezone}
        </Text>
      )}

      {vm.formError && <AvailabilityError error={vm.formError} />}

      {/* Jornada recorrente */}
      <Text variant="heading">Jornada semanal</Text>
      {vm.scheduleDays.map((day, dayIndex) => (
        <AvailabilityDay
          key={day.weekday}
          day={day}
          dayIndex={dayIndex}
          control={control}
          fieldArrayName="days"
          disabled={vm.isSaving}
        />
      ))}

      <Button
        onPress={handleSubmit(onSubmit)}
        disabled={vm.isSaving}
        accessibilityLabel="Salvar jornada"
      >
        {vm.isSaving ? 'Salvando...' : 'Salvar jornada'}
      </Button>

      {/* Exceções */}
      <View style={styles.section}>
        <Text variant="heading">Exceções</Text>
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
        {/* TODO: botão/form para criar nova exceção */}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, gap: 12 },
  timezone: { opacity: 0.6 },
  section: { gap: 8, marginTop: 24 },
});
