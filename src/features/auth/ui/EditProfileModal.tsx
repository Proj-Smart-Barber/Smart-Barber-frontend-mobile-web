import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  ScrollView,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { useTheme } from '@/shared/theme';
import { Button, Text, Alert, FormField, TextInput, Badge } from '@/shared/ui';
import { LiquidGlassView } from '@/shared/navigation/LiquidGlassView';
import { formatPhoneNumber, sanitizePhoneNumber } from '@/shared/lib/phone-format';
import { authApi } from '../api/auth.api';
import { useSession } from '../model/use-session';

export interface EditProfileModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function EditProfileModal({ visible, onClose, onSuccess }: EditProfileModalProps) {
  const { colors, spacing, radius } = useTheme();
  const queryClient = useQueryClient();
  const { identity, refreshIdentity } = useSession();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [formErrors, setFormErrors] = useState<{ name?: string; phone?: string }>({});

  useEffect(() => {
    if (visible) {
      setName(identity?.name || '');
      setPhone(identity?.phoneNumber ? formatPhoneNumber(identity.phoneNumber) : '');
      setApiError(null);
      setFormErrors({});
    }
  }, [visible, identity?.id, identity?.name, identity?.phoneNumber]);

  const handlePhoneChange = (text: string) => {
    const formatted = formatPhoneNumber(text);
    setPhone(formatted);
    if (formErrors.phone) {
      setFormErrors((prev) => ({ ...prev, phone: undefined }));
    }
  };

  const handleNameChange = (text: string) => {
    setName(text);
    if (formErrors.name) {
      setFormErrors((prev) => ({ ...prev, name: undefined }));
    }
  };

  const validate = (): boolean => {
    const errors: { name?: string; phone?: string } = {};
    const trimmedName = name.trim();

    if (!trimmedName || trimmedName.length < 2) {
      errors.name = 'Nome deve ter pelo menos 2 caracteres.';
    } else if (trimmedName.length > 100) {
      errors.name = 'Nome deve ter no máximo 100 caracteres.';
    }

    const cleanPhone = sanitizePhoneNumber(phone);
    if (cleanPhone.length > 0 && (cleanPhone.length < 10 || cleanPhone.length > 11)) {
      errors.phone = 'Telefone deve conter DDD e 8 ou 9 dígitos.';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    if (isSubmitting) return;
    if (!validate()) return;

    setIsSubmitting(true);
    setApiError(null);

    try {
      const cleanPhone = sanitizePhoneNumber(phone);
      await authApi.updateProfile({
        name: name.trim(),
        phoneNumber: cleanPhone.length > 0 ? cleanPhone : null,
      });

      await refreshIdentity();
      queryClient.invalidateQueries({ queryKey: ['user', 'profile'] });
      onSuccess?.();
      onClose();
    } catch (err: any) {
      setApiError(
        err?.response?.data?.message ||
          err?.message ||
          'Falha ao atualizar perfil. Tente novamente mais tarde.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={isSubmitting ? undefined : onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.overlay}
      >
        <LiquidGlassView
          variant="form"
          elevated
          autoHeight={false}
          borderRadius={radius.xl}
          style={styles.cardContainer}
        >
          {/* Header */}
          <View
            style={[
              styles.header,
              { borderBottomColor: colors.border.subtle, padding: spacing[5] },
            ]}
          >
            <View style={{ flex: 1 }}>
              <Text variant="h3" weight="bold" color={colors.text.primary}>
                Editar Perfil
              </Text>
              <Text variant="caption" color={colors.text.secondary} style={{ marginTop: 2 }}>
                Atualize seu nome e telefone de contato
              </Text>
            </View>

            <Pressable
              onPress={onClose}
              disabled={isSubmitting}
              accessibilityRole="button"
              accessibilityLabel="Fechar formulário"
              hitSlop={8}
              style={({ pressed }) => [
                styles.closeButton,
                {
                  borderRadius: radius.full,
                  backgroundColor: pressed ? colors.surface.selected : 'transparent',
                },
              ]}
            >
              <Ionicons name="close" size={22} color={colors.text.secondary} />
            </Pressable>
          </View>

          {/* Form Content */}
          <ScrollView
            contentContainerStyle={[styles.formContent, { padding: spacing[5], gap: spacing[4] }]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {apiError ? (
              <Alert variant="error" message={apiError} style={{ marginBottom: spacing[2] }} />
            ) : null}

            {/* Nome Completo */}
            <FormField label="Nome completo" required error={formErrors.name}>
              <TextInput
                value={name}
                onChangeText={handleNameChange}
                placeholder="Ex: Lucas Andrade"
                editable={!isSubmitting}
                maxLength={100}
                autoCapitalize="words"
              />
            </FormField>

            {/* Telefone de Contato */}
            <FormField
              label="Telefone de contato"
              helperText="WhatsApp ou celular com DDD (opcional)"
              error={formErrors.phone}
            >
              <TextInput
                value={phone}
                onChangeText={handlePhoneChange}
                placeholder="(11) 99999-9999"
                keyboardType="phone-pad"
                editable={!isSubmitting}
                maxLength={15}
              />
            </FormField>

            {/* Campos Protegidos / Somente Leitura */}
            <View
              style={[
                styles.readOnlyBox,
                {
                  backgroundColor: colors.surface.input,
                  borderColor: colors.border.subtle,
                  borderRadius: radius.md,
                  padding: spacing[4],
                  gap: spacing[2],
                },
              ]}
            >
              <View style={styles.readOnlyRow}>
                <View style={{ flex: 1, minWidth: 0, marginRight: 8 }}>
                  <Text variant="caption" color={colors.text.muted}>
                    E-mail da conta
                  </Text>
                  <Text variant="bodySm" weight="medium" color={colors.text.secondary}>
                    {identity?.email ? identity.email : 'Não informado'}
                  </Text>
                </View>
                <Badge label="Somente leitura" tone="neutral" size="sm" />
              </View>

              <Text variant="caption" color={colors.text.muted} style={{ fontSize: 11 }}>
                Este formulário permite alterar apenas o nome e o telefone de contato. O e-mail da conta não pode ser alterado por este formulário.
              </Text>
            </View>
          </ScrollView>

          {/* Footer Actions */}
          <View
            style={[
              styles.footer,
              { borderTopColor: colors.border.subtle, padding: spacing[5], gap: spacing[3] },
            ]}
          >
            <Button
              title="Cancelar"
              variant="ghost"
              onPress={onClose}
              disabled={isSubmitting}
              style={{ flex: 1 }}
            />
            <Button
              title={isSubmitting ? 'Salvando alterações…' : 'Salvar alterações'}
              variant="primary"
              loading={isSubmitting}
              disabled={isSubmitting}
              onPress={handleSave}
              style={{ flex: 1 }}
            />
          </View>
        </LiquidGlassView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  cardContainer: {
    width: '100%',
    maxWidth: 480,
    maxHeight: '85%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
  },
  closeButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  formContent: {
    flexGrow: 1,
  },
  readOnlyBox: {
    borderWidth: 1,
    marginTop: 4,
  },
  readOnlyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
  },
});
