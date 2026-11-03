import { describe, expect, it } from 'vitest';
import { formatPhoneNumber, sanitizePhoneNumber } from './phone-format';

describe('phone-format', () => {
  it('formats 11 digit Brazilian mobile number with DDD', () => {
    expect(formatPhoneNumber('11999998888')).toBe('(11) 99999-8888');
  });

  it('formats 10 digit Brazilian landline number with DDD', () => {
    expect(formatPhoneNumber('1133334444')).toBe('(11) 3333-4444');
  });

  it('formats partial input progressively', () => {
    expect(formatPhoneNumber('')).toBe('');
    expect(formatPhoneNumber('1')).toBe('(1');
    expect(formatPhoneNumber('11')).toBe('(11');
    expect(formatPhoneNumber('119')).toBe('(11) 9');
    expect(formatPhoneNumber('119999')).toBe('(11) 9999');
    expect(formatPhoneNumber('1199998')).toBe('(11) 9999-8');
  });

  it('limits to 11 digits', () => {
    expect(formatPhoneNumber('1199999888899999')).toBe('(11) 99999-8888');
  });

  it('sanitizes input returning only digits', () => {
    expect(sanitizePhoneNumber('(11) 99999-8888')).toBe('11999998888');
    expect(sanitizePhoneNumber('')).toBe('');
  });
});
