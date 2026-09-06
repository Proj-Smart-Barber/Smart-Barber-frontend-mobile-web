import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  resetPasswordSchema,
  ResetPasswordFormValues,
} from './reset-password.schema';
import {
  authExtensionRepository,
  IAuthExtensionRepository,
} from '../api';

interface UseResetPasswordOptions {
  defaultToken?: string;
  repository?: IAuthExtensionRepository;
}

export function useResetPasswordViewModel(options: UseResetPasswordOptions = {}) {
  const repository = options.repository ?? authExtensionRepository;
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const form = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      token: options.defaultToken || '',
      password: '',
      confirmPassword: '',
    },
    mode: 'onBlur',
  });

  const isSubmitting = form.formState.isSubmitting;

  const onSubmit = form.handleSubmit(async (values) => {
    if (isSubmitting) return;

    setSubmitError(null);

    try {
      const response = await repository.resetPassword({
        token: values.token.trim(),
        password: values.password,
      });
      setIsSuccess(true);
      setSuccessMessage(
        response.message || 'Sua nova senha foi gravada com sucesso!'
      );
    } catch (err: any) {
      setSubmitError(
        err.message || 'Falha ao redefinir a senha. Verifique o token e tente novamente.'
      );
    }
  });

  return {
    control: form.control,
    errors: form.formState.errors,
    isValid: form.formState.isValid,
    isSubmitting,
    submitError,
    isSuccess,
    successMessage,
    onSubmit,
    setValue: form.setValue,
  };
}
