/**
 * Geração e decodificação estrita de UUIDv7 com timestamp de 48 bits (RFC 4122 / draft-ietf-uuidrev-rfc4122bis).
 * Falha fechada se o relógio do servidor ou a fonte segura de entropia estiverem ausentes.
 */

export function getSecureRandomBytes(length: number = 16): Uint8Array {
  const bytes = new Uint8Array(length);

  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    crypto.getRandomValues(bytes);
    return bytes;
  }

  try {
    // Resolução preguiçosa para ambientes React Native sem WebCrypto global
    const expoCrypto = require('expo-crypto');
    if (expoCrypto && typeof expoCrypto.getRandomBytes === 'function') {
      return expoCrypto.getRandomBytes(length);
    }
  } catch {
    // ExpoCrypto não disponível
  }

  throw new Error('Fonte de entropia segura indisponível para geração de Idempotency-Key.');
}

export function generateUuidV7(
  serverTimestampMs: number,
  entropy16?: Uint8Array
): string {
  if (
    typeof serverTimestampMs !== 'number' ||
    Number.isNaN(serverTimestampMs) ||
    serverTimestampMs <= 0
  ) {
    throw new Error('Server clock inválido para geração de Idempotency-Key.');
  }

  let bytes: Uint8Array;
  if (entropy16 !== undefined) {
    if (!(entropy16 instanceof Uint8Array) || entropy16.length !== 16) {
      throw new Error('entropy segura fornecida deve ter exatamente 16 bytes.');
    }
    bytes = new Uint8Array(entropy16);
  } else {
    bytes = getSecureRandomBytes(16);
  }

  const timestamp = Math.floor(serverTimestampMs);

  // 48 bits do timestamp de acordo com a especificação UUIDv7 (bits 47..0)
  bytes[0] = Math.floor(timestamp / 1099511627776) & 0xff; // 2^40
  bytes[1] = Math.floor(timestamp / 4294967296) & 0xff;    // 2^32
  bytes[2] = Math.floor(timestamp / 16777216) & 0xff;      // 2^24
  bytes[3] = Math.floor(timestamp / 65536) & 0xff;         // 2^16
  bytes[4] = Math.floor(timestamp / 256) & 0xff;           // 2^8
  bytes[5] = timestamp & 0xff;                             // 2^0

  // Versão 7 nos bits 4-7 do byte 6 (0111 xxxx)
  bytes[6] = 0x70 | (bytes[6] & 0x0f);

  // Variante RFC 4122 nos bits 6-7 do byte 8 (10xx xxxx)
  bytes[8] = 0x80 | (bytes[8] & 0x3f);

  const hex: string[] = [];
  for (let i = 0; i < 16; i++) {
    hex.push(bytes[i].toString(16).padStart(2, '0'));
  }

  return [
    hex.slice(0, 4).join(''),
    hex.slice(4, 6).join(''),
    hex.slice(6, 8).join(''),
    hex.slice(8, 10).join(''),
    hex.slice(10, 16).join(''),
  ].join('-');
}

export function isValidUuidV7(uuid: string): boolean {
  if (typeof uuid !== 'string') return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(uuid);
}

export function decodeUuidV7Timestamp(uuid: string): number | null {
  if (!isValidUuidV7(uuid)) {
    return null;
  }

  const cleanHex = uuid.replace(/-/g, '');
  const timestampHex = cleanHex.slice(0, 12);
  const timestamp = parseInt(timestampHex, 16);

  return Number.isNaN(timestamp) ? null : timestamp;
}
