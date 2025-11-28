import { deriveKey } from '@crypto/algorithms/key-derivation';
import { encodeBase64, decodeBase64 } from '@crypto/encoding/base64';
import { SALT_SIZE, IV_SIZE, ENCRYPTION_ALGORITHM } from '@core/constants';

/**
 * Encrypt a string using AES-256-GCM
 * @param plaintext - String to encrypt
 * @param password - Encryption password
 * @returns Base64-encoded encrypted data (salt + iv + ciphertext)
 */
export async function encrypt(plaintext: string, password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(plaintext);

  const salt = crypto.getRandomValues(new Uint8Array(SALT_SIZE));
  const iv = crypto.getRandomValues(new Uint8Array(IV_SIZE));

  const key = await deriveKey(password, salt);

  const encryptedBuffer = await crypto.subtle.encrypt(
    {
      name: ENCRYPTION_ALGORITHM,
      iv,
    },
    key,
    data
  );

  const encryptedArray = new Uint8Array(encryptedBuffer);
  const combined = new Uint8Array(salt.length + iv.length + encryptedArray.length);
  combined.set(salt, 0);
  combined.set(iv, salt.length);
  combined.set(encryptedArray, salt.length + iv.length);

  return encodeBase64(combined);
}

/**
 * Decrypt a string using AES-256-GCM
 * @param ciphertext - Base64-encoded encrypted data
 * @param password - Decryption password
 * @returns Decrypted plaintext
 * @throws Error if password is wrong or data is corrupted
 */
export async function decrypt(ciphertext: string, password: string): Promise<string> {
  const combined = decodeBase64(ciphertext);

  // Validate minimum length
  if (combined.length < SALT_SIZE + IV_SIZE) {
    throw new Error('Invalid encrypted data: too short');
  }

  const salt = combined.slice(0, SALT_SIZE);
  const iv = combined.slice(SALT_SIZE, SALT_SIZE + IV_SIZE);
  const encryptedData = combined.slice(SALT_SIZE + IV_SIZE);

  const key = await deriveKey(password, salt);

  try {
    const decryptedBuffer = await crypto.subtle.decrypt(
      {
        name: ENCRYPTION_ALGORITHM,
        iv,
      },
      key,
      encryptedData
    );

    const decoder = new TextDecoder();
    return decoder.decode(decryptedBuffer);
  } catch {
    // Generic error message to prevent timing attacks
    throw new Error('Decryption failed');
  }
}
