export function isValidUuidV7(id: string): boolean {
  if (typeof id !== 'string') return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    id,
  );
}

export function generateUuidV7(timestampMs: number = Date.now()): string {
  const timeHex = Math.max(0, Math.floor(timestampMs))
    .toString(16)
    .padStart(12, '0');
  const randomBytes = new Uint8Array(10);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(randomBytes);
  } else {
    for (let i = 0; i < 10; i++) {
      randomBytes[i] = Math.floor(Math.random() * 256);
    }
  }

  const part1 = timeHex.slice(0, 8);
  const part2 = timeHex.slice(8, 12);
  const part3 =
    '7' +
    Array.from(randomBytes.slice(0, 2))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')
      .slice(0, 3);
  const varByte = (randomBytes[2] & 0x3f) | 0x80;
  const part4 =
    varByte.toString(16).padStart(2, '0') +
    randomBytes[3].toString(16).padStart(2, '0');
  const part5 = Array.from(randomBytes.slice(4, 10))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  return `${part1}-${part2}-${part3}-${part4}-${part5}`.toLowerCase();
}
