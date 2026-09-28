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
  description?: string;
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
    if (Number.isNaN(rawPrice) || rawPrice <= 0) return 0;
    return Math.round(rawPrice * 100);
  }
  const str = String(rawPrice || '').trim();
  if (str.includes('-')) return 0;
  const cleaned = str
    .replace(/[^\d.,]/g, '')
    .replace(/\.(?=.*\.)/g, '')
    .replace(',', '.');
  const parsed = parseFloat(cleaned);
  if (Number.isNaN(parsed) || parsed <= 0) return 0;
  return Math.round(parsed * 100);
}
