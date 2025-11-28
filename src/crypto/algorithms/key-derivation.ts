import {
  PBKDF2_ITERATIONS,
  HASH_ALGORITHM,
  KEY_DERIVATION_ALGORITHM,
  ENCRYPTION_ALGORITHM,
  AES_KEY_LENGTH
} from '@core/constants';

/**
 * Derive encryption key from password using PBKDF2
 * @param password - User password
 * @param salt - Random salt (16 bytes recommended)
 * @param iterations - Number of PBKDF2 iterations (default from constants)
 * @returns CryptoKey for AES-GCM encryption
 */
export async function deriveKey(
  password: string,
  salt: Uint8Array,
  iterations: number = PBKDF2_ITERATIONS
): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const passwordBuffer = encoder.encode(password);

  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    passwordBuffer,
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
