import { CryptoBoxError } from '../../core/errors.js';

const BASE64_PATTERN = /^[A-Za-z0-9+/]*={0,2}$/;

const CHUNK_SIZE = 0x8000;

interface BufferLike {
  from(data: Uint8Array): { toString(encoding: string): string };
  from(data: string, encoding: string): Uint8Array;
}

function getBuffer(): BufferLike | null {
  const candidate = (globalThis as { Buffer?: BufferLike }).Buffer;
  return typeof candidate === 'undefined' ? null : candidate;
}

/**
 * Encode binary data to a base64 string.
 *
 * @param data - Binary data
 * @returns Base64-encoded string
 * @throws CryptoBoxError `UNSUPPORTED_ENVIRONMENT` if the runtime has no base64 encoder
 */
export function encodeBase64(data: Uint8Array): string {
  if (typeof btoa === 'function') {
    let binary = '';
    for (let i = 0; i < data.length; i += CHUNK_SIZE) {
      binary += String.fromCharCode(...data.subarray(i, i + CHUNK_SIZE));
    }
    return btoa(binary);
  }

  const buffer = getBuffer();
  if (buffer) return buffer.from(data).toString('base64');

  throw new CryptoBoxError(
    'UNSUPPORTED_ENVIRONMENT',
    'No base64 encoder available in this runtime'
  );
}

/**
 * Decode a base64 string to binary data.
 *
 * @param base64 - Base64-encoded string
 * @returns Binary data
 * @throws CryptoBoxError `INVALID_BASE64` if the input is not well-formed base64
 * @throws CryptoBoxError `UNSUPPORTED_ENVIRONMENT` if the runtime has no base64 decoder
 */
export function decodeBase64(base64: string): Uint8Array {
  if (typeof base64 !== 'string' || base64.length % 4 !== 0 || !BASE64_PATTERN.test(base64)) {
    throw new CryptoBoxError('INVALID_BASE64', 'Invalid base64 input');
  }

  if (typeof atob === 'function') {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }

  const buffer = getBuffer();
  if (buffer) return new Uint8Array(buffer.from(base64, 'base64'));

  throw new CryptoBoxError(
    'UNSUPPORTED_ENVIRONMENT',
    'No base64 decoder available in this runtime'
  );
}
