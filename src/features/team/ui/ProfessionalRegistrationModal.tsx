import React, { useState, useEffect } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ApiError } from '@/shared/api';
import { generateUuidV7 } from '@/shared/lib/uuidv7';
import {
  findOwnAttempt,
  closeOwnAttempt,
} from '@/shared/operations/operation-attempt.api';
import { useTheme } from '@/shared/theme';
import { Alert, Button, FormField, Text, TextInput } from '@/shared/ui';
import type { CreateBarberRegistrationResponse } from '../api/team.contract';
import { normalizeTeamError } from '../lib/normalize-team-error';
import { useCreateBarberRegistrationMutation } from '../model/use-team';

interface ProfessionalRegistrationModalProps {
  visible: boolean;
  shopId: string;
  onClose: () => void;
  onSuccess?: () => void;
}

interface SubmittedPayload {
  name: string;
  cpf: string;
  email: string;
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

  // Estados de resiliência e reconciliação
  const [currentRequestId, setCurrentRequestId] = useState<string | null>(null);
  const [lastSubmittedPayload, setLastSubmittedPayload] =
    useState<SubmittedPayload | null>(null);
  const [uncertainState, setUncertainState] = useState(false);
  const [isReconciling, setIsReconciling] = useState(false);

  const createRegistrationMutation = useCreateBarberRegistrationMutation();

  useEffect(() => {
    // Ao trocar de unidade, reseta estado completo para evitar vazamento entre unidades
    resetForm();
  }, [shopId]);

  const resetForm = () => {
    setStep('form');
    setName('');
    setCpf('');
    setEmail('');
    setErrorMessage(null);
    setSuccessData(null);
    setCurrentRequestId(null);
    setLastSubmittedPayload(null);
    setUncertainState(false);
    setIsReconciling(false);
  };

