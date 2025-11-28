/**
 * Crypto module exports
 * Single entry point for all crypto-related functionality
 */

export { deriveKey } from './algorithms/key-derivation.js';
export { encrypt, decrypt } from './algorithms/aes-gcm.js';
export { AesGcmEncryptor } from './AesGcmEncryptor.js';
export { encodeBase64, decodeBase64 } from './encoding/base64.js';

// Legacy exports for backward compatibility
export { encrypt as encryptToken, decrypt as decryptToken } from './algorithms/aes-gcm.js';

/**
 * Encrypt any data (objects, arrays, primitives)
 * @deprecated Use AesGcmEncryptor class instead
 */
export async function encryptData<T>(data: T, password: string): Promise<string> {
  const { AesGcmEncryptor } = await import('./AesGcmEncryptor.js');
  const encryptor = new AesGcmEncryptor();
  return encryptor.encrypt(data, password);
}

/**
 * Decrypt and deserialize data
 * @deprecated Use AesGcmEncryptor class instead
 */
export async function decryptData<T>(encryptedData: string, password: string): Promise<T> {
  const { AesGcmEncryptor } = await import('./AesGcmEncryptor.js');
  const encryptor = new AesGcmEncryptor();
  return encryptor.decrypt<T>(encryptedData, password);
}
