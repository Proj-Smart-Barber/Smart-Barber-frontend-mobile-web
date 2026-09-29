export interface Service {
  id: string;
  barbershopId: string;
  title: string;
  description: string | null;
  priceInCents: number;
  durationInMinutes: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ListServicesResponse {
  items: Service[];
  total: number;
  page: number;
  limit: number;
}

export interface CreateServiceInput {
  title: string;
  description?: string | null;
  priceInCents: number;
  durationInMinutes: number;
}

export interface UpdateServiceInput {
  title?: string;
  description?: string | null;
  priceInCents?: number;
  durationInMinutes?: number;
}

export function formatPrice(priceInCents: number): string {
  const safeCents = Math.max(0, Number.isFinite(priceInCents) ? priceInCents : 0);
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(safeCents / 100);
}

export function formatDuration(minutes: number): string {
  const safeMinutes = Math.max(0, Math.floor(minutes || 0));
  if (safeMinutes < 60) {
    return `${safeMinutes} min`;
  }
  const hours = Math.floor(safeMinutes / 60);
  const remainingMinutes = safeMinutes % 60;
  if (remainingMinutes === 0) {
    return `${hours}h`;
  }
  return `${hours}h ${remainingMinutes}m`;
}

export function parsePriceToCents(rawPrice: string | number): number {
  if (typeof rawPrice === 'number') {
    if (!Number.isFinite(rawPrice) || rawPrice <= 0) return 0;
    return Math.round(rawPrice * 100);
  }
  if (!rawPrice) return 0;

  let str = String(rawPrice).trim();
  str = str.replace(/^R\$\s*/i, '').trim();
  if (!str || str.startsWith('-')) return 0;

  // Strict check: only digits, dots and commas allowed; rejects letters like '12abc'
  if (/[^\d.,]/.test(str)) {
    return 0;
  }

  const hasComma = str.includes(',');
  const hasDot = str.includes('.');

  let normalized: string;

  if (hasComma && hasDot) {
    const lastComma = str.lastIndexOf(',');
    const lastDot = str.lastIndexOf('.');
    if (lastComma > lastDot) {
      // Formato pt-BR: 1.234,56
      const thousands = str.slice(0, lastComma);
      const decimals = str.slice(lastComma + 1);
      if (decimals.length !== 2) return 0;
      normalized = thousands.replace(/\./g, '') + '.' + decimals;
    } else {
      // Formato alternativo: 1,234.56
      const thousands = str.slice(0, lastDot);
      const decimals = str.slice(lastDot + 1);
      if (decimals.length !== 2) return 0;
      normalized = thousands.replace(/,/g, '') + '.' + decimals;
    }
  } else if (hasComma) {
    const parts = str.split(',');
    if (parts.length !== 2 || parts[1].length > 2) return 0;
    normalized = parts[0] + '.' + (parts[1].length === 1 ? parts[1] + '0' : parts[1]);
  } else if (hasDot) {
    const parts = str.split('.');
    if (parts.length === 2) {
      if (parts[1].length > 2) return 0;
      normalized = parts[0] + '.' + (parts[1].length === 1 ? parts[1] + '0' : parts[1]);
    } else {
      // Múltiplos pontos sem vírgula: ex 1.234
      normalized = str.replace(/\./g, '');
    }
  } else {
    normalized = str;
  }

  const parsed = parseFloat(normalized);
  if (!Number.isFinite(parsed) || parsed <= 0) return 0;
  return Math.round(parsed * 100);
}
