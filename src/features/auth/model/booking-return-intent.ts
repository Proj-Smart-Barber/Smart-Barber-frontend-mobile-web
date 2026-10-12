export interface BookingReturnIntent {
  shopId: string;
  draftId?: string;
  returnPath: string;
}

const STORAGE_KEY = 'sb_booking_return_intent';

let memoryIntent: BookingReturnIntent | null = null;

function isValidInternalBookingPath(path: string, shopId: string): boolean {
  if (!path || typeof path !== 'string') return false;
  // Rejeita URLs externas, esquemas e barras duplas
  if (path.includes('://') || path.startsWith('//') || path.startsWith('\\')) return false;
  // Rejeita rotas operacionais ou administrativas
  if (path.includes('new-booking') || path.includes('/admin') || path.includes('/(app)')) return false;

  // Rota permitida é estritamente a jornada pública de agendamento da unidade
  const expectedPrefix = `/barbershops/${shopId}/book`;
  return path === expectedPrefix || path.startsWith(`${expectedPrefix}?`);
}

export function setBookingReturnIntent(intent: {
  shopId: string;
  draftId?: string;
}): void {
  if (!intent.shopId || typeof intent.shopId !== 'string') {
    throw new Error('shopId é obrigatório para registrar intenção de retorno.');
  }

  // Sanitização do shopId: apenas caracteres seguros (alfanuméricos, traços, sublinhados)
  const sanitizedShopId = intent.shopId.trim();
  if (!/^[a-zA-Z0-9_-]+$/.test(sanitizedShopId)) {
    throw new Error('Identificador de barbearia inválido.');
  }

  const returnPath = `/barbershops/${sanitizedShopId}/book`;
  if (!isValidInternalBookingPath(returnPath, sanitizedShopId)) {
    throw new Error('Destino de retorno não permitido.');
  }

  const payload: BookingReturnIntent = {
    shopId: sanitizedShopId,
    draftId: intent.draftId,
    returnPath,
  };

  memoryIntent = payload;

  if (typeof window !== 'undefined' && window.sessionStorage) {
    try {
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // Ignora falha de storage em modo privado
    }
  }
}

export function getBookingReturnIntent(): BookingReturnIntent | null {
  if (memoryIntent) {
    if (isValidInternalBookingPath(memoryIntent.returnPath, memoryIntent.shopId)) {
      return memoryIntent;
    }
    memoryIntent = null;
  }

  if (typeof window !== 'undefined' && window.sessionStorage) {
    try {
      const raw = window.sessionStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (
          parsed &&
          typeof parsed === 'object' &&
          typeof parsed.shopId === 'string' &&
          typeof parsed.returnPath === 'string' &&
          isValidInternalBookingPath(parsed.returnPath, parsed.shopId)
        ) {
          memoryIntent = parsed;
          return parsed;
        }
      }
    } catch {
      // Falha fechado
    }
  }

  return null;
}

export function clearBookingReturnIntent(): void {
  memoryIntent = null;
  if (typeof window !== 'undefined' && window.sessionStorage) {
    try {
      window.sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignora falha
    }
  }
}
