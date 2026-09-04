import { describe, it, expect } from 'vitest';
import { decodeJwt, isTokenExpired } from '../lib/jwt-helper';

describe('jwt-helper', () => {
  it('deve retornar null para tokens ausentes, nulos ou malformados', () => {
    expect(decodeJwt(null)).toBeNull();
    expect(decodeJwt(undefined)).toBeNull();
    expect(decodeJwt('')).toBeNull();
    expect(decodeJwt('not.a.valid.jwt')).toBeNull();
  });

  it('deve decodificar payload de JWT válido em base64', () => {
    // Payload: { sub: "user-123", exp: 2000000000, role: "OWNER" }
    const validToken = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1c2VyLTEyMyIsImV4cCI6MjAwMDAwMDAwMCwicm9sZSI6Ik9XTkVSIn0.signature';
    const payload = decodeJwt(validToken);

    expect(payload).not.toBeNull();
    expect(payload?.sub).toBe('user-123');
    expect(payload?.exp).toBe(2000000000);
  });

  it('deve identificar token expirado quando exp for no passado', () => {
    // Payload com exp no passado (exp: 1000)
    const expiredToken = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1c2VyLTEyMyIsImV4cCI6MTAwMH0.signature';
    expect(isTokenExpired(expiredToken)).toBe(true);
  });

  it('deve identificar token válido quando exp for no futuro distante', () => {
    // Payload com exp no futuro (ano 2033+)
    const futureToken = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1c2VyLTEyMyIsImV4cCI6MjAwMDAwMDAwMH0.signature';
    expect(isTokenExpired(futureToken)).toBe(false);
  });
});
