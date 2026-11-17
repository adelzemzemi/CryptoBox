import { deriveKey } from '@crypto/algorithms/key-derivation';
import { encodeBase64 } from '@crypto/encoding/base64';
import { SALT_SIZE, IV_SIZE, ENVELOPE_VERSION, PBKDF2_ITERATIONS_LEGACY } from '@core/constants';

/** A random salt whose first byte cannot be mistaken for a version 2 header. */
export function plainSalt(): Uint8Array<ArrayBuffer> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_SIZE));
  salt[0] = 0xa0;
  return salt;
}

/** A salt that reads as a version 2 header declaring the given iteration count. */
export function collidingSalt(iterations: number): Uint8Array<ArrayBuffer> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_SIZE));
  salt[0] = ENVELOPE_VERSION;
  new DataView(salt.buffer).setUint32(1, iterations, false);
  return salt;
}

/** Build a version 0 ciphertext as 1.x wrote it: salt || iv || body, 100k iterations. */
export async function encryptV0(
  plaintext: string,
  password: string,
  salt: Uint8Array<ArrayBuffer> = plainSalt()
): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(IV_SIZE));
  const key = await deriveKey(password, salt, PBKDF2_ITERATIONS_LEGACY);

  const body = new Uint8Array(
    await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(plaintext))
  );

  const combined = new Uint8Array(salt.length + iv.length + body.length);
  combined.set(salt, 0);
  combined.set(iv, salt.length);
  combined.set(body, salt.length + iv.length);
  return encodeBase64(combined);
}
