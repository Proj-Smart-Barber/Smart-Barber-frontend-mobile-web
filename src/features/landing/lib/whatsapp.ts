import { DemoFormData } from '../model/demo-form';

/**
 * Constrói o texto puro da mensagem de solicitação de demonstração.
 * Normaliza quebras de linha e espaços, omitindo linhas opcionais não preenchidas.
 */
export function buildWhatsAppMessage(data: DemoFormData): string {
  const lines: string[] = [
    'Olá! Quero conhecer o Smart Barber e solicitar uma demonstração.',
    '',
    `Nome: ${data.nome.trim()}`,
    `Barbearia: ${data.barbearia.trim()}`,
    `Cidade/UF: ${data.cidadeUf.trim()}`,
    `Profissionais: ${data.profissionais}`,
  ];

  if (data.necessidade && data.necessidade.trim().length > 0) {
    lines.push(`Principal necessidade: ${data.necessidade.trim()}`);
  }

  if (data.configuracao && data.configuracao.trim().length > 0) {
    lines.push(`Configuração de interesse: ${data.configuracao.trim()}`);
  }

  return lines.join('\n');
}

/**
 * Sanitiza o número de telefone removendo caracteres não-numéricos.
 */
export function sanitizeWhatsAppNumber(phoneNumber: string): string {
  return phoneNumber ? phoneNumber.replace(/\D/g, '') : '';
}

/**
 * Verifica se um número de WhatsApp é válido para handoff (mínimo 10 dígitos).
 */
export function isWhatsAppNumberValid(phoneNumber: string | undefined): boolean {
  if (!phoneNumber) return false;
  const sanitized = sanitizeWhatsAppNumber(phoneNumber);
  return sanitized.length >= 10;
}

/**
 * Constrói a URL direta de conversa do WhatsApp seguindo a especificação oficial:
 * https://wa.me/{numero}?text={mensagemCodificada}
 * Aplica encodeURIComponent estritamente uma única vez sobre o texto completo.
 * Retorna string vazia caso o número seja inválido ou não configurado.
 */
export function buildWhatsAppUrl(phoneNumber: string, data: DemoFormData): string {
  const sanitizedNumber = sanitizeWhatsAppNumber(phoneNumber);
  if (!sanitizedNumber || sanitizedNumber.length < 10) {
    return '';
  }
  const rawMessage = buildWhatsAppMessage(data);
  const encodedMessage = encodeURIComponent(rawMessage);
  return `https://wa.me/${sanitizedNumber}?text=${encodedMessage}`;
}

/**
 * Copia texto para a área de transferência com suporte resiliente a fallback
 * caso a API assíncrona navigator.clipboard esteja bloqueada ou indisponível.
 */
export async function copyMessageToClipboard(text: string): Promise<boolean> {
  if (typeof window === 'undefined') {
    return false;
  }

  if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fallback para textarea legado se a permissão do clipboard for negada
    }
  }

  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    textarea.style.top = '0';
    textarea.setAttribute('readonly', '');
    document.body.appendChild(textarea);
    textarea.select();
    const success = document.execCommand('copy');
    document.body.removeChild(textarea);
    return success;
  } catch {
    return false;
  }
}
