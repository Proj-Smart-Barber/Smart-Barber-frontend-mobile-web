/**
 * Utilitários de normalização, formatação e validação de CEP brasileiro.
 * CEP é estritamente uma string de 8 dígitos numéricos, preservando zeros iniciais.
 */

export function normalizeCep(val: string | null | undefined): string {
  if (!val) return '';
  return val.replace(/\D/g, '').slice(0, 8);
}

export function formatCep(val: string | null | undefined): string {
  const digits = normalizeCep(val);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5, 8)}`;
}

export function isValidCep(val: string | null | undefined): boolean {
  return normalizeCep(val).length === 8;
}
