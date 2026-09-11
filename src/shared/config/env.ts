/**
 * Configuração de variáveis de ambiente públicas do Smart Barber.
 */

const DEFAULT_API_URL = 'https://api-black-theta-13.vercel.app';
const DEFAULT_BARBERSHOP_ID = 'barbershop-seed-0001';
const DEFAULT_BARBERSHOP_NAME = 'Barbearia Exemplo';
const DEFAULT_BARBERSHOP_TIMEZONE = 'America/Sao_Paulo';

const availabilitySource =
  process.env.EXPO_PUBLIC_AVAILABILITY_SOURCE === 'http' ? 'http' : 'mock';

export const ENV = {
  API_URL: (process.env.EXPO_PUBLIC_API_URL || DEFAULT_API_URL).replace(/\/$/, ''),

  /**
   * `mock` mantém o adapter local atual.
   * `http` ativa a integração com a branch feat/availability-engine.
   */
  AVAILABILITY_SOURCE: availabilitySource as 'mock' | 'http',

  /**
   * A API atual ainda não devolve a barbearia do staff autenticado nem expõe
   * GET /barbershops/:id. Estes valores mantêm a integração configurável até
   * esse contrato existir no backend, sem importar seed do adapter mock.
   */
  BARBERSHOP_ID: process.env.EXPO_PUBLIC_BARBERSHOP_ID || DEFAULT_BARBERSHOP_ID,
  BARBERSHOP_NAME: process.env.EXPO_PUBLIC_BARBERSHOP_NAME || DEFAULT_BARBERSHOP_NAME,
  BARBERSHOP_TIMEZONE:
    process.env.EXPO_PUBLIC_BARBERSHOP_TIMEZONE || DEFAULT_BARBERSHOP_TIMEZONE,
} as const;
