import { View, Switch, StyleSheet } from 'react-native';
import { useFieldArray, useFormContext } from 'react-hook-form';
import { Text, Button, Card } from '@/shared/ui';
import { TimeRangeInput } from './TimeRangeInput';
import type { ScheduleDayView } from '../model/availability.types';

interface AvailabilityDayProps {
  day: ScheduleDayView;
  dayIndex: number;
  /** path base do array do form, ex: "days" */
  fieldArrayName: string;
  disabled?: boolean;
}

/**
 * Card de um dia da semana: toggle ativo/inativo + lista de intervalos.
 * Usa useFormContext em vez de receber Control como prop — elimina o erro
 * de tipagem Control<any> incompatível e é o padrão recomendado pelo RHF
 * quando o form está definido num componente pai.
 *
 * Expõe erros de conflito de horário do Zod (scheduleDaySchema.refine)
 * diretamente abaixo do card — Critério de Aceite 4.
 */
export function AvailabilityDay({
  day,
  dayIndex,
  fieldArrayName,
  disabled,
}: AvailabilityDayProps) {
  const { control, formState: { errors } } = useFormContext();
  const rangesPath = `${fieldArrayName}.${dayIndex}.entries`;
  const { fields, append, remove } = useFieldArray({ control, name: rangesPath });

  // Erro de conflito de ranges vem do refine do scheduleDaySchema
  // RHF expõe erros de array-level no campo root do array
  const dayError = (errors as any)?.days?.[dayIndex]?.entries?.root?.message
    ?? (errors as any)?.days?.[dayIndex]?.entries?.message;

  return (
    <View>
      <Card>
        <View style={styles.header}>
          <Text variant="bodySm" weight="semibold">{day.label}</Text>
          <Switch
            value={day.isOpen}
            disabled={disabled}
            accessibilityLabel={`Ativar atendimento em ${day.label}`}
            onValueChange={(isOpen) => {
              if (isOpen) {
                append({ weekday: day.weekday, barbermanId: null, range: { start: '', end: '' } });
              } else {
                // Remove de trás pra frente pra não deslocar índices
                for (let i = fields.length - 1; i >= 0; i--) remove(i);
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
                    startPath={`${rangesPath}.${rangeIndex}.range.start`}
                    endPath={`${rangesPath}.${rangeIndex}.range.end`}
                    disabled={disabled}
                  />
                </View>
                {fields.length > 1 && (
                  <Button
                    title="Remover"
                    variant="ghost"
                    onPress={() => remove(rangeIndex)}
                    disabled={disabled}
                  />
                )}
              </View>
            ))}

            <Button
              title="+ Intervalo"
              variant="outline"
              onPress={() =>
                append({ weekday: day.weekday, barbermanId: null, range: { start: '', end: '' } })
              }
              disabled={disabled}
            />
          </View>
        )}
      </Card>

      {/* Erro de conflito inline — Critério de Aceite 4 */}
      {dayError ? (
        <Text variant="error" style={styles.errorText}>
          {dayError}
        </Text>
      ) : null}
    </View>
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
  rangeRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  rangeInput: { flex: 1 },
  errorText: { marginTop: 4, marginLeft: 2 },
});
