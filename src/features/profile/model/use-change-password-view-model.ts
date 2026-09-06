import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useSession } from '@/features/auth';
import {
  authExtensionRepository,
  IAuthExtensionRepository,
} from '@/features/auth/api';
import {
  changePasswordSchema,
  ChangePasswordFormValues,
} from './change-password.schema';

interface UseChangePasswordViewModelOptions {
  repository?: IAuthExtensionRepository;
}

export function useChangePasswordViewModel(
  options: UseChangePasswordViewModelOptions = {}
) {
  const repository = options.repository ?? authExtensionRepository;
  const { staff } = useSession();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const form = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
    mode: 'onBlur',
  });

  const isSubmitting = form.formState.isSubmitting;

  const onSubmit = form.handleSubmit(async (values) => {
    if (isSubmitting || !staff) return;

    setSubmitError(null);
    setIsSuccess(false);

    try {
      const response = await repository.changePassword(staff.id, {
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });

      setIsSuccess(true);
      setSuccessMessage(response.message || 'Senha alterada com sucesso!');
      form.reset();
    } catch (err: any) {
      setSubmitError(
        err.message || 'Falha ao alterar a senha. Tente novamente.'
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
    resetForm: form.reset,
  };
}
