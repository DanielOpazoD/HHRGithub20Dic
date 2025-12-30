import { describe, it, expect, vi } from 'vitest';
import { createMockDatabase } from '../../../services/storage/indexedDBService';

describe('IndexedDB Mock - createMockDatabase', () => {
    it('should implement startsWith to prevent runtime errors in search logic', async () => {
        const mockDb = createMockDatabase();

        // This simulates the call: db.dailyRecords.where('date').startsWith('2024-12')
        const collection = mockDb.dailyRecords.where('date');

        expect(collection.startsWith).toBeDefined();
        expect(typeof collection.startsWith).toBe('function');

        const result = collection.startsWith('2024-12');
        expect(result.toArray).toBeDefined();

        const data = await result.toArray();
        expect(Array.isArray(data)).toBe(true);
        expect(data).toHaveLength(0);
    });

    it('should allow chaining where and equals and toArray', async () => {
        const mockDb = createMockDatabase();
        const data = await mockDb.dailyRecords.where('date').equals('2024-12-28').toArray();
        expect(data).toHaveLength(0);
    });
});
