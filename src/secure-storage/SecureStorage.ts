import { ISecureStorage, IEncryptor, IStorage } from '@core/interfaces';

/**
 * Secure storage with automatic encryption/decryption
 */
export class SecureStorage implements ISecureStorage {
  constructor(
    private readonly storage: IStorage,
    private readonly encryptor: IEncryptor
  ) {}

  /**
   * Store encrypted data
   * @param key - Storage key
   * @param data - Data to encrypt and store
   * @param password - Encryption password
   */
  async setSecure<T>(key: string, data: T, password: string): Promise<void> {
    const encrypted = await this.encryptor.encrypt(data, password);
    this.storage.setItem(key, encrypted);
  }

  /**
   * Retrieve and decrypt data
   * @param key - Storage key
   * @param password - Decryption password
   * @returns Decrypted data or null if not found
   */
  async getSecure<T>(key: string, password: string): Promise<T | null> {
    const encrypted = this.storage.getItem(key);
    if (!encrypted) return null;
    
    try {
      return await this.encryptor.decrypt<T>(encrypted, password);
    } catch (error) {
      throw new Error(
        `Failed to decrypt data for key "${key}": ${error instanceof Error ? error.message : 'unknown error'}`
      );
    }
  }

  /**
   * Remove data
   * @param key - Storage key
   */
  remove(key: string): void {
    this.storage.removeItem(key);
  }

  /**
   * Check if key exists
   * @param key - Storage key
   * @returns True if key exists
   */
  has(key: string): boolean {
    return this.storage.getItem(key) !== null;
  }
}
