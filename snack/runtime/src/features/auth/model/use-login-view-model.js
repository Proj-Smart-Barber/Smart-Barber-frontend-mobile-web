import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema } from './login.schema';
import { useSession } from './use-session';
export function useLoginViewModel() {
    const { signIn, status, clearError } = useSession();
    const [submitError, setSubmitError] = useState(null);
    const [isEmailNotVerified, setIsEmailNotVerified] = useState(false);
    const form = useForm({
        resolver: zodResolver(loginSchema),
        defaultValues: {
            email: '',
            password: '',
        },
        mode: 'onBlur',
    });
    const isSubmitting = form.formState.isSubmitting || status === 'authenticating';
    const onSubmit = form.handleSubmit(async (values) => {
        if (isSubmitting)
            return; // Previne double submit
        setSubmitError(null);
        setIsEmailNotVerified(false);
        clearError();
        try {
            await signIn({
                email: values.email.trim(),
                password: values.password,
            });
        }
        catch (err) {
            const normalized = err;
            if (normalized.code === 'EMAIL_NOT_VERIFIED') {
                setIsEmailNotVerified(true);
            }
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
        isEmailNotVerified,
        getEnteredEmail: () => form.getValues('email'),
        onSubmit,
    };
}
