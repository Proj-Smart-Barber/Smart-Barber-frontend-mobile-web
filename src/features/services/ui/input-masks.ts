/**
 * Máscara para entrada monetária em Reais (BRL).
 *
 * Formatação em tempo real baseada em centavos acumulados:
 * - Digita 4 -> 0,04
 * - Digita 5 -> 0,45
 * - Digita 0 -> 4,50
 * - Digita 0 -> 45,00
 * - Backspace remove o último dígito e ajusta os centavos.
 */
export function maskCurrencyInput(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (!digits) return '';

  const cents = parseInt(digits, 10);
  if (isNaN(cents)) return '';

  return (cents / 100).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
