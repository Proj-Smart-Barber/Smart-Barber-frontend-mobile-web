import { z } from 'zod';
import { parsePriceToCents } from './service.types';

export const serviceFormSchema = z.object({
  title: z
    .string()
    .trim()
    .min(2, 'O título do serviço deve ter no mínimo 2 caracteres.')
    .max(100, 'O título do serviço não pode exceder 100 caracteres.'),
  price: z
    .string()
    .trim()
    .min(1, 'Informe o valor do serviço.')
    .refine((val) => {
      const cents = parsePriceToCents(val);
      return cents > 0;
    }, 'O preço deve ser maior que zero (R$ 0,00).'),
  durationInMinutes: z.coerce
    .number({ invalid_type_error: 'Informe uma duração válida em minutos.' })
    .int('A duração deve ser um número inteiro.')
    .min(5, 'A duração mínima é de 5 minutos.')
    .max(480, 'A duração máxima é de 8 horas (480 minutos).'),
  description: z
    .string()
    .trim()
    .max(500, 'A descrição não pode exceder 500 caracteres.')
    .optional(),
});

export type ServiceFormValues = z.infer<typeof serviceFormSchema>;
