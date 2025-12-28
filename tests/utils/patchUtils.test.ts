/**
 * Patch Utils Tests
 * Tests for the applyPatches utility function.
 */

import { describe, it, expect } from 'vitest';
import { applyPatches } from '../../utils/patchUtils';

describe('applyPatches', () => {
    describe('basic operations', () => {
        it('returns original object when null or undefined', () => {
            expect(applyPatches(null, {})).toBeNull();
            expect(applyPatches(undefined, {})).toBeUndefined();
        });

        it('applies top-level patches', () => {
            const obj = { name: 'Juan', age: 30 };
            const result = applyPatches(obj, { name: 'María' });

            expect(result.name).toBe('María');
            expect(result.age).toBe(30);
        });

        it('does not mutate original object', () => {
            const original = { name: 'Juan' };
            const result = applyPatches(original, { name: 'María' });

            expect(original.name).toBe('Juan');
            expect(result.name).toBe('María');
        });
    });

    describe('nested paths', () => {
        it('applies single-level nested patches', () => {
            const obj = { beds: { R1: { patientName: '' } } };
            const result = applyPatches(obj, { 'beds.R1.patientName': 'Juan Pérez' });

            expect(result.beds.R1.patientName).toBe('Juan Pérez');
        });

        it('applies deeply nested patches', () => {
            const obj = { beds: { R1: { cudyr: { vitalSigns: 0 } } } };
            const result = applyPatches(obj, { 'beds.R1.cudyr.vitalSigns': 3 });

            expect(result.beds.R1.cudyr.vitalSigns).toBe(3);
        });

        it('creates missing intermediate structures', () => {
            const obj = { beds: {} };
            const result = applyPatches(obj, { 'beds.R5.patientName': 'Nuevo Paciente' });

            expect(result.beds.R5).toBeDefined();
            expect(result.beds.R5.patientName).toBe('Nuevo Paciente');
        });

        it('handles null intermediate structures', () => {
            const obj = { beds: { R1: null } };
            const result = applyPatches(obj, { 'beds.R1.patientName': 'Test' });

            expect(result.beds.R1.patientName).toBe('Test');
        });
    });

    describe('multiple patches', () => {
        it('applies multiple patches in one call', () => {
            const obj = { beds: { R1: { patientName: '', rut: '' } } };
            const result = applyPatches(obj, {
                'beds.R1.patientName': 'Juan Pérez',
                'beds.R1.rut': '12345678-9'
            });

            expect(result.beds.R1.patientName).toBe('Juan Pérez');
            expect(result.beds.R1.rut).toBe('12345678-9');
        });

        it('applies patches to different branches', () => {
            const obj = { beds: { R1: {}, R2: {} } };
            const result = applyPatches(obj, {
                'beds.R1.patientName': 'Paciente 1',
                'beds.R2.patientName': 'Paciente 2'
            });

            expect(result.beds.R1.patientName).toBe('Paciente 1');
            expect(result.beds.R2.patientName).toBe('Paciente 2');
        });
    });

    describe('value types', () => {
        it('handles string values', () => {
            const result = applyPatches({}, { name: 'Test' });
            expect(result.name).toBe('Test');
        });

        it('handles number values', () => {
            const result = applyPatches({}, { count: 42 });
            expect(result.count).toBe(42);
        });

        it('handles boolean values', () => {
            const result = applyPatches({}, { isActive: true });
            expect(result.isActive).toBe(true);
        });

        it('handles null values', () => {
            const result = applyPatches({ name: 'Test' }, { name: null });
            expect(result.name).toBeNull();
        });

        it('handles array values', () => {
            const result = applyPatches({}, { items: ['a', 'b', 'c'] });
            expect(result.items).toEqual(['a', 'b', 'c']);
        });

        it('handles object values', () => {
            const result = applyPatches({}, { data: { foo: 'bar' } });
            expect(result.data).toEqual({ foo: 'bar' });
        });
    });
});
