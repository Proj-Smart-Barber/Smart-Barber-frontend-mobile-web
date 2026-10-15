import { z } from 'zod';

export function normalizeCpf(value: string): string {
  return value.replace(/\D/g, '');
}

export function formatCpf(value: string): string {
  const digits = normalizeCpf(value).slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9, 11)}`;
}

export function isValidCpf(raw: string): boolean {
  const digits = normalizeCpf(raw);

  if (digits.length !== 11 || /^(\d)\1{10}$/.test(digits)) {
    return false;
  }

  const calculateCheckDigit = (sliceLen: number): number => {
    const factor = sliceLen + 1;
    const sum = digits
      .slice(0, sliceLen)
      .split('')
      .reduce((acc, digit, idx) => acc + Number(digit) * (factor - idx), 0);
    const remainder = (sum * 10) % 11;
    return remainder === 10 ? 0 : remainder;
  };

  const firstCheckDigit = calculateCheckDigit(9);
  if (firstCheckDigit !== Number(digits[9])) {
    return false;
  }

  const secondCheckDigit = calculateCheckDigit(10);
  return secondCheckDigit === Number(digits[10]);
}

export function getUtf8ByteLength(str: string): number {
  if (typeof TextEncoder !== 'undefined') {
    return new TextEncoder().encode(str).length;
  }
  return unescape(encodeURIComponent(str)).length;
}

export function validatePasswordPolicy(password: string): { valid: boolean; error?: string } {
  const codePoints = [...password].length;
  if (codePoints < 8) {
    return { valid: false, error: 'A senha deve conter no mínimo 8 caracteres' };
  }
  const bytes = getUtf8ByteLength(password);
  if (bytes > 72) {
    return { valid: false, error: 'A senha não pode exceder 72 bytes em UTF-8' };
  }
  return { valid: true };
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
        (val) => normalizeCpf(val).length === 11,
        { message: 'CPF deve conter 11 dígitos' }
      )
      .refine(
        (val) => isValidCpf(val),
        { message: 'CPF inválido. Verifique os números digitados.' }
      ),
    email: z
      .string()
      .trim()
      .min(1, 'Informe seu e-mail')
      .email('Formato de e-mail inválido'),
    password: z
      .string()
      .min(1, 'Informe sua senha')
      .refine(
        (val) => [...val].length >= 8,
        { message: 'A senha deve conter no mínimo 8 caracteres' }
      )
      .refine(
        (val) => getUtf8ByteLength(val) <= 72,
        { message: 'A senha não pode exceder 72 bytes em UTF-8' }
      ),
    passwordConfirmation: z
      .string()
      .min(1, 'Confirme sua senha'),
  })
  .refine((data) => data.password === data.passwordConfirmation, {
    message: 'As senhas não coincidem',
    path: ['passwordConfirmation'],
  });

export type RegisterFormValues = z.infer<typeof registerSchema>;
