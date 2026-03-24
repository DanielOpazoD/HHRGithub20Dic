import { describe, expect, it } from 'vitest';
import {
  generateCensusPassword,
  getCensusPassword,
} from '../../services/security/passwordGenerator';

describe('passwordGenerator', () => {
  it('returns the same PIN for all days in the same month', () => {
    expect(generateCensusPassword('2026-03-01')).toBe('1414');
    expect(generateCensusPassword('2026-03-15')).toBe('1414');
    expect(generateCensusPassword('2026-03-31')).toBe('1414');
  });

  it('returns 4-digit monthly PIN values', () => {
    const jan = generateCensusPassword('2026-01-20');
    const dec = generateCensusPassword('2026-12-20');

    expect(jan).toBe('1212');
    expect(dec).toBe('2424');
    expect(/^\d{4}$/.test(jan)).toBe(true);
    expect(/^\d{4}$/.test(dec)).toBe(true);
  });

  it('keeps backwards-compatible alias', () => {
    expect(getCensusPassword('2026-09-10')).toBe(generateCensusPassword('2026-09-10'));
  });
});
