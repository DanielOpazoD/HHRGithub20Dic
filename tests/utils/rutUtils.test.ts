import { describe, it, expect } from 'vitest';
import {
    cleanRut,
    formatRut,
    calculateRutVerifier,
    isValidRut,
    isPassportFormat
} from '../../utils/rutUtils';

describe('rutUtils', () => {
    describe('cleanRut', () => {
        it('should remove dots and dashes and uppercase K', () => {
            expect(cleanRut('12.345.678-k')).toBe('12345678K');
        });
    });

    describe('formatRut', () => {
        it('should format clean RUT string', () => {
            expect(formatRut('12345678k')).toBe('12.345.678-K');
        });

        it('should return original string if too short', () => {
            expect(formatRut('1')).toBe('1');
        });
    });

    describe('calculateRutVerifier', () => {
        it('should calculate numeric verifier', () => {
            expect(calculateRutVerifier('12345678')).toBe('5');
        });

        it('should return "0" when remainder is 11', () => {
            // Need a RUT body where sum % 11 === 0, so 11 - 0 = 11
            // Try RUT 15.545.400 -> Body 15545400
            // 0*2 + 0*3 + 4*4 + 5*5 + 4*6 + 5*7 + 5*2 + 1*3 = 0+0+16+25+24+35+10+3 = 113
            // 113 % 11 = 3. Not 0.

            // RUT 19.428.683 -> Body 19428683
            // 3*2 + 8*3 + 6*4 + 8*5 + 2*6 + 4*7 + 9*2 + 1*3 = 6+24+24+40+12+28+18+3 = 155
            // 155 / 11 = 14.09. 11 * 14 = 154. 155 % 11 = 1.

            // Simplified: let's use a known one. RUT 1-9 is check digit 9.
            // 1*2 = 2. 11-2 = 9.

            // To get 11: sum % 11 must be 0.
            // Body "30" -> 0*2 + 3*3 = 9. 11-9=2.
            // Body "1" -> 1*2 = 2. 11-2=9.
            // Body "11" -> 1*2 + 1*3 = 5.
            // Body "43" -> 3*2 + 4*3 = 6+12=18. 18%11=7. 11-7=4.

            // Known RUT with 0: 17.062.248-0
            expect(calculateRutVerifier('17062248')).toBe('0');
        });

        it('should return "K" when remainder is 10', () => {
            // Known RUT with K: 14.636.523-K
            expect(calculateRutVerifier('14636523')).toBe('K');
        });
    });

    describe('isValidRut', () => {
        it('should return true for valid RUT', () => {
            expect(isValidRut('12.345.678-5')).toBe(true);
            expect(isValidRut('14.636.523-K')).toBe(true);
        });

        it('should return false for invalid RUT', () => {
            expect(isValidRut('12.345.678-0')).toBe(false);
        });

        it('should return false if empty', () => {
            expect(isValidRut('')).toBe(false);
        });

        it('should return false if too short', () => {
            expect(isValidRut('1')).toBe(false);
        });

        it('should return false if body is not numeric', () => {
            expect(isValidRut('12A45.678-5')).toBe(false);
        });
    });

    describe('isPassportFormat', () => {
        it('should return true for passport format', () => {
            expect(isPassportFormat('A1234567')).toBe(true);
            expect(isPassportFormat('123-ABC-456')).toBe(true);
        });

        it('should return false for purely numeric values', () => {
            expect(isPassportFormat('12345678')).toBe(false);
        });

        it('should return false if empty', () => {
            expect(isPassportFormat('')).toBe(false);
        });
    });
});
