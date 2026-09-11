import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Switch, View } from 'react-native';
import { useFieldArray, useFormContext } from 'react-hook-form';
import { Text, Button, Card } from '@/shared/ui';
import { useTheme } from '@/shared/theme';
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
  const { colors, spacing, radius } = useTheme();
  const { control, formState: { errors } } = useFormContext();
  const rangesPath = `${fieldArrayName}.${dayIndex}.entries`;
  const { fields, append, remove } = useFieldArray({ control, name: rangesPath });

  // O estado visual do switch precisa vir do formulário, não do snapshot
  // carregado pelo ViewModel. Assim append/remove atualizam o toggle imediatamente.
  const isOpen = fields.length > 0;

  // Erro de conflito de ranges vem do refine do scheduleDaySchema
  // RHF expõe erros de array-level no campo root do array
  const dayError = (errors as any)?.days?.[dayIndex]?.entries?.root?.message
    ?? (errors as any)?.days?.[dayIndex]?.entries?.message;

  return (
    <View>
      <Card
        style={[
          styles.card,
          {
            backgroundColor: isOpen ? colors.background.card : colors.surface.default,
            borderColor: dayError ? colors.border.error : colors.border.subtle,
            borderRadius: radius.lg,
            padding: spacing[5],
          },
        ]}
      >
        <View style={styles.header}>
          <View style={styles.dayIdentity}>
            <View
              style={[
                styles.dayIndex,
                {
                  backgroundColor: isOpen ? colors.surface.selected : colors.surface.elevated,
                  borderRadius: radius.md,
                },
              ]}
            >
              <Text
                variant="badge"
                color={isOpen ? colors.brand.primary : colors.text.secondary}
              >
                {String(dayIndex + 1).padStart(2, '0')}
              </Text>
            </View>

            <View style={styles.dayCopy}>
              <Text variant="subhead" color={colors.text.primary}>
                {day.label}
              </Text>
              <View style={styles.statusLine}>
                <View
                  style={[
                    styles.statusDot,
                    { backgroundColor: isOpen ? colors.feedback.success : colors.text.muted },
                  ]}
                />
                <Text variant="caption" color={colors.text.secondary}>
                  {isOpen ? 'Atendimento ativo' : 'Sem atendimento'}
                </Text>
              </View>
            </View>
          </View>

          <Switch
            value={isOpen}
            disabled={disabled}
            trackColor={{
              false: colors.surface.elevated,
              true: colors.brand.primary,
            }}
            thumbColor={colors.text.primary}
            ios_backgroundColor={colors.surface.elevated}
            accessibilityLabel={`Ativar atendimento em ${day.label}`}
            onValueChange={(isOpen) => {
              if (isOpen) {
                if (fields.length === 0) {
                  append({ weekday: day.weekday, barbermanId: null, range: { start: '', end: '' } });
                }
              } else {
                // Remove de trás pra frente pra não deslocar índices
                for (let i = fields.length - 1; i >= 0; i--) remove(i);
              }
            }}
          />
        </View>

        {isOpen && (
          <View
            style={[
              styles.scheduleArea,
              {
                borderTopColor: colors.border.subtle,
                marginTop: spacing[4],
                paddingTop: spacing[4],
              },
            ]}
          >
            <View style={styles.scheduleHeader}>
              <Text variant="badge" color={colors.text.secondary}>
                INTERVALOS DO DIA
              </Text>
              <Text variant="caption" color={colors.text.muted}>
                {fields.length} {fields.length === 1 ? 'intervalo' : 'intervalos'}
              </Text>
            </View>

            <View style={[styles.ranges, { gap: spacing[3] }]}>
              {fields.map((field, rangeIndex) => (
                <View
                  key={field.id}
                  style={[
                    styles.rangeRow,
                    {
                      backgroundColor: colors.surface.default,
                      borderColor: colors.border.subtle,
                      borderRadius: radius.md,
                      padding: spacing[3],
                    },
                  ]}
                >
                  <View style={styles.rangeToolbar}>
                    <View style={styles.rangeIdentity}>
                      <View
                        style={[
                          styles.rangeNumber,
                          {
                            backgroundColor: colors.surface.elevated,
                            borderRadius: radius.sm,
                          },
                        ]}
                      >
                        <Text variant="badge" color={colors.text.muted}>
                          {String(rangeIndex + 1).padStart(2, '0')}
                        </Text>
                      </View>
                      <Text variant="caption" color={colors.text.secondary}>
                        Intervalo {rangeIndex + 1}
                      </Text>
                    </View>

                    {fields.length > 1 && (
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`Remover intervalo ${rangeIndex + 1} de ${day.label}`}
                        disabled={disabled}
                        hitSlop={6}
                        onPress={() => remove(rangeIndex)}
                        style={({ pressed }) => [
                          styles.removeButton,
                          {
                            backgroundColor: pressed
                              ? colors.feedback.errorBackground
                              : colors.surface.elevated,
                            borderRadius: radius.md,
                            opacity: disabled ? 0.5 : 1,
                          },
                        ]}
                      >
                        <Ionicons name="trash-outline" size={18} color={colors.feedback.error} />
                      </Pressable>
                    )}
                  </View>

                  <View style={styles.rangeInput}>
                    <TimeRangeInput
                      startPath={`${rangesPath}.${rangeIndex}.range.start`}
                      endPath={`${rangesPath}.${rangeIndex}.range.end`}
                      disabled={disabled}
                    />
                  </View>
                </View>
              ))}
            </View>

            <Button
              title="Adicionar intervalo"
              variant="ghost"
              leftIcon={<Ionicons name="add" size={20} color={colors.brand.primary} />}
              textStyle={{ color: colors.brand.primary }}
              style={[
                styles.addButton,
                {
                  borderColor: colors.border.ghost,
                  backgroundColor: colors.surface.selected,
                },
              ]}
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
        <View style={[styles.errorRow, { marginTop: spacing[2], paddingHorizontal: spacing[2] }]}>
          <Ionicons name="alert-circle-outline" size={16} color={colors.feedback.error} />
          <Text variant="error" style={styles.errorText}>
            {dayError}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 52,
    gap: 16,
  },
  dayIdentity: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  dayIndex: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center' },
  dayCopy: { flex: 1, gap: 3 },
  statusLine: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statusDot: { width: 6, height: 6, borderRadius: 9999 },
  scheduleArea: { borderTopWidth: 1 },
  scheduleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  ranges: { width: '100%' },
  rangeRow: {
    borderWidth: 1,
    gap: 10,
  },
  rangeToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 44,
  },
  rangeIdentity: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rangeNumber: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  rangeInput: { width: '100%' },
  removeButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  addButton: { marginTop: 12, borderWidth: 1 },
  errorRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  errorText: { flex: 1 },
});