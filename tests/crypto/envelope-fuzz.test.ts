import { describe, it, expect } from 'vitest';
import { encrypt, decrypt, inspect } from '@crypto/algorithms/aes-gcm';
import { decodeBase64, encodeBase64 } from '@crypto/encoding/base64';
import { isCryptoBoxError } from '@core/errors';
import { ENVELOPE_VERSION, PBKDF2_ITERATIONS_MAX } from '@core/constants';

/**
 * Hostile and damaged input. Whatever the bytes, the reader must answer with one
 * of its own documented errors: never a runtime exception, never a plaintext.
 */
const PASSWORD = 'correct horse battery staple';
const PLAINTEXT = '{"user":"alice","id":42}';
const WRITE = { iterations: 1000, allowWeakIterations: true };
const REJECTIONS = ['MALFORMED_CIPHERTEXT', 'DECRYPTION_FAILED', 'UNSUPPORTED_ENVELOPE'];
const BASE64 = /^[A-Za-z0-9+/]*={0,2}$/;

/** Deterministic generator, so a failure reproduces on the next run. */
function mulberry32(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function randomBuffer(random: () => number, length: number): Uint8Array {
  const bytes = new Uint8Array(length);
  for (let i = 0; i < length; i++) bytes[i] = Math.floor(random() * 256);
  return bytes;
}

async function outcome(ciphertext: string, allowLegacy: boolean): Promise<string> {
  try {
    await decrypt(ciphertext, PASSWORD, { allowLegacy });
  } catch (error) {
    if (isCryptoBoxError(error)) return error.code;
    throw error;
  }
  return 'ACCEPTED';
}

describe('envelope parser under hostile input', () => {
  it('should describe or reject any buffer without the password', () => {
    const random = mulberry32(0xc0ffee);

    for (let i = 0; i < 5000; i++) {
      const bytes = randomBuffer(random, Math.floor(random() * 96));
      // Half the buffers announce the current version, to reach the header parser.
      if (bytes.length > 0 && random() < 0.5) bytes[0] = ENVELOPE_VERSION;

      let info;
      try {
        info = inspect(encodeBase64(bytes));
      } catch (error) {
        expect(isCryptoBoxError(error, 'MALFORMED_CIPHERTEXT')).toBe(true);
        continue;
      }

      expect([0, ENVELOPE_VERSION]).toContain(info.version);
      expect(info.iterations).toBeGreaterThanOrEqual(1);
      expect(info.iterations).toBeLessThanOrEqual(PBKDF2_ITERATIONS_MAX);
    }
  });

  it('should reject text that is not base64 at all', async () => {
    const random = mulberry32(0xbadc0de);

    for (let i = 0; i < 200; i++) {
      const text = String.fromCharCode(...randomBuffer(random, 1 + Math.floor(random() * 64)));
      if (BASE64.test(text) && text.length % 4 === 0) continue;

      expect(await outcome(text, true)).toBe('MALFORMED_CIPHERTEXT');
      expect(() => inspect(text)).toThrow(
        expect.objectContaining({ code: 'MALFORMED_CIPHERTEXT' })
      );
    }
  });

  it('should reject random buffers that announce the current version', async () => {
    const random = mulberry32(0x5eed);

    for (let i = 0; i < 300; i++) {
      const bytes = randomBuffer(random, 28 + Math.floor(random() * 64));
      bytes[0] = ENVELOPE_VERSION;
      // A small declared count keeps the derivation cheap.
      new DataView(bytes.buffer).setUint32(1, 1 + Math.floor(random() * 2000), false);

      expect(REJECTIONS).toContain(await outcome(encodeBase64(bytes), false));
    }
  });

  it('should reject every truncation of a valid ciphertext', async () => {
    const bytes = decodeBase64(await encrypt(PLAINTEXT, PASSWORD, WRITE));

    for (let length = 0; length < bytes.length; length++) {
      expect(REJECTIONS).toContain(await outcome(encodeBase64(bytes.slice(0, length)), false));
    }
  });

  it('should reject every single-bit flip of a valid ciphertext', async () => {
    const original = await encrypt(PLAINTEXT, PASSWORD, WRITE);
    const bytes = decodeBase64(original);

    for (let offset = 0; offset < bytes.length; offset++) {
      // Bytes 1 and 2 are the high half of the iteration count: flipping them asks
      // for millions of iterations. The tampered-count tests cover that field.
      if (offset === 1 || offset === 2) continue;

      for (let bit = 0; bit < 8; bit++) {
        const flipped = bytes.slice();
        flipped[offset] = (flipped[offset] ?? 0) ^ (1 << bit);

        expect(REJECTIONS).toContain(await outcome(encodeBase64(flipped), false));
      }
    }

    expect(await decrypt(original, PASSWORD, { allowLegacy: false })).toBe(PLAINTEXT);
  }, 30_000);
});
