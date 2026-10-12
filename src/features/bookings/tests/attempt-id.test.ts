import { describe, it, expect } from 'vitest';
import {
  generateUuidV7,
  decodeUuidV7Timestamp,
  isValidUuidV7,
} from '../lib/attempt-id';

describe('R1 — UUIDv7 e Timestamp Decode', () => {
  it('uuid_timestamp_roundtrips: timestamp 48 bits decodifica exatamente o valor original', () => {
    const timestampMs = 1775900000000;
    const entropy = new Uint8Array([
      0x12, 0x34, 0x56, 0x78, 0x9a, 0xbc, 0xde, 0xf0,
      0x11, 0x22, 0x33, 0x44, 0x55, 0x66, 0x77, 0x88,
    ]);

    const uuid = generateUuidV7(timestampMs, entropy);
    expect(isValidUuidV7(uuid)).toBe(true);

    const decoded = decodeUuidV7Timestamp(uuid);
    expect(decoded).toBe(timestampMs);
  });

  it('versao_e_variante_rfc4122: possui versão 7 e variante RFC 4122 (10xx)', () => {
    const timestampMs = 1775900000000;
    const uuid = generateUuidV7(timestampMs);

    expect(isValidUuidV7(uuid)).toBe(true);
    // UUID v7 format: 8-4-4-4-12
    const parts = uuid.split('-');
    expect(parts[2].startsWith('7')).toBe(true); // versão 7
    const variantChar = parts[3].charAt(0).toLowerCase();
    expect(['8', '9', 'a', 'b'].includes(variantChar)).toBe(true); // variante 10xx
  });

  it('missing_clock_and_entropy_fail_closed: ausência ou invalidez de timestamp rejeita nova operação', () => {
    expect(() => generateUuidV7(undefined as any)).toThrow('Server clock');
    expect(() => generateUuidV7(null as any)).toThrow('Server clock');
    expect(() => generateUuidV7(-100)).toThrow('Server clock');
    expect(() => generateUuidV7(NaN)).toThrow('Server clock');
  });

  it('rejeita_entropy_invalida: entropy com tamanho menor que 16 bytes é rejeitada', () => {
    const invalidEntropy = new Uint8Array([1, 2, 3]);
    expect(() => generateUuidV7(1775900000000, invalidEntropy)).toThrow('entropy');
  });

  it('decodeUuidV7Timestamp: rejeita strings que não são UUIDv7 válido', () => {
    expect(decodeUuidV7Timestamp('invalid-uuid')).toBeNull();
    // UUID v4 (versão 4 em vez de 7)
    expect(decodeUuidV7Timestamp('f47ac10b-58cc-4372-a567-0e02b2c3d479')).toBeNull();
  });
});
