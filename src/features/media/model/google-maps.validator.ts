const ALLOWED_GOOGLE_DOMAINS = [
  'maps.google.com',
  'google.com',
  'www.google.com',
  'goo.gl',
  'maps.app.goo.gl',
];

export function validateGoogleMapsUrl(url: string): { valid: boolean; error?: string } {
  if (!url || url.trim().length === 0) {
    return { valid: true };
  }

  try {
    const parsed = new URL(url.trim());
    if (parsed.protocol !== 'https:') {
      return {
        valid: false,
        error: 'O link deve utilizar o protocolo seguro HTTPS (https://).',
      };
    }

    const hostname = parsed.hostname.toLowerCase();
    const isAllowed = ALLOWED_GOOGLE_DOMAINS.some(
      (dom) => hostname === dom || hostname.endsWith(`.${dom}`),
    );

    if (!isAllowed) {
      return {
        valid: false,
        error:
          'Link inválido. Informe um link oficial do Google Maps (ex: maps.app.goo.gl/... ou google.com/maps/...).',
      };
    }

    return { valid: true };
  } catch {
    return {
      valid: false,
      error: 'Formato de URL inválido. Certifique-se de incluir https:// no início.',
    };
  }
}
