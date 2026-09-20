import { StyleSheet, View } from 'react-native';
import { useController, useFormContext } from 'react-hook-form';
import { FormField, TextInput, Text } from '@/shared/ui';
import { maskTimeInput } from './input-masks';

interface TimeRangeInputProps {
  startPath: string;
  endPath: string;
  disabled?: boolean;
}

/**
 * Par de inputs de horário integrado ao React Hook Form via useFormContext.
 * Não recebe Control como prop — usa o contexto do FormProvider do pai.
 * A máscara mantém o valor final em HH:mm, exatamente como o contrato da API.
 */
export function TimeRangeInput({ startPath, endPath, disabled }: TimeRangeInputProps) {
  const { control } = useFormContext();
  const { field: startField, fieldState: startState } = useController({ control, name: startPath });
  const { field: endField, fieldState: endState } = useController({ control, name: endPath });

  return (
    <View style={styles.row}>
      <View style={styles.field}>
        <FormField label="Início" error={startState.error?.message}>
          <TextInput
            value={startField.value ?? ''}
            onChangeText={(value) => startField.onChange(maskTimeInput(value))}
            onBlur={startField.onBlur}
            placeholder="08:00"
            keyboardType="numeric"
            maxLength={5}
            editable={!disabled}
            accessibilityLabel="Horário de início"
            inputStyle={styles.numericInput}
          />
        </FormField>
      </View>

      <View style={styles.connector} accessibilityElementsHidden>
        <Text variant="caption">até</Text>
      </View>

      <View style={styles.field}>
        <FormField label="Fim" error={endState.error?.message}>
          <TextInput
            value={endField.value ?? ''}
            onChangeText={(value) => endField.onChange(maskTimeInput(value))}
            onBlur={endField.onBlur}
            placeholder="18:00"
            keyboardType="numeric"
            maxLength={5}
            editable={!disabled}
            accessibilityLabel="Horário de fim"
            inputStyle={styles.numericInput}
          />
        </FormField>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, width: '100%' },
  field: { flex: 1, minWidth: 0 },
  connector: {
    width: 28,
    minHeight: 76,
    paddingTop: 38,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  numericInput: { fontVariant: ['tabular-nums'], minWidth: 0 },
});