import { useState, useRef, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useRouter } from 'expo-router';
import { zodResolver } from '@hookform/resolvers/zod';
import { registerSchema, RegisterFormValues } from './register.schema';
import { useSession } from './use-session';
import { NormalizedAuthError } from '../lib/normalize-auth-error';

export function useRegisterViewModel(intent: 'OWNER' | 'CLIENT' = 'CLIENT') {
  const router = useRouter();
  const { signUp, status, clearError } = useSession();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isAmbiguousCreation, setIsAmbiguousCreation] = useState<boolean>(false);
  const [ambiguousEmail, setAmbiguousEmail] = useState<string>('');

  const isSubmittingRef = useRef<boolean>(false);

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: '',
      cpf: '',
      email: '',
      password: '',
      passwordConfirmation: '',
    },
    mode: 'onBlur',
  });

  // Limpa mensagens e estado de ambiguidade quando o usuário altera valores para uma nova tentativa
  useEffect(() => {
    const subscription = form.watch(() => {
      if (submitError) setSubmitError(null);
      if (isAmbiguousCreation) setIsAmbiguousCreation(false);
    });
    return () => subscription.unsubscribe();
  }, [form, submitError, isAmbiguousCreation]);

  const isSubmitting = form.formState.isSubmitting || status === 'authenticating';

  const onSubmit = form.handleSubmit(async (values) => {
    // Trava síncrona contra concorrência e duplo clique
    if (isSubmittingRef.current || isSubmitting) return;
    isSubmittingRef.current = true;

    setSubmitError(null);
    setIsAmbiguousCreation(false);
    clearError();

    const cleanEmail = values.email.trim().toLowerCase();

    try {
      const { emailSent } = await signUp(values, intent);
      if (emailSent) {
        router.push(
          `/(auth)/verify-email?email=${encodeURIComponent(cleanEmail)}&sent=1` as any,
        );
      } else {
        router.push(
          `/(auth)/verify-email?email=${encodeURIComponent(cleanEmail)}&sendFailed=1` as any,
        );
      }
    } catch (err: any) {
      const normalized: NormalizedAuthError = err;
      if (normalized.code === 'NETWORK_ERROR') {
        setIsAmbiguousCreation(true);
        setAmbiguousEmail(cleanEmail);
        setSubmitError(
          'Instabilidade na conexão durante a criação da conta. Não foi possível confirmar se a conta foi registrada no servidor. Verifique se consegue fazer login ou solicite o envio do link de confirmação.',
        );
      } else {
        setSubmitError(normalized.message || 'Falha ao criar conta. Tente novamente.');
      }
    } finally {
      isSubmittingRef.current = false;
    }
  });

  return {
    control: form.control,
    errors: form.formState.errors,
    isValid: form.formState.isValid,
    isSubmitting,
    submitError,
    setSubmitError,
    isAmbiguousCreation,
    ambiguousEmail,
    setValue: form.setValue,
    onSubmit,
  };
}
