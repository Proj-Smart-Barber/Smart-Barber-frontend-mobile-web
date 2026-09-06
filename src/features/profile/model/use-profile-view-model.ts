import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useSession } from '@/features/auth';
import {
  authExtensionRepository,
  IAuthExtensionRepository,
} from '@/features/auth/api';
import { profileSchema, ProfileFormValues } from './profile.schema';

interface UseProfileViewModelOptions {
  repository?: IAuthExtensionRepository;
}

export function useProfileViewModel(options: UseProfileViewModelOptions = {}) {
  const repository = options.repository ?? authExtensionRepository;
  const { staff, updateProfile: updateSessionProfile } = useSession();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: staff?.name ?? '',
      avatarUrl: staff?.avatarUrl ?? '',
    },
    mode: 'onBlur',
  });

  // Atualiza defaultValues quando o staff for carregado
  useEffect(() => {
    if (staff) {
      form.reset({
        name: staff.name,
        avatarUrl: staff.avatarUrl ?? '',
      });
    }
  }, [staff, form]);

  const isSubmitting = form.formState.isSubmitting;

  const onSubmit = form.handleSubmit(async (values) => {
    if (isSubmitting || !staff) return;

    setSubmitError(null);
    setIsSuccess(false);

    try {
      const sanitizedAvatar = values.avatarUrl ? values.avatarUrl.trim() : null;
      const updatedStaff = await repository.updateProfile(staff.id, {
        name: values.name.trim(),
        avatarUrl: sanitizedAvatar,
      });

      await updateSessionProfile({
        name: updatedStaff.name,
        avatarUrl: updatedStaff.avatarUrl,
      });

      setIsSuccess(true);
      setSuccessMessage('Perfil atualizado com sucesso!');
    } catch (err: any) {
      setSubmitError(
        err.message || 'Falha ao atualizar perfil. Tente novamente.'
      );
    }
  });

  return {
    staff,
    control: form.control,
    errors: form.formState.errors,
    isValid: form.formState.isValid,
    isDirty: form.formState.isDirty,
    isSubmitting,
    submitError,
    isSuccess,
    successMessage,
    onSubmit,
    setValue: form.setValue,
  };
}
