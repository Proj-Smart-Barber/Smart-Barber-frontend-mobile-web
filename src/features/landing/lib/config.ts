/**
 * Configurações da Landing Page Híbrida do Smart Barber.
 * Centraliza variáveis de ambiente e fallbacks seguros para preview e produção.
 */

function sanitizePhoneNumber(raw: string | undefined): string {
  if (!raw) return '';
  const digitsOnly = raw.replace(/\D/g, '');
  return digitsOnly.length >= 10 ? digitsOnly : '';
}

function sanitizeCanonicalUrl(raw: string | undefined): string {
  if (raw && raw.trim().length > 0) {
    return raw.replace(/\/+$/, '');
  }
  return 'https://smartbarber.wellingtonsp.uk';
}

const sanitizedWhatsAppNumber = sanitizePhoneNumber(process.env.EXPO_PUBLIC_WHATSAPP_NUMBER);

export const landingConfig = {
  /**
   * Número de WhatsApp oficial para o handoff da demonstração comercial.
   * Formato internacional composto estritamente por dígitos. Vazio se não configurado.
   */
  whatsAppNumber: sanitizedWhatsAppNumber,

  /**
   * Indica se o canal comercial de WhatsApp possui configuração válida.
   */
  isWhatsAppConfigured: sanitizedWhatsAppNumber.length >= 10,

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
   * Rota para descoberta ativa ou vazia quando desativada.
   * Nunca aponta para o formulário de donos (#demonstracao).
   */
  discoveryPath: process.env.EXPO_PUBLIC_ENABLE_DISCOVERY === 'true' ? '/explorar' : '',

  /**
   * URLs institucionais e jurídicas.
   */
  legal: {
    termsUrl: process.env.EXPO_PUBLIC_TERMS_URL ?? '',
    privacyUrl: process.env.EXPO_PUBLIC_PRIVACY_URL ?? '',
    contactEmail: process.env.EXPO_PUBLIC_CONTACT_EMAIL ?? 'contato@smartbarber.com.br',
  },
} as const;
