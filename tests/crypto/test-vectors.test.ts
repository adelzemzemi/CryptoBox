import { describe, it, expect } from 'vitest';
import { decrypt, inspect, rewrap } from '@crypto/algorithms/aes-gcm';
import { decodeBase64, encodeBase64 } from '@crypto/encoding/base64';

/**
 * Frozen ciphertexts, committed as literals.
 *
 * Every other test in this suite produces its own ciphertext with the current code,
 * so a change that broke the format on both the write and the read side would stay
 * invisible: the generator and the reader would drift together and the assertion
 * would still pass, while every byte already stored by a user became unreadable.
 *
 * These vectors were produced once and must never be regenerated. If one of them
 * stops decrypting, the format changed — that is a breaking change for stored data,
 * not a test to update.
 */
const PASSWORD = 'correct horse battery staple';

/**
 * A password holding **decomposed** combining marks: `e` + U+0301 rather than `é`.
 *
 * Written as escapes so that no editor, formatter or filesystem can silently
 * recompose it. An ASCII-only password would not catch a Unicode normalisation
 * step creeping into key derivation — that change is a no-op on ASCII and would
 * lock every non-ASCII password out of its own data.
 */
const PASSWORD_UNICODE = 'cle\u0301 secre\u0300te \u{1F510}';

const ASCII = '{"user":"alice","id":42}';
const UNICODE = 'ØÇ 你好世界 🔐 émojis';

/** Version 0: `salt || iv || body`, no header, fixed 100,000 iterations. Written by 1.0.x. */
const V0_ASCII =
  'WYb/Hbsesqf8zeimGpEiIl0a6sXPz5Z+SthYwElBwk5kQ6HV8zx8l+MYMxuTrMLvO/3STKBSdsRAmNCtATUHoix8HyM=';
const V0_UNICODE =
  'cyJdZpvY48caO2OaiS4ZYPtyTfENtpEQei0cjsm/tQjZjmLd0c/zVHFRmqsC+ws+VWY1rH666W54II+Ta1xlNLKnryyla9knyyg=';

/** Version 2: headered, header authenticated, 1,000 iterations, no context. */
const V2_PLAIN =
  'AgAAA+gVWJSttFis+qdFdK2FktEawxkVnqjgyIyFkZhBdwhugN9vzRHRmA8Kc0FnrcUEJRcfLriLQn7t7SzhA4C7FaRWtzo+8g==';
const V2_UNICODE =
  'AgAAA+hzAyORNEOnulO77vWaFgRzZ18iELnNy79+idLAIT2yJOZRFGnue+yM1CgqKyZ2rHGdMHCvQK/7TngNomu021m9LDFbzBOIuKPckA==';

/** Version 2 bound to the context `user:42`. */
const V2_CONTEXT =
  'AgAAA+g1FOLK6fQfWFWoJnzX2s0lxIkbX8PwNy1iLMHAZ30amO5355E9VJVMzHBKEHkYcM6skITN/KV9m5m3h8zVUyoJUZt4xA==';

/** Version 2 written with {@link PASSWORD_UNICODE}. */
const V2_UNICODE_PASSWORD =
  'AgAAA+gS1SlgU0Fc3aJSS4jP7l4qN2kYyGSJ9VOZJ+jabQxdXVUAh75PDnDpyhXedRcHs0ezPAoZiFW8uzzKu2gq0Sgoj9lAqQ==';

/** Version 2 written with the shipped default iteration count. */
const V2_DEFAULT =
  'AgAJJ8B9qOAkRO/bd5fRfYqvta0omNMxKNOxphGairdiuxPyVBBj7xq8PhgnNqEDi53tAhTYFUH15D4Bke/YS5hLOl/+J1XTpA==';

/** Return a copy of a frozen vector with one envelope byte replaced. */
function patchByte(ciphertext: string, offset: number, value: number): string {
  const bytes = decodeBase64(ciphertext);
  bytes[offset] = value;
  return encodeBase64(bytes);
}

