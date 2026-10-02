import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/shared/theme';
import { Text, TextInput, FormField, Button, Alert } from '@/shared/ui';
import { LiquidGlassView } from '@/shared/navigation/LiquidGlassView';
import type { Service } from '../model/service.types';
import { parsePriceToCents } from '../model/service.types';
import { serviceFormSchema } from '../model/service.schema';

export interface ServiceFormModalProps {
  visible: boolean;
  onClose: () => void;
  serviceToEdit?: Service | null;
  onSubmit: (values: {
    title: string;
    description?: string | null;
    priceInCents: number;
    durationInMinutes: number;
  }) => Promise<void>;
  isLoading?: boolean;
}

export function ServiceFormModal({
  visible,
  onClose,
  serviceToEdit,
  onSubmit,
  isLoading = false,
}: ServiceFormModalProps) {
  const { colors, spacing, radius, components } = useTheme();

  const [title, setTitle] = useState('');
  const [price, setPrice] = useState('');
  const [durationInMinutes, setDurationInMinutes] = useState('30');
  const [description, setDescription] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      if (serviceToEdit) {
        setTitle(serviceToEdit.title);
        setPrice((serviceToEdit.priceInCents / 100).toFixed(2).replace('.', ','));
        setDurationInMinutes(String(serviceToEdit.durationInMinutes));
        setDescription(serviceToEdit.description || '');
      } else {
        setTitle('');
        setPrice('');
        setDurationInMinutes('30');
        setDescription('');
      }
      setErrors({});
      setSubmitError(null);
    }
  }, [visible, serviceToEdit]);

  const handleSave = async () => {
    setErrors({});
    setSubmitError(null);

    const validation = serviceFormSchema.safeParse({
      title,
      price,
      durationInMinutes: Number(durationInMinutes),
      description: description || undefined,
    });

    if (!validation.success) {
      const fieldErrors: Record<string, string> = {};
      validation.error.errors.forEach((err) => {
        if (err.path[0]) {
          fieldErrors[String(err.path[0])] = err.message;
        }
      });
      setErrors(fieldErrors);
      return;
    }

    const priceInCents = parsePriceToCents(price);
    const duration = parseInt(durationInMinutes, 10);
    const cleanDesc = description.trim();

    try {
      await onSubmit({
        title: title.trim(),
        description: cleanDesc ? cleanDesc : (serviceToEdit ? null : undefined),
        priceInCents,
        durationInMinutes: duration,
      });
    } catch (err: any) {
      setSubmitError(
        err?.message || 'Falha ao salvar serviço. Verifique os dados informados.',
      );
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{
          flex: 1,
          backgroundColor: colors.background.overlay,
          justifyContent: 'center',
          alignItems: 'center',
          padding: spacing[4],
        }}
      >
        <LiquidGlassView
          variant="form"
          elevated
          style={{
            width: '100%',
            maxWidth: 520,
            maxHeight: '90%',
            borderRadius: radius.xl,
            overflow: 'hidden',
          }}
        >
          {/* Header */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: spacing[6],
              paddingVertical: spacing[5],
              borderBottomWidth: 1,
              borderBottomColor: colors.border.default,
            }}
          >
            <Text variant="h2" weight="bold" color={colors.text.primary}>
              {serviceToEdit ? 'Editar Serviço' : 'Novo Serviço'}
            </Text>

            <Pressable
              onPress={onClose}
              disabled={isLoading}
              accessibilityRole="button"
              accessibilityLabel="Fechar formulário"
              hitSlop={8}
              style={({ pressed }) => ({
                minWidth: 44,
                minHeight: 44,
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: radius.full,
                backgroundColor: pressed
                  ? colors.surface.selected
                  : 'transparent',
              })}
            >
              <Ionicons name="close" size={22} color={colors.text.secondary} />
            </Pressable>
          </View>

          {/* Form Body */}
          <ScrollView
            contentContainerStyle={{
              padding: spacing[6],
              gap: spacing[4],
            }}
            keyboardShouldPersistTaps="handled"
          >
            {submitError && (
              <Alert
                message={submitError}
                variant="error"
              />
            )}

            <FormField
              label="Nome do serviço *"
              error={errors.title}
              helperText="Ex: Corte Degrade, Barboterapia, Barba Clássica"
            >
              <TextInput
                value={title}
                onChangeText={setTitle}
                placeholder="Ex: Corte Degrade Navalhado"
                editable={!isLoading}
                maxLength={100}
              />
            </FormField>

            <View
              style={{
                flexDirection: 'row',
                gap: spacing[3],
              }}
            >
              <View style={{ flex: 1 }}>
                <FormField
                  label="Preço (R$) *"
                  error={errors.price}
                  helperText="Valor cobrado"
                >
                  <TextInput
                    value={price}
                    onChangeText={setPrice}
                    placeholder="45,00"
                    keyboardType="numeric"
                    editable={!isLoading}
                  />
                </FormField>
              </View>

              <View style={{ flex: 1 }}>
                <FormField
                  label="Duração (min) *"
                  error={errors.durationInMinutes}
                  helperText="Tempo em minutos"
                >
                  <TextInput
                    value={durationInMinutes}
                    onChangeText={setDurationInMinutes}
                    placeholder="30"
                    keyboardType="number-pad"
                    editable={!isLoading}
                    maxLength={3}
                  />
                </FormField>
              </View>
            </View>

            <FormField
              label="Descrição detalhada"
              error={errors.description}
              helperText="Opcional. Conte ao cliente o que está incluso no serviço."
            >
              <TextInput
                value={description}
                onChangeText={setDescription}
                placeholder="Ex: Inclui lavagem com shampoo refrescante, finalização com pomada e toalha quente."
                multiline
                numberOfLines={3}
                style={{ minHeight: 80, textAlignVertical: 'top' }}
                editable={!isLoading}
                maxLength={500}
              />
            </FormField>

            {/* Ações */}
            <View
              style={{
                flexDirection: 'row',
                gap: spacing[3],
                marginTop: spacing[2],
                justifyContent: 'flex-end',
              }}
            >
              <Button
                title="Cancelar"
                variant="outline"
                onPress={onClose}
                disabled={isLoading}
                style={{ flex: 1 }}
              />

              <Button
                title={serviceToEdit ? 'Atualizar Serviço' : 'Criar Serviço'}
                variant="primary"
                onPress={handleSave}
                loading={isLoading}
                style={{ flex: 1 }}
              />
            </View>
          </ScrollView>
        </LiquidGlassView>
      </KeyboardAvoidingView>
    </Modal>
  );
}
