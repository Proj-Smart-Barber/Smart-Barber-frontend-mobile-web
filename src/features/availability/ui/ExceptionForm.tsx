import { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button, FormField, TextInput, Text } from '@/shared/ui';
import {
  availabilityExceptionSchema,
  type AvailabilityExceptionFormValues,
} from '../model/availability.schema';

interface ExceptionFormProps {
  onSubmit: (values: AvailabilityExceptionFormValues) => Promise<void>;
  disabled?: boolean;
}

/**
 * Formulário inline de cadastro de exceção.
 * openTime/closeTime são opcionais: se ambos ficarem em branco, o dia
 * inteiro é bloqueado (feriado, folga). Se preenchidos, representa um
 * horário customizado naquele dia.
 */
export function ExceptionForm({ onSubmit, disabled }: ExceptionFormProps) {
  const [open, setOpen] = useState(false);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AvailabilityExceptionFormValues>({
    resolver: zodResolver(availabilityExceptionSchema),
    defaultValues: {
      date: '',
      barbermanId: null,
      openTime: null,
      closeTime: null,
      reason: null,
    },
  });

  async function handleSave(values: AvailabilityExceptionFormValues) {
    await onSubmit(values);
    reset();
    setOpen(false);
  }

  if (!open) {
    return (
      <Button
        title="+ Nova exceção"
        variant="outline"
        onPress={() => setOpen(true)}
        disabled={disabled}
      />
    );
  }

  return (
    <View style={styles.container}>
      <Text variant="bodySm" weight="semibold">
        Nova exceção
      </Text>

      {/* Data */}
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
            <TextInput
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              placeholder="2026-12-25"
              keyboardType="numeric"
              maxLength={10}
              editable={!disabled}
              accessibilityLabel="Data da exceção"
            />
          </FormField>
        )}
      />

      {/* Horário de abertura */}
      <Controller
        control={control}
        name="openTime"
        render={({ field }) => (
          <FormField
            label="Abertura (opcional)"
            error={errors.openTime?.message}
            helperText="Deixe em branco para dia fechado"
          >
            <TextInput
              value={field.value ?? ''}
              onChangeText={(v) => field.onChange(v === '' ? null : v)}
              onBlur={field.onBlur}
              placeholder="08:00"
              keyboardType="numeric"
              maxLength={5}
              editable={!disabled}
              accessibilityLabel="Horário de abertura da exceção"
            />
          </FormField>
        )}
      />

      {/* Horário de fechamento */}
      <Controller
        control={control}
        name="closeTime"
        render={({ field }) => (
          <FormField
            label="Fechamento (opcional)"
            error={errors.closeTime?.message}
          >
            <TextInput
              value={field.value ?? ''}
              onChangeText={(v) => field.onChange(v === '' ? null : v)}
              onBlur={field.onBlur}
              placeholder="14:00"
              keyboardType="numeric"
              maxLength={5}
              editable={!disabled}
              accessibilityLabel="Horário de fechamento da exceção"
            />
          </FormField>
        )}
      />

      {/* Motivo */}
      <Controller
        control={control}
        name="reason"
        render={({ field }) => (
          <FormField label="Motivo (opcional)">
            <TextInput
              value={field.value ?? ''}
              onChangeText={(v) => field.onChange(v === '' ? null : v)}
              onBlur={field.onBlur}
              placeholder="Feriado nacional, consulta médica..."
              editable={!disabled}
              accessibilityLabel="Motivo da exceção"
            />
          </FormField>
        )}
      />

      <View style={styles.actions}>
        <Button
          title="Cancelar"
          variant="ghost"
          onPress={() => { reset(); setOpen(false); }}
          disabled={disabled}
        />
        <Button
          title="Salvar exceção"
          variant="primary"
          onPress={handleSubmit(handleSave)}
          loading={disabled}
          disabled={disabled}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 4,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'flex-end',
    marginTop: 8,
  },
});