describe('frozen test vectors', () => {
  describe('version 0, written by 1.0.x', () => {
    it('should still decrypt', async () => {
      expect(await decrypt(V0_ASCII, PASSWORD)).toBe(ASCII);
    });

    it('should still decrypt a unicode payload byte for byte', async () => {
      expect(await decrypt(V0_UNICODE, PASSWORD)).toBe(UNICODE);
    });

    it('should report the legacy parameters', () => {
      expect(inspect(V0_ASCII)).toEqual({
        version: 0,
        iterations: 100_000,
        contextBound: false,
      });
    });

    it('should upgrade to the current format without losing the payload', async () => {
      const upgraded = await rewrap(V0_ASCII, PASSWORD, {
        iterations: 1000,
        allowWeakIterations: true,
      });

      expect(inspect(upgraded)).toEqual({ version: 2, iterations: 1000, contextBound: true });
      expect(await decrypt(upgraded, PASSWORD)).toBe(ASCII);
    });
  });

  describe('version 2', () => {
    it('should decrypt an unbound vector', async () => {
      expect(await decrypt(V2_PLAIN, PASSWORD)).toBe(ASCII);
    });

    it('should decrypt a unicode payload byte for byte', async () => {
      expect(await decrypt(V2_UNICODE, PASSWORD)).toBe(UNICODE);
    });

    it('should decrypt a context-bound vector only with its context', async () => {
      expect(await decrypt(V2_CONTEXT, PASSWORD, { context: 'user:42' })).toBe(ASCII);

      await expect(decrypt(V2_CONTEXT, PASSWORD, { context: 'user:43' })).rejects.toThrow(
        'Decryption failed'
      );
      await expect(decrypt(V2_CONTEXT, PASSWORD)).rejects.toThrow('Decryption failed');
    });

    it('should decrypt a vector written at the shipped default iteration count', async () => {
      expect(inspect(V2_DEFAULT).iterations).toBe(600_000);
      expect(await decrypt(V2_DEFAULT, PASSWORD)).toBe(ASCII);
    });

    it('should report the current parameters', () => {
      expect(inspect(V2_PLAIN)).toEqual({ version: 2, iterations: 1000, contextBound: true });
    });
  });

  describe('password encoding', () => {
    it('should keep deriving the same key from a decomposed unicode password', async () => {
      expect(PASSWORD_UNICODE.normalize('NFC')).not.toBe(PASSWORD_UNICODE);

      expect(await decrypt(V2_UNICODE_PASSWORD, PASSWORD_UNICODE)).toBe(ASCII);
    });

    it('should not accept the composed form of the same password', async () => {
      await expect(decrypt(V2_UNICODE_PASSWORD, PASSWORD_UNICODE.normalize('NFC'))).rejects.toThrow(
        'Decryption failed'
      );
    });
  });

  describe('tamper resistance, against frozen bytes', () => {
    it('should reject a version byte downgraded to 1', async () => {
      await expect(decrypt(patchByte(V2_PLAIN, 0, 1), PASSWORD)).rejects.toThrow(
        'Decryption failed'
      );
    });

    it('should reject a tampered iteration count', async () => {
      await expect(decrypt(patchByte(V2_PLAIN, 4, 0xe9), PASSWORD)).rejects.toThrow(
        'Decryption failed'
      );
    });

    it('should reject a flipped ciphertext byte', async () => {
      const bytes = decodeBase64(V2_PLAIN);
      const last = bytes.length - 1;

      await expect(
        decrypt(patchByte(V2_PLAIN, last, (bytes[last] ?? 0) ^ 0x01), PASSWORD)
      ).rejects.toThrow('Decryption failed');
    });

    it('should reject the wrong password', async () => {
      await expect(decrypt(V2_PLAIN, 'wrong password')).rejects.toThrow('Decryption failed');
      await expect(decrypt(V0_ASCII, 'wrong password')).rejects.toThrow('Decryption failed');
    });
  });
});
