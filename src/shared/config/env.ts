import { Platform } from 'react-native';

/** Configuração de variáveis de ambiente públicas do Smart Barber. */

const DEFAULT_API_URL = 'https://api-black-theta-13.vercel.app';
const DEFAULT_WEB_URL = 'https://smartbarber.app';
const MOCK_BARBERSHOP_ID = 'barbershop-seed-0001';

const availabilitySource =
  process.env.EXPO_PUBLIC_AVAILABILITY_SOURCE === 'mock' ? 'mock' : 'http';

const publicWebUrl = (
  process.env.EXPO_PUBLIC_WEB_URL ||
  (Platform.OS === 'web' && typeof window !== 'undefined'
    ? window.location.origin
    : DEFAULT_WEB_URL)
).replace(/\/$/, '');

export const ENV = {
  API_URL: (process.env.EXPO_PUBLIC_API_URL || DEFAULT_API_URL).replace(/\/$/, ''),

  /** Origem base pública para compartilhamento e links do catálogo web */
  PUBLIC_WEB_URL: publicWebUrl,

  /** `mock` mantém desenvolvimento isolado; `http` ativa integração real. */
  AVAILABILITY_SOURCE: availabilitySource as 'mock' | 'http',

  /** ID padrão para testes/fallback; no HTTP a unidade vem da sessão ou storage. */
  BARBERSHOP_ID: process.env.EXPO_PUBLIC_BARBERSHOP_ID || MOCK_BARBERSHOP_ID,
} as const;

export function getPublicCatalogUrl(barbershopId?: string | null): string {
  if (!barbershopId) return ENV.PUBLIC_WEB_URL;
  return `${ENV.PUBLIC_WEB_URL}/barbershops/${encodeURIComponent(barbershopId)}/services`;
}
