/** Configuração de variáveis de ambiente públicas do Smart Barber. */

const DEFAULT_API_URL = 'https://api-black-theta-13.vercel.app';
const MOCK_BARBERSHOP_ID = 'barbershop-seed-0001';

const availabilitySource =
  process.env.EXPO_PUBLIC_AVAILABILITY_SOURCE === 'http' ? 'http' : 'mock';

export const ENV = {
  API_URL: (process.env.EXPO_PUBLIC_API_URL || DEFAULT_API_URL).replace(/\/$/, ''),

  /** `mock` mantém desenvolvimento isolado; `http` ativa integração real. */
  AVAILABILITY_SOURCE: availabilitySource as 'mock' | 'http',

/** ID usado apenas pelo adapter mock; no HTTP a unidade vem de /api/staffs/me. */
  BARBERSHOP_ID: availabilitySource === 'mock' ? MOCK_BARBERSHOP_ID : '',
} as const;
