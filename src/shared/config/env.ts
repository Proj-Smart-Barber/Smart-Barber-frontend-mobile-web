/**
 * Configuração de variáveis de ambiente públicas do Smart Barber
 */

const DEFAULT_API_URL = 'https://api-black-theta-13.vercel.app';

export const ENV = {
  API_URL: (process.env.EXPO_PUBLIC_API_URL || DEFAULT_API_URL).replace(/\/$/, ''),
} as const;