  const handleClose = () => {
    if (step === 'success') {
      resetForm();
    } else {
      // Limpa mensagem de erro transitória ao fechar
      setErrorMessage(null);
    }
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
    setUncertainState(false);
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

  const handleReconcile = async () => {
    if (!currentRequestId) return;
    setIsReconciling(true);
    setErrorMessage(null);

    try {
      const attempt = await findOwnAttempt(currentRequestId);

      if (attempt.state === 'APPLIED') {
        const resultData =
          (attempt.resource?.data ?? attempt.resource) as CreateBarberRegistrationResponse;
        setSuccessData(
          resultData || {
            registrationId: attempt.resource?.id || '',
            email: email.trim().toLowerCase(),
            requiresExistingAccountLogin: false,
            deliveryStatus: 'PENDING',
          },
        );
        setStep('success');
        setUncertainState(false);
        setCurrentRequestId(null);
        setLastSubmittedPayload(null);
        onSuccess?.();
        return;
      }

      if (attempt.state === 'PENDING') {
        setErrorMessage(
          'A solicitação ainda está sendo processada no servidor. Aguarde alguns instantes antes de reenviar.',
        );
        return;
      }

      if (attempt.state === 'NOT_APPLIED') {
        setErrorMessage(
          'A operação anterior não foi aplicada. Você pode tentar reenviar agora.',
        );
        setUncertainState(false);
        const newKey = generateUuidV7();
        setCurrentRequestId(newKey);
        return;
      }

      // UNKNOWN (ex: 404)
      setErrorMessage(
        'Situação ainda não confirmada no servidor. É seguro reenviar com a mesma chave.',
      );
    } catch (err: unknown) {
      setErrorMessage(
        'Falha ao verificar situação no servidor. Tente novamente ou reenvie.',
      );
    } finally {
      setIsReconciling(false);
    }
  };

  const handleSubmit = async () => {
    setErrorMessage(null);
    const cleanCpf = cpf.replace(/\D/g, '');
    const cleanEmail = email.trim().toLowerCase();
    const cleanName = name.trim();

    let targetKey = currentRequestId;

    // 1. Verifica se houve alteração do payload em relação à submissão anterior
    const isPayloadModified =
      lastSubmittedPayload !== null &&
      (lastSubmittedPayload.name !== cleanName ||
        lastSubmittedPayload.cpf !== cleanCpf ||
        lastSubmittedPayload.email !== cleanEmail);

    if (isPayloadModified && targetKey) {
      // Política explícita: encerra tentativa anterior e gera nova chave
      void closeOwnAttempt(targetKey).catch(() => {});
      targetKey = generateUuidV7();
      setCurrentRequestId(targetKey);
      setLastSubmittedPayload({
        name: cleanName,
        cpf: cleanCpf,
        email: cleanEmail,
      });
      setUncertainState(false);
    } else if (!targetKey) {
      targetKey = generateUuidV7();
      setCurrentRequestId(targetKey);
      setLastSubmittedPayload({
        name: cleanName,
        cpf: cleanCpf,
        email: cleanEmail,
      });
    } else {
      // 2. Mesma chave e mesmo payload após timeout/erro: reconciliação proativa
      setIsReconciling(true);
      try {
        const attempt = await findOwnAttempt(targetKey);
        if (attempt.state === 'APPLIED') {
          const resultData =
            (attempt.resource?.data ?? attempt.resource) as CreateBarberRegistrationResponse;
          setSuccessData(
            resultData || {
              registrationId: attempt.resource?.id || '',
              email: cleanEmail,
              requiresExistingAccountLogin: false,
              deliveryStatus: 'PENDING',
            },
          );
          setStep('success');
          setUncertainState(false);
          setCurrentRequestId(null);
          setLastSubmittedPayload(null);
          onSuccess?.();
          return;
        }

        if (attempt.state === 'PENDING') {
          setErrorMessage(
            'A solicitação ainda está sendo processada no servidor. Aguarde alguns instantes.',
          );
          return;
        }

        if (attempt.state === 'NOT_APPLIED') {
          targetKey = generateUuidV7();
          setCurrentRequestId(targetKey);
          setUncertainState(false);
        }
      } catch {
        // Se a consulta falhar, prossegue com o reenvio seguro usando targetKey existente
      } finally {
        setIsReconciling(false);
      }
    }

    try {
      const response = await createRegistrationMutation.mutateAsync({
        shopId,
        payload: {
          name: cleanName,
          cpf: cleanCpf,
          email: cleanEmail,
        },
        idempotencyKey: targetKey,
      });

      setSuccessData(response);
      setStep('success');
      setUncertainState(false);
      setCurrentRequestId(null);
      setLastSubmittedPayload(null);
      onSuccess?.();
    } catch (err: unknown) {
      const isTimeout =
        (err instanceof ApiError && (err.isNetworkError || err.status === 0)) ||
        (err as any)?.name === 'AbortError' ||
        String((err as any)?.message).toLowerCase().includes('timeout');

      if (isTimeout) {
        setUncertainState(true);
        setErrorMessage(
          'A resposta do servidor demorou mais que o esperado (timeout). O cadastro pode estar em processamento. Os dados e a chave de segurança foram preservados.',
        );
        // Preserva o formulário e permanece na etapa de revisão para permitir retry seguro
      } else {
        setUncertainState(false);
        const normalized = normalizeTeamError(err);
        if (normalized.code === 'IDENTITY_CONFLICT') {
          setErrorMessage(
            'Os dados informados conflitam com um cadastro existente (CPF ou e-mail já vinculados a outra conta).',
          );
        } else if (normalized.code === 'ALREADY_A_MEMBER') {
          setErrorMessage('Este profissional já é membro ativo desta barbearia.');
        } else if (normalized.code === 'PENDING_INVITATION_EXISTS') {
          setErrorMessage('Já existe um convite pendente para este e-mail.');
        } else {
          setErrorMessage(normalized.message);
        }
        setStep('form');
      }
    }
  };

  const isSubmitting = createRegistrationMutation.isPending || isReconciling;

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
                ? 'Cadastro Concluído'
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
                <Alert
                  variant={uncertainState ? 'warning' : 'error'}
                  title={uncertainState ? 'Situação em Processamento' : 'Atenção'}
                  message={errorMessage}
                />
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
                    editable={!isSubmitting}
                  />
                </FormField>

                <FormField label="CPF">
                  <TextInput
                    value={cpf}
                    onChangeText={handleCpfChange}
                    placeholder="000.000.000-00"
                    keyboardType="numeric"
                    maxLength={14}
                    editable={!isSubmitting}
                  />
                </FormField>

                <FormField label="E-mail">
                  <TextInput
                    value={email}
                    onChangeText={setEmail}
                    placeholder="carlos@exemplo.com"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    editable={!isSubmitting}
                  />
                </FormField>

                <View style={[styles.actionsRow, { marginTop: spacing[4] }]}>
                  <Button
                    title="Cancelar"
                    variant="outline"
                    onPress={handleClose}
                    disabled={isSubmitting}
                    style={{ flex: 1, marginRight: 8 }}
                  />
                  <Button
                    title="Continuar"
                    variant="primary"
                    onPress={handleProceedToReview}
                    disabled={isSubmitting}
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

                {uncertainState && currentRequestId && (
                  <View style={{ marginTop: spacing[2] }}>
                    <Button
                      title={
                        isReconciling
                          ? 'Consultando servidor...'
                          : 'Verificar Situação no Servidor'
                      }
                      variant="outline"
                      loading={isReconciling}
                      disabled={isSubmitting}
                      onPress={handleReconcile}
                    />
                  </View>
                )}

                <View style={[styles.actionsRow, { marginTop: spacing[4] }]}>
                  <Button
                    title="Voltar e Editar"
                    variant="outline"
                    disabled={isSubmitting}
                    onPress={() => setStep('form')}
                    style={{ flex: 1, marginRight: 8 }}
                  />
                  <Button
                    title={
                      uncertainState
                        ? 'Reenviar com Segurança'
                        : 'Confirmar e Enviar'
                    }
                    variant="primary"
                    loading={isSubmitting}
                    disabled={isSubmitting}
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
                ) : successData.deliveryStatus === 'ACCEPTED' ? (
                  <Alert
                    variant="success"
                    title="Convite Enviado com Sucesso"
                    message={`Enviamos um link de ativação para ${successData.email}. O profissional deverá definir sua senha para começar a atender.`}
                  />
                ) : (
                  <Alert
                    variant="success"
                    title="Cadastro Realizado com Sucesso"
                    message={`Perfil cadastrado para ${successData.email}. O envio do convite por e-mail está na fila e será entregue em instantes.`}
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
