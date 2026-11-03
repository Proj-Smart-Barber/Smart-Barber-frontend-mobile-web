import { z } from 'zod';
import { isValidCep } from '../lib/cep';

export function formatCnpj(val: string): string {
  const digits = val.replace(/\D/g, '').slice(0, 14);
  if (digits.length <= 2) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  if (digits.length <= 8) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
  if (digits.length <= 12)
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12, 14)}`;
}

export const createBarbershopFormSchema = z
  .object({
    name: z.string().trim().min(2, 'Nome da barbearia deve ter pelo menos 2 caracteres'),
    cnpj: z
      .string()
      .transform((v) => v.replace(/\D/g, ''))
      .pipe(z.string().length(14, 'CNPJ deve conter 14 dígitos numéricos')),
    cep: z
      .string()
      .min(1, 'Informe o CEP')
      .refine((v) => isValidCep(v), 'CEP deve conter 8 dígitos'),
    street: z.string().trim().min(2, 'Rua / logradouro é obrigatório'),
    number: z.string().trim().optional().default(''),
    withoutNumber: z.boolean().default(false),
    complement: z.string().trim().optional().default(''),
    neighborhood: z.string().trim().optional().default(''),
    city: z.string().trim().min(2, 'Cidade é obrigatória'),
    state: z.string().trim().min(2, 'Informe o estado').max(2, 'UF deve ter 2 letras (ex: SP)'),
    location: z.string().trim().optional(),
    timezone: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.withoutNumber) return true;
      return Boolean(data.number && data.number.trim().length > 0);
    },
    {
      message: 'Informe o número ou marque "Sem número"',
      path: ['number'],
    }
  );

export type CreateBarbershopFormValues = z.infer<typeof createBarbershopFormSchema>;

export const linkBarbershopFormSchema = z.object({
  barbershopId: z
    .string()
    .trim()
    .uuid('ID da barbearia deve ser um UUID válido (ex: 123e4567-e89b-12d3-a456-426614174000)'),
});

export type LinkBarbershopFormValues = z.infer<typeof linkBarbershopFormSchema>;
