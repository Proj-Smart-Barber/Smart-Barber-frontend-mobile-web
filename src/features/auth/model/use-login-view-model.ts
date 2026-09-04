import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, LoginFormValues } from './login.schema';
import { useSession } from './use-session';
import { NormalizedAuthError } from '../lib/normalize-auth-error';

export function useLoginViewModel() {
  const { signIn, status, clearError } = useSession();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
    mode: 'onBlur',
  });

  const isSubmitting = form.formState.isSubmitting || status === 'authenticating';

  const onSubmit = form.handleSubmit(async (values) => {
    if (isSubmitting) return; // Previne double submit

    setSubmitError(null);
    clearError();

    try {
      await signIn({
        email: values.email.trim(),
        password: values.password,
      });
    } catch (err: any) {
      const normalized: NormalizedAuthError = err;
      setSubmitError(normalized.message || 'Falha ao realizar login. Tente novamente.');
    }
  });

  return {
    control: form.control,
    errors: form.formState.errors,
    isValid: form.formState.isValid,
    isSubmitting,
    submitError,
    setSubmitError,
    onSubmit,
  };
}
