import { z } from 'zod';

export const resetPasswordSchema = z
  .object({
    token: z.string().trim().min(1, 'Token de recuperação é obrigatório'),
    password: z
      .string()
      .min(6, 'A nova senha deve ter no mínimo 6 caracteres'),
    confirmPassword: z
      .string()
      .min(1, 'Confirme a nova senha'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'As senhas não conferem',
    path: ['confirmPassword'],
  });

export type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;
