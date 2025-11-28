import { IEncryptor } from '../core/interfaces/index.js';
import { encrypt, decrypt } from './algorithms/aes-gcm.js';
import { safeJsonStringify, safeJsonParse } from '../utils/json-utils.js';

/**
 * AES-GCM encryptor with automatic JSON serialization/deserialization
 */
export class AesGcmEncryptor implements IEncryptor {
  /**
   * Encrypt any data type
   * @param data - Data to encrypt (will be JSON-serialized)
   * @param password - Encryption password
   * @returns Base64-encoded encrypted string
   */
  async encrypt<T>(data: T, password: string): Promise<string> {
    const serialized = safeJsonStringify(data);
    return encrypt(serialized, password);
  }

  /**
   * Decrypt and deserialize data
   * @param encryptedData - Base64-encoded encrypted string
   * @param password - Decryption password
   * @returns Decrypted and deserialized data
   * @throws Error if password is wrong or data is corrupted
   */
  async decrypt<T>(encryptedData: string, password: string): Promise<T> {
    const decrypted = await decrypt(encryptedData, password);
    return safeJsonParse<T>(decrypted);
  }
}
