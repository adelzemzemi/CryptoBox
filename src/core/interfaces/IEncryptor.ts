/**
 * Interface for encryption operations
 */
export interface IEncryptor {
  /**
   * Encrypt data with a password
   * @param data - Data to encrypt (any JSON-serializable type)
   * @param password - Encryption password
   * @returns Base64-encoded encrypted string
   */
  encrypt<T>(data: T, password: string): Promise<string>;

  /**
   * Decrypt data with a password
   * @param encryptedData - Base64-encoded encrypted string
   * @param password - Decryption password
   * @returns Decrypted and deserialized data
   * @throws Error if password is wrong or data is corrupted
   */
  decrypt<T>(encryptedData: string, password: string): Promise<T>;
}
