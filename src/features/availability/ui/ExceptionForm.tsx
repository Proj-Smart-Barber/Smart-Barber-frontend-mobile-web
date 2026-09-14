import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Card, FormField, TextInput, Text } from '@/shared/ui';
import { DatePickerInput } from './DatePickerInput';
import { maskTimeInput } from './input-masks';
import { useTheme } from '@/shared/theme';
import {
  availabilityExceptionSchema,
  type AvailabilityExceptionFormValues,
} from '../model/availability.schema';

interface ExceptionFormProps {
  onSubmit: (values: AvailabilityExceptionFormValues) => Promise<boolean>;
  disabled?: boolean;
  mode?: 'create' | 'edit';
  initialValues?: AvailabilityExceptionFormValues;
  onCancelEdit?: () => void;
}

const EMPTY_VALUES: AvailabilityExceptionFormValues = {
  date: '',
  barbermanId: null,
  openTime: null,
  closeTime: null,
  reason: null,
};

/**
 * Formulário inline para criação e edição de exceções.
 * openTime/closeTime são opcionais: ambos nulos bloqueiam o dia inteiro;
 * ambos preenchidos representam um bloqueio/horário especial parcial.
 */
export function ExceptionForm({
  onSubmit,
  disabled,
  mode = 'create',
  initialValues,
  onCancelEdit,
}: ExceptionFormProps) {
  const isEdit = mode === 'edit';
  const [open, setOpen] = useState(isEdit);
  const { colors, spacing, radius } = useTheme();

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AvailabilityExceptionFormValues>({
    resolver: zodResolver(availabilityExceptionSchema),
    defaultValues: initialValues ?? EMPTY_VALUES,
  });

  function closeForm() {
    reset(initialValues ?? EMPTY_VALUES);

    if (isEdit) {
      onCancelEdit?.();
      return;
    }

    setOpen(false);
  }

  async function handleSave(values: AvailabilityExceptionFormValues) {
    const saved = await onSubmit(values);
    if (!saved) return;

    reset(EMPTY_VALUES);

    if (isEdit) {
      onCancelEdit?.();
      return;
    }

    setOpen(false);
  }

  if (!open) {
    return (
      <Button
        title="Adicionar exceção"
        variant="outline"
        leftIcon={<Ionicons name="add" size={20} color={colors.brand.primary} />}
        onPress={() => setOpen(true)}
        disabled={disabled}
        style={styles.openButton}
      />
    );
  }

  return (
    <Card
      elevated
      style={[
        styles.container,
        {
          borderColor: isEdit ? colors.border.selected : colors.border.subtle,
          borderRadius: radius.lg,
          padding: spacing[5],
        },
      ]}
    >
      <View style={styles.header}>
        <View
          style={[
            styles.headerIcon,
            {
              backgroundColor: colors.surface.selected,
              borderRadius: radius.md,
            },
          ]}
        >
          <Ionicons
            name={isEdit ? 'create-outline' : 'calendar-outline'}
            size={20}
            color={colors.brand.primary}
          />
        </View>
        <View style={styles.headerCopy}>
          <Text variant="h3" color={colors.text.primary}>
            {isEdit ? 'Editar exceção' : 'Nova exceção'}
          </Text>
          <Text variant="caption" color={colors.text.secondary}>
            {isEdit
              ? 'Atualize a data, o período ou o motivo desta exceção.'
              : 'Ajuste uma data sem alterar a jornada semanal.'}
          </Text>
        </View>
      </View>

      <View
        style={[
          styles.helperBox,
          {
            backgroundColor: colors.surface.default,
            borderColor: colors.border.subtle,
            borderRadius: radius.md,
          },
        ]}
      >
        <Ionicons name="information-circle-outline" size={18} color={colors.text.secondary} />
        <Text variant="caption" color={colors.text.secondary} style={styles.helperText}>
          Deixe abertura e fechamento vazios para fechar a unidade durante o dia inteiro.
        </Text>
      </View>

      <Controller
        control={control}
        name="date"
        render={({ field }) => (
          <FormField
            label="Data"
            required
            error={errors.date?.message}
            helperText="Formato: AAAA-MM-DD"
          >
            <DatePickerInput
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              disabled={disabled}
            />
          </FormField>
        )}
      />

      <View style={styles.timeFields}>
        <View style={styles.timeField}>
          <Controller
            control={control}
            name="openTime"
            render={({ field }) => (
              <FormField label="Abertura" error={errors.openTime?.message}>
                <TextInput
                  value={field.value ?? ''}
                  onChangeText={(v) => {
                    const masked = maskTimeInput(v);
                    field.onChange(masked === '' ? null : masked);
                  }}
                  onBlur={field.onBlur}
                  placeholder="08:00"
                  keyboardType="numeric"
                  maxLength={5}
                  editable={!disabled}
                  accessibilityLabel="Horário de abertura da exceção"
                  leftIcon={
                    <Ionicons name="time-outline" size={18} color={colors.text.secondary} />
                  }
                  inputStyle={styles.numericInput}
                />
              </FormField>
            )}
          />
        </View>

        <View style={styles.timeField}>
          <Controller
            control={control}
            name="closeTime"
            render={({ field }) => (
              <FormField label="Fechamento" error={errors.closeTime?.message}>
                <TextInput
                  value={field.value ?? ''}
                  onChangeText={(v) => {
                    const masked = maskTimeInput(v);
                    field.onChange(masked === '' ? null : masked);
                  }}
                  onBlur={field.onBlur}
                  placeholder="14:00"
                  keyboardType="numeric"
                  maxLength={5}
                  editable={!disabled}
                  accessibilityLabel="Horário de fechamento da exceção"
                  leftIcon={
                    <Ionicons name="time-outline" size={18} color={colors.text.secondary} />
                  }
                  inputStyle={styles.numericInput}
                />
              </FormField>
            )}
          />
        </View>
      </View>

      <Controller
        control={control}
        name="reason"
        render={({ field }) => (
          <FormField label="Motivo (opcional)">
            <TextInput
              value={field.value ?? ''}
              onChangeText={(v) => field.onChange(v === '' ? null : v)}
              onBlur={field.onBlur}
              placeholder="Feriado, folga, manutenção..."
              editable={!disabled}
              accessibilityLabel="Motivo da exceção"
              leftIcon={
                <Ionicons name="document-text-outline" size={18} color={colors.text.secondary} />
              }
            />
          </FormField>
        )}
      />

      <View style={styles.actions}>
        <Button
          title="Cancelar"
          variant="ghost"
          onPress={closeForm}
          disabled={disabled}
          style={styles.cancelButton}
        />
        <Button
          title={isEdit ? 'Salvar edição' : 'Salvar exceção'}
          variant="primary"
          leftIcon={<Ionicons name="checkmark" size={20} color={colors.text.inverse} />}
          onPress={handleSubmit(handleSave)}
          loading={disabled}
          disabled={disabled}
          style={styles.saveButton}
        />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  openButton: { width: '100%' },
  container: { gap: 16, borderWidth: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerIcon: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerCopy: { flex: 1, gap: 2 },
  helperBox: {
    minHeight: 52,
    padding: 12,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  helperText: { flex: 1 },
  timeFields: { flexDirection: 'row', gap: 12 },
  timeField: { flex: 1, minWidth: 0 },
  numericInput: { fontVariant: ['tabular-nums'] },
  actions: { flexDirection: 'row', gap: 8, justifyContent: 'flex-end', marginTop: 4 },
  cancelButton: { flex: 1 },
  saveButton: { flex: 1.35 },
});
