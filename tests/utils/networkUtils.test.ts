/**
 * Network Utilities Tests
 * Tests for the withRetry utility function.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { withRetry } from '../../utils/networkUtils';

describe('withRetry', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.clearAllMocks();
    });

    it('returns result when the function succeeds on the first attempt', async () => {
        const fn = vi.fn().mockResolvedValue('success');

        const result = await withRetry(fn);

        expect(result).toBe('success');
        expect(fn).toHaveBeenCalledTimes(1);
    });

    it('retries and succeeds after temporary failures', async () => {
        const fn = vi.fn()
            .mockRejectedValueOnce(new Error('Network error'))
            .mockRejectedValueOnce(new Error('Partial failure'))
            .mockResolvedValue('success');

        const onRetry = vi.fn();
        const resultPromise = withRetry(fn, {
            maxRetries: 3,
            initialDelay: 100,
            onRetry
        });

        // Wait for all retries and resolution
        await vi.advanceTimersByTimeAsync(100);
        await vi.advanceTimersByTimeAsync(200);

        const result = await resultPromise;

        expect(result).toBe('success');
        expect(fn).toHaveBeenCalledTimes(3);
        expect(onRetry).toHaveBeenCalledTimes(2);
    });

    it('fails after exhausting all retries', async () => {
        const error = new Error('Persistent failure');
        const fn = vi.fn().mockRejectedValue(error);

        const resultPromise = withRetry(fn, {
            maxRetries: 2,
            initialDelay: 100
        });

        // Attach a catch handler immediately to prevent unhandled rejection warnings
        resultPromise.catch(() => { });

        // Wait for retries
        await vi.advanceTimersByTimeAsync(100);
        await vi.advanceTimersByTimeAsync(200);

        await expect(resultPromise).rejects.toThrow('Persistent failure');
        expect(fn).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });

    it('uses exponential backoff for delays', async () => {
        const fn = vi.fn().mockRejectedValue(new Error('fail'));
        const initialDelay = 100;
        const factor = 2;

        const onRetry = vi.fn();
        const resultPromise = withRetry(fn, {
            maxRetries: 3,
            initialDelay,
            factor,
            onRetry
        });

        resultPromise.catch(() => { });

        // Attempt 1 fails -> wait 100
        await vi.advanceTimersByTimeAsync(100);
        expect(onRetry).toHaveBeenNthCalledWith(1, expect.any(Error), 1, 100);

        // Attempt 2 fails -> wait 200
        await vi.advanceTimersByTimeAsync(200);
        expect(onRetry).toHaveBeenNthCalledWith(2, expect.any(Error), 2, 200);

        // Attempt 3 fails -> wait 400
        await vi.advanceTimersByTimeAsync(400);
        expect(onRetry).toHaveBeenNthCalledWith(3, expect.any(Error), 3, 400);

        await expect(resultPromise).rejects.toThrow();
    });

    it('respects maxDelay limit', async () => {
        const fn = vi.fn().mockRejectedValue(new Error('fail'));
        const initialDelay = 1000;
        const maxDelay = 2000;
        const factor = 5;

        const onRetry = vi.fn();
        const resultPromise = withRetry(fn, {
            maxRetries: 3,
            initialDelay,
            maxDelay,
            factor,
            onRetry
        });

        resultPromise.catch(() => { });

        // Attempt 1: delay 1000
        await vi.advanceTimersByTimeAsync(1000);

        // Attempt 2: delay 1000 * 5 = 5000 -> capped at 2000
        await vi.advanceTimersByTimeAsync(2000);

        // Attempt 3: delay 2000 * 5 = 10000 -> capped at 2000
        await vi.advanceTimersByTimeAsync(2000);

        await expect(resultPromise).rejects.toThrow();
        expect(onRetry).toHaveBeenCalledTimes(3);
        expect(onRetry).toHaveBeenNthCalledWith(2, expect.any(Error), 2, 2000);
        expect(onRetry).toHaveBeenNthCalledWith(3, expect.any(Error), 3, 2000);
    });
});
