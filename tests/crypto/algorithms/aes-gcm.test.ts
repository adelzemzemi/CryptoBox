import { describe, it, expect, vi } from 'vitest';
import { encrypt, decrypt, inspect, needsRewrap, rewrap } from '@crypto/algorithms/aes-gcm';
import { encodeBase64, decodeBase64 } from '@crypto/encoding/base64';
import { encryptV0, collidingSalt } from '../../helpers/v0';
import {
  SALT_SIZE,
  IV_SIZE,
  ENVELOPE_VERSION,
  ENVELOPE_HEADER_SIZE,
  PBKDF2_ITERATIONS,
  PBKDF2_ITERATIONS_LEGACY,
  PBKDF2_ITERATIONS_MAX,
} from '@core/constants';

/** Return a copy of a ciphertext with one envelope byte replaced. */
function patchByte(ciphertext: string, offset: number, value: number): string {
  const bytes = decodeBase64(ciphertext);
  bytes[offset] = value;
  return encodeBase64(bytes);
}

describe('AES-GCM Encryption', () => {
  const password = 'test-password-123';
  const plaintext = 'Hello, World!';
  const fast = { iterations: 1000, allowWeakIterations: true };

  it('should encrypt and decrypt successfully', async () => {
    const encrypted = await encrypt(plaintext, password, fast);
    expect(await decrypt(encrypted, password)).toBe(plaintext);
  });

  it('should produce different ciphertexts for same input', async () => {
    expect(await encrypt(plaintext, password, fast)).not.toBe(
      await encrypt(plaintext, password, fast)
    );
  });

  it('should fail with wrong password', async () => {
    const encrypted = await encrypt(plaintext, password, fast);
    await expect(decrypt(encrypted, 'wrong-password')).rejects.toThrow('Decryption failed');
  });

  it('should handle empty string', async () => {
    const encrypted = await encrypt('', password, fast);
    expect(await decrypt(encrypted, password)).toBe('');
  });

  it('should handle unicode characters', async () => {
    const unicode = '你好世界 🔐 émojis';
    expect(await decrypt(await encrypt(unicode, password, fast), password)).toBe(unicode);
  });

  it('should handle very long strings', async () => {
    const longText = 'a'.repeat(10000);
    expect(await decrypt(await encrypt(longText, password, fast), password)).toBe(longText);
  });

  describe('envelope format', () => {
    it('should emit a version 2 header carrying the iteration count', async () => {
      const bytes = decodeBase64(await encrypt(plaintext, password));

      expect(bytes[0]).toBe(ENVELOPE_VERSION);

      const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
      expect(view.getUint32(1, false)).toBe(PBKDF2_ITERATIONS);
      expect(bytes.length).toBeGreaterThan(ENVELOPE_HEADER_SIZE + SALT_SIZE + IV_SIZE);
    });

    it('should record a custom iteration count and read it back', async () => {
      const encrypted = await encrypt(plaintext, password, {
        iterations: 1000,
        allowWeakIterations: true,
      });

      expect(inspect(encrypted)).toEqual({
        version: ENVELOPE_VERSION,
        iterations: 1000,
        contextBound: true,
      });
      expect(await decrypt(encrypted, password)).toBe(plaintext);
    });

    it('should reject an out-of-range iteration count', async () => {
      for (const iterations of [0, PBKDF2_ITERATIONS_MAX + 1, 1.5]) {
        await expect(encrypt(plaintext, password, { iterations })).rejects.toThrow(
          'Invalid iteration count'
        );
      }
    });
  });

  describe('write minimum', () => {
    it('should refuse to write below the minimum unless explicitly allowed', async () => {
      await expect(encrypt(plaintext, password, { iterations: 99_999 })).rejects.toMatchObject({
        code: 'INVALID_ITERATIONS',
        message: expect.stringContaining('allowWeakIterations'),
      });
    });

    it('should apply the minimum to rewrap as well', async () => {
      const encrypted = await encrypt(plaintext, password, fast);

      await expect(rewrap(encrypted, password, { iterations: 1000 })).rejects.toMatchObject({
        code: 'INVALID_ITERATIONS',
      });
    });

    it('should keep reading a ciphertext written below the minimum', async () => {
      const encrypted = await encrypt(plaintext, password, fast);
      expect(await decrypt(encrypted, password, { allowLegacy: false })).toBe(plaintext);
    });
  });

  describe('header authentication', () => {
    it('should reject a tampered version byte', async () => {
      const encrypted = await encrypt(plaintext, password, fast);

      await expect(decrypt(patchByte(encrypted, 0, 1), password)).rejects.toThrow(
        'Decryption failed'
      );
    });

    it('should reject a tampered iteration count', async () => {
      const encrypted = await encrypt(plaintext, password, {
        iterations: 1000,
        allowWeakIterations: true,
      });
      await expect(decrypt(patchByte(encrypted, 4, 0xff), password)).rejects.toThrow(
        'Decryption failed'
      );
    });
  });

  describe('context binding', () => {
    it('should round-trip when the context matches', async () => {
      const encrypted = await encrypt(plaintext, password, { ...fast, context: 'user:42' });
      expect(await decrypt(encrypted, password, { context: 'user:42' })).toBe(plaintext);
    });

    it('should fail when the context differs', async () => {
      const encrypted = await encrypt(plaintext, password, { ...fast, context: 'user:42' });

      await expect(decrypt(encrypted, password, { context: 'user:43' })).rejects.toThrow(
        'Decryption failed'
      );
      await expect(decrypt(encrypted, password)).rejects.toThrow('Decryption failed');
    });

    it('should fail when a context is supplied for an unbound ciphertext', async () => {
      const encrypted = await encrypt(plaintext, password, fast);
      await expect(decrypt(encrypted, password, { context: 'unexpected' })).rejects.toThrow(
        'Decryption failed'
      );
    });

    it('should treat an absent context as the empty string', async () => {
      const encrypted = await encrypt(plaintext, password, { ...fast, context: '' });
      expect(await decrypt(encrypted, password)).toBe(plaintext);
    });
  });

  describe('backward compatibility', () => {
    it('should decrypt a version 0 ciphertext', async () => {
      const legacy = await encryptV0(plaintext, password);

      expect(inspect(legacy)).toEqual({
        version: 0,
        iterations: PBKDF2_ITERATIONS_LEGACY,
        contextBound: false,
      });
      expect(await decrypt(legacy, password)).toBe(plaintext);
    });

    it('should ignore a context when reading an unbound legacy ciphertext', async () => {
      const legacy = await encryptV0(plaintext, password);
      expect(await decrypt(legacy, password, { context: 'anything' })).toBe(plaintext);
    });

    it('should decrypt a version 0 ciphertext whose salt looks like a version 2 header', async () => {
      const colliding = await encryptV0(plaintext, password, collidingSalt(1000));

      // Without the key the two readings cannot be told apart.
      expect(inspect(colliding).version).toBe(ENVELOPE_VERSION);
      expect(await decrypt(colliding, password)).toBe(plaintext);
    });

    it('should migrate a colliding version 0 ciphertext through rewrap', async () => {
      const colliding = await encryptV0(plaintext, password, collidingSalt(1000));
      expect(needsRewrap(colliding, { minIterations: 1000 })).toBe(false);

      const upgraded = await rewrap(colliding, password, fast);

      expect(await decrypt(upgraded, password, { allowLegacy: false })).toBe(plaintext);
    });

    it('should still report a wrong password on legacy data', async () => {
      const legacy = await encryptV0(plaintext, password);
      await expect(decrypt(legacy, 'wrong-password')).rejects.toThrow('Decryption failed');
    });

    it('should refuse version 0 when allowLegacy is false', async () => {
      const legacy = await encryptV0(plaintext, password);

      await expect(decrypt(legacy, password, { allowLegacy: false })).rejects.toMatchObject({
        code: 'UNSUPPORTED_ENVELOPE',
        message: expect.stringContaining('version 0'),
      });
    });

    it('should still read version 2 when allowLegacy is false', async () => {
      const encrypted = await encrypt(plaintext, password, fast);
      expect(await decrypt(encrypted, password, { allowLegacy: false })).toBe(plaintext);
    });
  });

  describe('migration', () => {
    it('should flag ciphertexts below the current parameters', async () => {
      expect(needsRewrap(await encryptV0(plaintext, password))).toBe(true);
      expect(needsRewrap(await encrypt(plaintext, password))).toBe(false);
    });

    it('should honour an explicit policy', async () => {
      const encrypted = await encrypt(plaintext, password, {
        iterations: 1000,
        allowWeakIterations: true,
      });

      expect(needsRewrap(encrypted, { minIterations: 1000 })).toBe(false);
      expect(needsRewrap(encrypted, { minIterations: 2000 })).toBe(true);
      expect(needsRewrap(encrypted, { minIterations: 1000, minVersion: 3 })).toBe(true);
    });

    it('should upgrade a version 0 ciphertext in place', async () => {
      const legacy = await encryptV0(plaintext, password);
      const upgraded = await rewrap(legacy, password, {
        iterations: 1000,
        allowWeakIterations: true,
      });

      expect(inspect(upgraded).version).toBe(ENVELOPE_VERSION);
      expect(needsRewrap(upgraded, { minIterations: 1000 })).toBe(false);
      expect(await decrypt(upgraded, password)).toBe(plaintext);
    });

    it('should attach a context that legacy data never had', async () => {
      const legacy = await encryptV0(plaintext, password);
      const bound = await rewrap(legacy, password, {
        iterations: 1000,
        allowWeakIterations: true,
        context: 'user:42',
      });

      expect(await decrypt(bound, password, { context: 'user:42', allowLegacy: false })).toBe(
        plaintext
      );
      await expect(decrypt(bound, password, { context: 'user:43' })).rejects.toThrow(
        'Decryption failed'
      );
    });

    it('should move a ciphertext from one context to another', async () => {
      const encrypted = await encrypt(plaintext, password, { ...fast, context: 'old' });
      const moved = await rewrap(encrypted, password, {
        ...fast,
        previousContext: 'old',
        context: 'new',
      });

      expect(await decrypt(moved, password, { context: 'new' })).toBe(plaintext);
    });

    it('should fail on the wrong password rather than write garbage', async () => {
      const encrypted = await encrypt(plaintext, password, fast);
      await expect(rewrap(encrypted, 'wrong', fast)).rejects.toThrow('Decryption failed');
    });
  });

  describe('malformed input', () => {
    it('should reject data that is not valid base64', async () => {
      await expect(decrypt('!!!not-base64!!!', password)).rejects.toMatchObject({
        code: 'MALFORMED_CIPHERTEXT',
      });
    });

    it('should reject data that is too short', async () => {
      await expect(decrypt('dGVzdA==', password)).rejects.toThrow(
        'Invalid encrypted data: too short'
      );
      expect(() => inspect('dGVzdA==')).toThrow('Invalid encrypted data: too short');
    });

    it('should report corrupted data exactly like a wrong password', async () => {
      const encrypted = await encrypt(plaintext, password, fast);
      const corrupted = encrypted.slice(0, -5) + 'AAAA=';

      await expect(decrypt(corrupted, password)).rejects.toThrow('Decryption failed');
      await expect(decrypt(encrypted, 'wrong-password')).rejects.toThrow('Decryption failed');
    });

    it('should refuse an envelope claiming an absurd iteration count', async () => {
      const hostile = new Uint8Array(ENVELOPE_HEADER_SIZE + SALT_SIZE + IV_SIZE + 16);
      hostile[0] = ENVELOPE_VERSION;
      hostile.fill(0xff, 1, 5);

      const start = Date.now();
      await expect(decrypt(encodeBase64(hostile), password)).rejects.toThrow('Decryption failed');
      expect(Date.now() - start).toBeLessThan(5000);
    });

    it('should call a damaged version 2 envelope malformed, not legacy', async () => {
      const encrypted = await encrypt(plaintext, password, fast);
      const zeroIterations = decodeBase64(encrypted);
      zeroIterations.fill(0, 1, ENVELOPE_HEADER_SIZE);

      await expect(
        decrypt(encodeBase64(zeroIterations), password, { allowLegacy: false })
      ).rejects.toMatchObject({ code: 'MALFORMED_CIPHERTEXT' });
    });

    it('should not relabel a missing base64 decoder as malformed input', async () => {
      const encrypted = await encrypt(plaintext, password, fast);
      vi.stubGlobal('atob', undefined);
      vi.stubGlobal('Buffer', undefined);

      try {
        await expect(decrypt(encrypted, password)).rejects.toMatchObject({
          code: 'UNSUPPORTED_ENVIRONMENT',
        });
      } finally {
        vi.unstubAllGlobals();
      }
    });

    it('should not leak the runtime base64 error type', async () => {
      await expect(decrypt('@@@@', password)).rejects.not.toThrow('InvalidCharacterError');
    });
  });
});
