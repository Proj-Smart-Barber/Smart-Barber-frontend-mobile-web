import { z } from 'zod';

export const profileSchema = z.object({
  name: z
    .string()
    .trim()
    .min(3, 'O nome deve ter no mínimo 3 caracteres'),
  avatarUrl: z
    .string()
    .url('Informe uma URL de imagem válida')
    .nullable()
    .optional()
    .or(z.literal('')),
});

export type ProfileFormValues = z.infer<typeof profileSchema>;
