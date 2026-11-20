import { describe, it, expect, vi } from 'vitest';
import { timingSafeEqual, timingSafeEqualBuffer, randomDelay } from '@security/timing-safe';

describe('Timing-Safe Utilities', () => {
  describe('timingSafeEqual', () => {
    it('should return true for equal strings', () => {
      expect(timingSafeEqual('test', 'test')).toBe(true);
      expect(timingSafeEqual('hello world', 'hello world')).toBe(true);
    });

    it('should return false for different strings', () => {
      expect(timingSafeEqual('test', 'test2')).toBe(false);
      expect(timingSafeEqual('abc', 'xyz')).toBe(false);
    });

    it('should return false for different lengths, in either order', () => {
      expect(timingSafeEqual('short', 'longer string')).toBe(false);
      expect(timingSafeEqual('longer string', 'short')).toBe(false);
    });

    it('should handle empty strings', () => {
      expect(timingSafeEqual('', '')).toBe(true);
      expect(timingSafeEqual('', 'a')).toBe(false);
    });

    it('should handle unicode', () => {
      expect(timingSafeEqual('你好', '你好')).toBe(true);
      expect(timingSafeEqual('🔐', '🔐')).toBe(true);
      expect(timingSafeEqual('你好', '世界')).toBe(false);
    });
  });

  describe('timingSafeEqualBuffer', () => {
    it('should return true for equal buffers', () => {
      const buf1 = new Uint8Array([1, 2, 3]);
      const buf2 = new Uint8Array([1, 2, 3]);
      expect(timingSafeEqualBuffer(buf1, buf2)).toBe(true);
    });

    it('should return false for different buffers', () => {
      const buf1 = new Uint8Array([1, 2, 3]);
      const buf2 = new Uint8Array([1, 2, 4]);
      expect(timingSafeEqualBuffer(buf1, buf2)).toBe(false);
    });

    it('should return false for different lengths, in either order', () => {
      const buf1 = new Uint8Array([1, 2]);
      const buf2 = new Uint8Array([1, 2, 3]);
      expect(timingSafeEqualBuffer(buf1, buf2)).toBe(false);
      expect(timingSafeEqualBuffer(buf2, buf1)).toBe(false);
    });

    it('should handle one empty buffer in either order', () => {
      const empty = new Uint8Array([]);
      const filled = new Uint8Array([1]);
      expect(timingSafeEqualBuffer(empty, filled)).toBe(false);
      expect(timingSafeEqualBuffer(filled, empty)).toBe(false);
    });

    it('should handle empty buffers', () => {
      const buf1 = new Uint8Array([]);
      const buf2 = new Uint8Array([]);
      expect(timingSafeEqualBuffer(buf1, buf2)).toBe(true);
    });
  });

  describe('randomDelay', () => {
    it('should wait for a duration inside the requested bounds', async () => {
      vi.useFakeTimers();
      const schedule = vi.spyOn(globalThis, 'setTimeout');

      try {
        const pending = randomDelay(10, 20);
        const delay = schedule.mock.calls[0]?.[1];

        expect(delay).toBeGreaterThanOrEqual(10);
        expect(delay).toBeLessThan(20);

        await vi.advanceTimersByTimeAsync(20);
        await pending;
      } finally {
        schedule.mockRestore();
        vi.useRealTimers();
      }
    });

    it('should return a promise', () => {
      const result = randomDelay(1, 2);
      expect(result).toBeInstanceOf(Promise);
    });
  });
});
