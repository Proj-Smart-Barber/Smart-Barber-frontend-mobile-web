import { View, StyleSheet } from 'react-native';
import { useController, type Control } from 'react-hook-form';
import { FormField, TextInput } from '@/shared/ui';

interface TimeRangeInputProps {
  control: Control<any>;
  startPath: string;
  endPath: string;
  disabled?: boolean;
}

/**
 * Par de inputs de horário (início / fim) integrado ao React Hook Form.
 * Reutilizável em jornada recorrente e exceções.
 */
export function TimeRangeInput({ control, startPath, endPath, disabled }: TimeRangeInputProps) {
  const { field: startField, fieldState: startState } = useController({ control, name: startPath });
  const { field: endField, fieldState: endState } = useController({ control, name: endPath });

  return (
    <View style={styles.row}>
      <View style={styles.field}>
        <FormField label="Início" error={startState.error?.message}>
          <TextInput
            value={startField.value ?? ''}
            onChangeText={startField.onChange}
            onBlur={startField.onBlur}
            placeholder="08:00"
            keyboardType="numeric"
            maxLength={5}
            editable={!disabled}
            accessibilityLabel="Horário de início"
          />
        </FormField>
      </View>
      <View style={styles.field}>
        <FormField label="Fim" error={endState.error?.message}>
          <TextInput
            value={endField.value ?? ''}
            onChangeText={endField.onChange}
            onBlur={endField.onBlur}
            placeholder="18:00"
            keyboardType="numeric"
            maxLength={5}
            editable={!disabled}
            accessibilityLabel="Horário de fim"
          />
        </FormField>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 12 },
  field: { flex: 1 },
});
