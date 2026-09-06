import { z } from 'zod';

export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'Informe seu e-mail')
    .email('Formato de e-mail inválido'),
});

export type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;
