import { z } from 'zod';

export const professionalsRanges = ['1', '2-5', '6-10', '11+'] as const;
export type ProfessionalsRange = (typeof professionalsRanges)[number];

export const demoFormSchema = z.object({
  nome: z
    .string({ required_error: 'Informe seu nome' })
    .trim()
    .min(2, 'O nome deve ter no mínimo 2 caracteres')
    .max(80, 'O nome deve ter no máximo 80 caracteres'),

  barbearia: z
    .string({ required_error: 'Informe o nome da barbearia' })
    .trim()
    .min(2, 'O nome da barbearia deve ter no mínimo 2 caracteres')
    .max(100, 'O nome da barbearia deve ter no máximo 100 caracteres'),

  cidadeUf: z
    .string({ required_error: 'Informe sua cidade e UF' })
    .trim()
    .min(2, 'Informe a cidade e o estado')
    .max(100, 'A localização deve ter no máximo 100 caracteres'),

  profissionais: z.enum(professionalsRanges, {
    required_error: 'Selecione a quantidade de profissionais',
    invalid_type_error: 'Selecione uma faixa válida de profissionais',
  }),

  necessidade: z
    .string()
    .trim()
    .max(240, 'A descrição deve ter no máximo 240 caracteres')
    .optional()
    .or(z.literal('')),

  configuracao: z.string().trim().optional().or(z.literal('')),
});

export type DemoFormData = z.infer<typeof demoFormSchema>;

export type DemoFormErrors = Partial<Record<keyof DemoFormData, string>>;

export function validateDemoForm(data: unknown): {
  success: boolean;
  data?: DemoFormData;
  errors?: DemoFormErrors;
  firstErrorField?: keyof DemoFormData;
} {
  const result = demoFormSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }

  const errors: DemoFormErrors = {};
  let firstErrorField: keyof DemoFormData | undefined;

  for (const issue of result.error.issues) {
    const field = issue.path[0] as keyof DemoFormData;
    if (field && !errors[field]) {
      errors[field] = issue.message;
      if (!firstErrorField) {
        firstErrorField = field;
      }
    }
  }

  return { success: false, errors, firstErrorField };
}
