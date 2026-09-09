import { View, Switch, StyleSheet } from 'react-native';
import { useFieldArray, type Control } from 'react-hook-form';
import { Text, Button, Card } from '@/shared/ui';
import { TimeRangeInput } from './TimeRangeInput';
import type { ScheduleDayView } from '../model/availability.types';

interface AvailabilityDayProps {
  day: ScheduleDayView;
  dayIndex: number;
  control: Control<any>;
  /** path base do array do form, ex: "days" */
  fieldArrayName: string;
  disabled?: boolean;
}

/**
 * Card de um dia da semana: toggle ativo/inativo + lista de intervalos.
 * Suporta múltiplos ranges (pausa de almoço confirmada no protótipo Stitch).
 */
export function AvailabilityDay({
  day,
  dayIndex,
  control,
  fieldArrayName,
  disabled,
}: AvailabilityDayProps) {
  const rangesPath = `${fieldArrayName}.${dayIndex}.entries`;
  const { fields, append, remove } = useFieldArray({ control, name: rangesPath });

  return (
    <Card
      accessibilityRole="group"
      accessibilityLabel={`Jornada de ${day.label}`}
    >
      <View style={styles.header}>
        <Text variant="label">{day.label}</Text>
        <Switch
          value={day.isOpen}
          disabled={disabled}
          accessibilityLabel={`Ativar atendimento em ${day.label}`}
          // O toggle on/off é gerenciado pelo ViewModel ao adicionar/remover entradas
          onValueChange={(open) => {
            if (open) {
              append({ weekday: day.weekday, barbermanId: null, range: { start: '', end: '' } });
            } else {
              // Remove todas as entradas deste dia
              fields.forEach((_, i) => remove(i));
            }
          }}
        />
      </View>

      {day.isOpen && (
        <View style={styles.ranges}>
          {fields.map((field, rangeIndex) => (
            <View key={field.id} style={styles.rangeRow}>
              <View style={styles.rangeInput}>
                <TimeRangeInput
                  control={control}
                  startPath={`${rangesPath}.${rangeIndex}.range.start`}
                  endPath={`${rangesPath}.${rangeIndex}.range.end`}
                  disabled={disabled}
                />
              </View>
              {fields.length > 1 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onPress={() => remove(rangeIndex)}
                  accessibilityLabel={`Remover intervalo ${rangeIndex + 1} de ${day.label}`}
                  disabled={disabled}
                >
                  Remover
                </Button>
              )}
            </View>
          ))}

          <Button
            variant="outline"
            size="sm"
            onPress={() =>
              append({ weekday: day.weekday, barbermanId: null, range: { start: '', end: '' } })
            }
            disabled={disabled}
          >
            + Adicionar intervalo
          </Button>
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 44,
  },
  ranges: { gap: 8, marginTop: 12 },
  rangeRow: { gap: 8 },
  rangeInput: { flex: 1 },
});
