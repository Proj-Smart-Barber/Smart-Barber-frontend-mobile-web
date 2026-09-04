import { z } from 'zod';

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'Informe seu e-mail')
    .email('Formato de e-mail inválido'),
  password: z
    .string()
    .min(1, 'Informe sua senha'),
});

export type LoginFormValues = z.infer<typeof loginSchema>;
