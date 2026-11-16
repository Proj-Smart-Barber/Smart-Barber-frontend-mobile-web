import { StyleSheet, View } from 'react-native';
import { useController, useFormContext } from 'react-hook-form';
import { FormField, TextInput, Text } from '../../../shared/ui';
import { maskTimeInput } from './input-masks';
/**
 * Par de inputs de horário integrado ao React Hook Form via useFormContext.
 * Não recebe Control como prop — usa o contexto do FormProvider do pai.
 * A máscara mantém o valor final em HH:mm, exatamente como o contrato da API.
 */
export function TimeRangeInput({ startPath, endPath, disabled }) {
    var _a, _b, _c, _d;
    const { control } = useFormContext();
    const { field: startField, fieldState: startState } = useController({ control, name: startPath });
    const { field: endField, fieldState: endState } = useController({ control, name: endPath });
    return (<View style={styles.row}>
      <View style={styles.field}>
        <FormField label="Início" error={(_a = startState.error) === null || _a === void 0 ? void 0 : _a.message}>
          <TextInput value={(_b = startField.value) !== null && _b !== void 0 ? _b : ''} onChangeText={(value) => startField.onChange(maskTimeInput(value))} onBlur={startField.onBlur} placeholder="HH:mm" keyboardType="numeric" maxLength={5} editable={!disabled} accessibilityLabel="Horário de início" inputStyle={styles.numericInput}/>
        </FormField>
      </View>

      <View style={styles.connector} accessibilityElementsHidden>
        <Text variant="caption">até</Text>
      </View>

      <View style={styles.field}>
        <FormField label="Fim" error={(_c = endState.error) === null || _c === void 0 ? void 0 : _c.message}>
          <TextInput value={(_d = endField.value) !== null && _d !== void 0 ? _d : ''} onChangeText={(value) => endField.onChange(maskTimeInput(value))} onBlur={endField.onBlur} placeholder="HH:mm" keyboardType="numeric" maxLength={5} editable={!disabled} accessibilityLabel="Horário de fim" inputStyle={styles.numericInput}/>
        </FormField>
      </View>
    </View>);
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
