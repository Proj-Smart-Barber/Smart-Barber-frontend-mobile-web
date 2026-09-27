/**
 * Máscaras de apresentação da feature de disponibilidade.
 *
 * Importante: os valores finais continuam no mesmo contrato esperado pela API:
 * - horário: HH:mm
 * - data: YYYY-MM-DD
 */
export function maskTimeInput(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 4);

  if (digits.length <= 2) return digits;

  return `${digits.slice(0, 2)}:${digits.slice(2)}`;
}

export function maskDateInput(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 8);

  if (digits.length <= 4) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 4)}-${digits.slice(4)}`;

  return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6)}`;
}
