export function generateUuidV7(serverTimestampMs?: number): string {
  if (serverTimestampMs !== undefined && (Number.isNaN(serverTimestampMs) || serverTimestampMs <= 0)) {
    throw new Error('Server clock inválido para geração de Idempotency-Key.');
  }

  const timestamp = serverTimestampMs ?? Date.now();

  const bytes = new Uint8Array(16);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < 16; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }

  // 48 bits do timestamp
  bytes[0] = (timestamp / 281474976710656) & 0xff;
  bytes[1] = (timestamp / 1099511627776) & 0xff;
  bytes[2] = (timestamp / 4294967296) & 0xff;
  bytes[3] = (timestamp / 16777216) & 0xff;
  bytes[4] = (timestamp / 65536) & 0xff;
  bytes[5] = (timestamp / 256) & 0xff;

  // Versão 7 nos bits 4-7 do byte 6
  bytes[6] = 0x70 | (bytes[6] & 0x0f);

  // Variante RFC 4122 (10xx) nos bits 6-7 do byte 8
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
