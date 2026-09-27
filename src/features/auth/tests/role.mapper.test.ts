import { describe, it, expect } from 'vitest';
import { normalizeStaffRole } from '@/entities/staff';

describe('normalizeStaffRole', () => {
  it('deve normalizar OWNER para OWNER', () => {
    expect(normalizeStaffRole('OWNER')).toBe('OWNER');
    expect(normalizeStaffRole('owner')).toBe('OWNER');
    expect(normalizeStaffRole(' OWNER ')).toBe('OWNER');
  });

  it('deve normalizar BARBERMAN para BARBER', () => {
    expect(normalizeStaffRole('BARBERMAN')).toBe('BARBER');
    expect(normalizeStaffRole('barberman')).toBe('BARBER');
  });

  it('deve normalizar BARBER para BARBER', () => {
    expect(normalizeStaffRole('BARBER')).toBe('BARBER');
    expect(normalizeStaffRole('barber')).toBe('BARBER');
  });

  it('deve retornar UNKNOWN para entradas nulas, vazias ou desconhecidas', () => {
    expect(normalizeStaffRole(null)).toBe('UNKNOWN');
    expect(normalizeStaffRole(undefined)).toBe('UNKNOWN');
    expect(normalizeStaffRole('')).toBe('UNKNOWN');
    expect(normalizeStaffRole('UNKNOWN_ROLE')).toBe('UNKNOWN');
  });
});
