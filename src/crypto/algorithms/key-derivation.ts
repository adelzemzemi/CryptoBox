import { assertValidIterations } from '../envelope.js';
import {
  PBKDF2_ITERATIONS,
  HASH_ALGORITHM,
  KEY_DERIVATION_ALGORITHM,
  ENCRYPTION_ALGORITHM,
  AES_KEY_LENGTH,
} from '../../core/constants.js';

/**
 * Derive an AES-GCM key from a password using PBKDF2.
 *
 * @param password - User password
 * @param salt - Random salt (16 bytes recommended)
 * @param iterations - PBKDF2 iteration count (defaults to {@link PBKDF2_ITERATIONS})
 * @returns Non-extractable CryptoKey for AES-GCM
 * @throws CryptoBoxError `INVALID_ITERATIONS` if the iteration count is out of range
 */
export async function deriveKey(
  password: string,
  salt: Uint8Array,
  iterations: number = PBKDF2_ITERATIONS
): Promise<CryptoKey> {
  assertValidIterations(iterations);

  const passwordBuffer = new TextEncoder().encode(password);

  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    passwordBuffer as BufferSource,
    { name: KEY_DERIVATION_ALGORITHM },
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: KEY_DERIVATION_ALGORITHM,
      salt: salt as BufferSource,
      iterations,
      hash: HASH_ALGORITHM,
    },
    keyMaterial,
    { name: ENCRYPTION_ALGORITHM, length: AES_KEY_LENGTH },
    false,
    ['encrypt', 'decrypt']
  );
}
