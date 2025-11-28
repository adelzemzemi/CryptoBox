import { describe, it, expect } from 'vitest';
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

    it('should return false for different lengths', () => {
      expect(timingSafeEqual('short', 'longer string')).toBe(false);
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

    it('should return false for different lengths', () => {
      const buf1 = new Uint8Array([1, 2]);
      const buf2 = new Uint8Array([1, 2, 3]);
      expect(timingSafeEqualBuffer(buf1, buf2)).toBe(false);
    });

    it('should handle empty buffers', () => {
      const buf1 = new Uint8Array([]);
      const buf2 = new Uint8Array([]);
      expect(timingSafeEqualBuffer(buf1, buf2)).toBe(true);
    });
  });

  describe('randomDelay', () => {
    it('should delay execution', async () => {
      const start = Date.now();
      await randomDelay(10, 20);
      const elapsed = Date.now() - start;
      expect(elapsed).toBeGreaterThanOrEqual(10);
      expect(elapsed).toBeLessThanOrEqual(50); // 20ms + tolerance
    });

    it('should return a promise', () => {
      const result = randomDelay(1, 2);
      expect(result).toBeInstanceOf(Promise);
    });
  });
});
