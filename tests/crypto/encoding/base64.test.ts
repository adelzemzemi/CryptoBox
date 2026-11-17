import { describe, it, expect, afterEach, vi } from 'vitest';
import { encodeBase64, decodeBase64 } from '@crypto/encoding/base64';

describe('Base64 Encoding', () => {
  it('should encode and decode successfully', () => {
    const data = new Uint8Array([1, 2, 3, 4, 5]);
    expect(decodeBase64(encodeBase64(data))).toEqual(data);
  });

  it('should handle all byte values (0-255)', () => {
    const data = new Uint8Array(256);
    for (let i = 0; i < 256; i++) data[i] = i;
    expect(decodeBase64(encodeBase64(data))).toEqual(data);
  });

  it('should handle empty array', () => {
    const data = new Uint8Array([]);
    expect(decodeBase64(encodeBase64(data))).toEqual(data);
  });

  it('should handle large data without exhausting the call stack', () => {
    const data = new Uint8Array(300_000).fill(42);
    expect(decodeBase64(encodeBase64(data))).toEqual(data);
  });

  it('should produce valid base64 string', () => {
    const data = new Uint8Array([72, 101, 108, 108, 111]); // "Hello"
    expect(encodeBase64(data)).toMatch(/^[A-Za-z0-9+/]*={0,2}$/);
  });

  it('should match Buffer output byte for byte', () => {
    const data = new Uint8Array([1, 2, 3, 4, 5, 250, 251, 252]);
    expect(encodeBase64(data)).toBe(Buffer.from(data).toString('base64'));
  });

  describe('runtime fallbacks', () => {
    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it('should fall back to Buffer when btoa/atob are absent', () => {
      const data = new Uint8Array([1, 2, 3, 250, 251, 252]);
      const expected = encodeBase64(data);

      vi.stubGlobal('btoa', undefined);
      vi.stubGlobal('atob', undefined);

      expect(encodeBase64(data)).toBe(expected);
      expect(decodeBase64(expected)).toEqual(data);
    });

    it('should throw when the runtime offers neither implementation', () => {
      vi.stubGlobal('btoa', undefined);
      vi.stubGlobal('atob', undefined);
      vi.stubGlobal('Buffer', undefined);

      expect(() => encodeBase64(new Uint8Array([1]))).toThrow('No base64 encoder available');
      expect(() => decodeBase64('AQ==')).toThrow('No base64 decoder available');
    });
  });

  describe('invalid input', () => {
    it('should reject characters outside the base64 alphabet', () => {
      expect(() => decodeBase64('!!!!')).toThrow('Invalid base64 input');
      expect(() => decodeBase64('@@@@')).toThrow('Invalid base64 input');
    });

    it('should reject a length that is not a multiple of four', () => {
      expect(() => decodeBase64('abc')).toThrow('Invalid base64 input');
    });

    it('should reject misplaced padding', () => {
      expect(() => decodeBase64('a=bc')).toThrow('Invalid base64 input');
    });

    it('should reject whitespace rather than silently ignoring it', () => {
      expect(() => decodeBase64('AA A=')).toThrow('Invalid base64 input');
    });
  });
});
