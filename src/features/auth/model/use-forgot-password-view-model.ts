import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  forgotPasswordSchema,
  ForgotPasswordFormValues,
} from './forgot-password.schema';
import {
  authExtensionRepository,
  IAuthExtensionRepository,
} from '../api';

interface UseForgotPasswordOptions {
  repository?: IAuthExtensionRepository;
}

export function useForgotPasswordViewModel(options: UseForgotPasswordOptions = {}) {
  const repository = options.repository ?? authExtensionRepository;
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const form = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: '',
    },
    mode: 'onBlur',
  });

  const isSubmitting = form.formState.isSubmitting;

  const onSubmit = form.handleSubmit(async (values) => {
    if (isSubmitting) return;

    setSubmitError(null);

    try {
      const response = await repository.forgotPassword({
        email: values.email.trim().toLowerCase(),
      });
      setIsSuccess(true);
      setSuccessMessage(
        response.message || 'Instruções de recuperação enviadas para o seu e-mail.'
      );
    } catch (err: any) {
      setSubmitError(
        err.message || 'Falha ao solicitar recuperação de senha. Tente novamente.'
      );
    }
  });

  const resetFlow = () => {
    form.reset();
    setIsSuccess(false);
    setSuccessMessage(null);
    setSubmitError(null);
  };

  return {
    control: form.control,
    errors: form.formState.errors,
    isValid: form.formState.isValid,
    isSubmitting,
    submitError,
    isSuccess,
    successMessage,
    onSubmit,
    resetFlow,
  };
}
