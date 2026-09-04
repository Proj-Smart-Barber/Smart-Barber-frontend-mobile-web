import { z } from 'zod';

export function formatCpf(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9, 11)}`;
}

export const registerSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, 'O nome deve ter pelo menos 2 caracteres'),
    cpf: z
      .string()
      .trim()
      .min(1, 'Informe seu CPF')
      .refine(
        (val) => {
          const digits = val.replace(/\D/g, '');
          return digits.length === 11;
        },
        { message: 'CPF deve conter 11 dígitos válidos' }
      ),
    email: z
      .string()
      .trim()
      .min(1, 'Informe seu e-mail')
      .email('Formato de e-mail inválido'),
    password: z
      .string()
      .min(6, 'A senha deve conter no mínimo 6 caracteres'),
    passwordConfirmation: z
      .string()
      .min(1, 'Confirme sua senha'),
  })
  .refine((data) => data.password === data.passwordConfirmation, {
    message: 'As senhas não coincidem',
    path: ['passwordConfirmation'],
  });

export type RegisterFormValues = z.infer<typeof registerSchema>;
