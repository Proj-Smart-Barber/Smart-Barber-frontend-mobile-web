import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { registerSchema, RegisterFormValues } from './register.schema';
import { useSession } from './use-session';
import { NormalizedAuthError } from '../lib/normalize-auth-error';

export function useRegisterViewModel() {
  const { signUp, status, clearError } = useSession();
  const [submitError, setSubmitError] = useState<string | null>(null);

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

  const isSubmitting = form.formState.isSubmitting || status === 'authenticating';

  const onSubmit = form.handleSubmit(async (values) => {
    if (isSubmitting) return; // Previne double-submit

    setSubmitError(null);
    clearError();

    try {
      await signUp(values);
    } catch (err: any) {
      const normalized: NormalizedAuthError = err;
      setSubmitError(normalized.message || 'Falha ao criar conta. Tente novamente.');
    }
  });

  return {
    control: form.control,
    errors: form.formState.errors,
    isValid: form.formState.isValid,
    isSubmitting,
    submitError,
    setSubmitError,
    setValue: form.setValue,
    onSubmit,
  };
}
