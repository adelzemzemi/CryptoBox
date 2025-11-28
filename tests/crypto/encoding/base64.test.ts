import { describe, it, expect } from 'vitest';
import { encodeBase64, decodeBase64, encodeBase64Buffer, decodeBase64Buffer } from '@crypto/encoding/base64';

describe('Base64 Encoding', () => {
  it('should encode and decode successfully', () => {
    const data = new Uint8Array([1, 2, 3, 4, 5]);
    const encoded = encodeBase64(data);
    const decoded = decodeBase64(encoded);
    expect(decoded).toEqual(data);
  });

  it('should handle all byte values (0-255)', () => {
    const data = new Uint8Array(256);
    for (let i = 0; i < 256; i++) {
      data[i] = i;
    }
    const encoded = encodeBase64(data);
    const decoded = decodeBase64(encoded);
    expect(decoded).toEqual(data);
  });

  it('should handle empty array', () => {
    const data = new Uint8Array([]);
    const encoded = encodeBase64(data);
    const decoded = decodeBase64(encoded);
    expect(decoded).toEqual(data);
  });

  it('should handle large data', () => {
    const data = new Uint8Array(10000).fill(42);
    const encoded = encodeBase64(data);
    const decoded = decodeBase64(encoded);
    expect(decoded).toEqual(data);
  });

  it('should produce valid base64 string', () => {
    const data = new Uint8Array([72, 101, 108, 108, 111]); // "Hello"
    const encoded = encodeBase64(data);
    expect(encoded).toMatch(/^[A-Za-z0-9+/]*={0,2}$/);
  });

  it('should handle Buffer fallback if available', () => {
    const data = new Uint8Array([1, 2, 3, 4, 5]);
    const encoded = encodeBase64Buffer(data);
    const decoded = decodeBase64Buffer(encoded);
    expect(decoded).toEqual(data);
  });
});
