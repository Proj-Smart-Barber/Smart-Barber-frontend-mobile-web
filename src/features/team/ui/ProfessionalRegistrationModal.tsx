import React, { useState } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { generateUuidV7 } from '@/shared/lib/uuidv7';
import { useTheme } from '@/shared/theme';
import { Alert, Button, FormField, Text, TextInput } from '@/shared/ui';
import type { CreateBarberRegistrationResponse } from '../api/team.contract';
import { useCreateBarberRegistrationMutation } from '../model/use-team';

interface ProfessionalRegistrationModalProps {
  visible: boolean;
  shopId: string;
  onClose: () => void;
  onSuccess?: () => void;
}

export function ProfessionalRegistrationModal({
  visible,
  shopId,
  onClose,
  onSuccess,
}: ProfessionalRegistrationModalProps) {
  const { colors, spacing, radius } = useTheme();

  const [step, setStep] = useState<'form' | 'review' | 'success'>('form');
  const [name, setName] = useState('');
  const [cpf, setCpf] = useState('');
  const [email, setEmail] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successData, setSuccessData] =
    useState<CreateBarberRegistrationResponse | null>(null);

  const createRegistrationMutation = useCreateBarberRegistrationMutation();

  const resetForm = () => {
    setStep('form');
    setName('');
    setCpf('');
    setEmail('');
    setErrorMessage(null);
    setSuccessData(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  // Aplica máscara de CPF: 000.000.000-00
  const handleCpfChange = (val: string) => {
    const digits = val.replace(/\D/g, '').slice(0, 11);
    let masked = digits;
    if (digits.length > 9) {
      masked = `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
    } else if (digits.length > 6) {
      masked = `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
    } else if (digits.length > 3) {
      masked = `${digits.slice(0, 3)}.${digits.slice(3)}`;
    }
    setCpf(masked);
  };

  const handleProceedToReview = () => {
    setErrorMessage(null);
    if (!name.trim() || name.trim().length < 2) {
      setErrorMessage('Informe o nome completo do profissional.');
      return;
    }
    const cleanCpf = cpf.replace(/\D/g, '');
    if (cleanCpf.length !== 11) {
      setErrorMessage('O CPF deve conter 11 dígitos.');
      return;
    }
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      setErrorMessage('Informe um e-mail válido.');
      return;
    }
    setStep('review');
  };

  const handleSubmit = async () => {
    setErrorMessage(null);
    const cleanCpf = cpf.replace(/\D/g, '');
    const cleanEmail = email.trim().toLowerCase();
    const idempotencyKey = generateUuidV7();

    try {
      const response = await createRegistrationMutation.mutateAsync({
        shopId,
        payload: {
          name: name.trim(),
          cpf: cleanCpf,
          email: cleanEmail,
        },
        idempotencyKey,
      });

      setSuccessData(response);
      setStep('success');
      onSuccess?.();
    } catch (err: any) {
      const code = err?.response?.data?.code || err?.code;
      if (code === 'IDENTITY_CONFLICT') {
        setErrorMessage(
          'Os dados informados conflitam com um cadastro existente (CPF ou e-mail já vinculados a outra conta).',
        );
      } else if (code === 'ALREADY_A_MEMBER') {
        setErrorMessage('Este profissional já é membro ativo desta barbearia.');
      } else if (code === 'PENDING_INVITATION_EXISTS') {
        setErrorMessage('Já existe um convite pendente para este e-mail.');
      } else {
        const msg =
          err?.response?.data?.message ||
          err?.message ||
          'Falha ao iniciar o cadastro profissional.';
        setErrorMessage(msg);
      }
      setStep('form');
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View style={styles.modalOverlay}>
        <View
          style={[
            styles.modalContent,
            {
              backgroundColor: colors.surface.elevated,
              borderColor: colors.border.subtle,
              borderRadius: radius.xl,
              padding: spacing[5],
            },
          ]}
        >
          {/* Header */}
          <View style={styles.modalHeader}>
            <Text variant="h3" weight="bold" color={colors.text.primary}>
              {step === 'success'
                ? 'Convite Enviado'
                : step === 'review'
                ? 'Revisar Cadastro'
                : 'Novo Barbeiro'}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Fechar"
              onPress={handleClose}
              style={styles.closeBtn}
            >
              <Ionicons name="close" size={24} color={colors.text.muted} />
            </Pressable>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingVertical: spacing[2] }}
          >
            {errorMessage ? (
              <View style={{ marginBottom: spacing[4] }}>
                <Alert variant="error" title="Atenção" message={errorMessage} />
              </View>
            ) : null}

            {step === 'form' && (
              <View style={{ gap: spacing[3] }}>
                <Text variant="bodySm" color={colors.text.secondary}>
                  Cadastre as informações do profissional para enviar o convite
                  de acesso à equipe desta unidade.
                </Text>

                <FormField label="Nome Completo">
                  <TextInput
                    value={name}
                    onChangeText={setName}
                    placeholder="Ex: Carlos Silva"
                  />
                </FormField>

                <FormField label="CPF">
                  <TextInput
                    value={cpf}
                    onChangeText={handleCpfChange}
                    placeholder="000.000.000-00"
                    keyboardType="numeric"
                    maxLength={14}
                  />
                </FormField>

                <FormField label="E-mail">
                  <TextInput
                    value={email}
                    onChangeText={setEmail}
                    placeholder="carlos@exemplo.com"
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </FormField>

                <View style={[styles.actionsRow, { marginTop: spacing[4] }]}>
                  <Button
                    title="Cancelar"
                    variant="outline"
                    onPress={handleClose}
                    style={{ flex: 1, marginRight: 8 }}
                  />
                  <Button
                    title="Continuar"
                    variant="primary"
                    onPress={handleProceedToReview}
                    style={{ flex: 1 }}
                  />
                </View>
              </View>
            )}

            {step === 'review' && (
              <View style={{ gap: spacing[3] }}>
                <Text variant="bodySm" color={colors.text.secondary}>
                  Revise atentamente os dados antes de enviar o convite. O CPF e o
                  e-mail devem pertencer ao titular profissional.
                </Text>

                <View
                  style={[
                    styles.reviewBox,
                    {
                      backgroundColor: colors.background.card,
                      borderColor: colors.border.subtle,
                      borderRadius: radius.md,
                      padding: spacing[4],
                    },
                  ]}
                >
                  <View style={styles.reviewItem}>
                    <Text variant="caption" color={colors.text.muted}>
                      NOME
                    </Text>
                    <Text variant="body" weight="bold" color={colors.text.primary}>
                      {name}
                    </Text>
                  </View>

                  <View style={styles.reviewItem}>
                    <Text variant="caption" color={colors.text.muted}>
                      CPF
                    </Text>
                    <Text variant="body" weight="bold" color={colors.text.primary}>
                      {cpf}
                    </Text>
                  </View>

                  <View style={styles.reviewItem}>
                    <Text variant="caption" color={colors.text.muted}>
                      E-MAIL
                    </Text>
                    <Text variant="body" weight="bold" color={colors.text.primary}>
                      {email}
                    </Text>
                  </View>
                </View>

                <View style={[styles.actionsRow, { marginTop: spacing[4] }]}>
                  <Button
                    title="Voltar"
                    variant="outline"
                    disabled={createRegistrationMutation.isPending}
                    onPress={() => setStep('form')}
                    style={{ flex: 1, marginRight: 8 }}
                  />
                  <Button
                    title="Confirmar e Enviar"
                    variant="primary"
                    loading={createRegistrationMutation.isPending}
                    disabled={createRegistrationMutation.isPending}
                    onPress={handleSubmit}
                    style={{ flex: 1 }}
                  />
                </View>
              </View>
            )}

            {step === 'success' && successData && (
              <View style={{ gap: spacing[3] }}>
                {successData.requiresExistingAccountLogin ? (
                  <Alert
                    variant="info"
                    title="Conta Existente Detectada"
                    message="Este profissional já possui uma conta cadastrada no Smart Barber! Para ingressar na equipe, ele deve apenas entrar no aplicativo com as credenciais habituais e aceitar o convite recebido."
                  />
                ) : (
                  <Alert
                    variant="success"
                    title="Convite Enviado com Sucesso"
                    message={`Enviamos um link de ativação para ${successData.email}. O profissional deverá definir sua senha para começar a atender.`}
                  />
                )}

                <Button
                  title="Concluir"
                  variant="primary"
                  onPress={handleClose}
                  style={{ marginTop: spacing[4] }}
                />
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 480,
    maxHeight: '85%',
    borderWidth: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  closeBtn: {
    padding: 4,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reviewBox: {
    borderWidth: 1,
    gap: 12,
  },
  reviewItem: {
    gap: 2,
  },
});
