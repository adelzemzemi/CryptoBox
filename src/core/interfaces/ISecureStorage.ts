/**
 * Interface for secure storage operations
 */
export interface ISecureStorage {
  /**
   * Store encrypted data
   * @param key - Storage key
   * @param data - Data to encrypt and store
   * @param password - Encryption password
   */
  setSecure<T>(key: string, data: T, password: string): Promise<void>;

  /**
   * Retrieve and decrypt data
   * @param key - Storage key
   * @param password - Decryption password
   * @returns Decrypted data or null if not found
   * @throws Error if password is wrong or data is corrupted
   */
  getSecure<T>(key: string, password: string): Promise<T | null>;

  /**
   * Remove data
   * @param key - Storage key
   */
  remove(key: string): void;

  /**
   * Check if key exists
   * @param key - Storage key
   * @returns true if key exists
   */
  has(key: string): boolean;
}
