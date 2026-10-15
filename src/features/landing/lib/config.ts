/**
 * Configurações da Landing Page Híbrida do Smart Barber.
 * Centraliza variáveis de ambiente e fallbacks seguros para preview e produção.
 */

function sanitizePhoneNumber(raw: string | undefined): string {
  if (!raw) return '5511999999999';
  const digitsOnly = raw.replace(/\D/g, '');
  return digitsOnly.length >= 10 ? digitsOnly : '5511999999999';
}

function sanitizeCanonicalUrl(raw: string | undefined): string {
  if (!raw) return 'https://smartbarber.com.br';
  return raw.replace(/\/+$/, '');
}

export const landingConfig = {
  /**
   * Número de WhatsApp oficial para o handoff da demonstração comercial.
   * Formato internacional composto estritamente por dígitos (ex: 5511999999999).
   */
  whatsAppNumber: sanitizePhoneNumber(process.env.EXPO_PUBLIC_WHATSAPP_NUMBER),

  /**
   * Domínio canonical base para metadados de SEO e indexação.
   */
  canonicalBaseUrl: sanitizeCanonicalUrl(process.env.EXPO_PUBLIC_CANONICAL_URL),

  /**
   * Flag de liberação da busca pública de barbearias (/explorar).
   * Desativada por padrão enquanto o inventário de backend estiver em definição.
   */
  enableDiscovery: process.env.EXPO_PUBLIC_ENABLE_DISCOVERY === 'true',

  /**
   * Rota de fallback para descoberta quando desativada ou ativa.
   */
  discoveryPath: process.env.EXPO_PUBLIC_ENABLE_DISCOVERY === 'true' ? '/explorar' : '#demonstracao',

  /**
   * URLs institucionais e jurídicas.
   */
  legal: {
    termsUrl: process.env.EXPO_PUBLIC_TERMS_URL ?? '/termos',
    privacyUrl: process.env.EXPO_PUBLIC_PRIVACY_URL ?? '/privacidade',
    contactEmail: process.env.EXPO_PUBLIC_CONTACT_EMAIL ?? 'contato@smartbarber.com.br',
  },
} as const;
