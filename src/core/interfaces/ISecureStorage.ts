import type { SecureReadOptions } from '../options.js';

/**
 * A key-value store whose values are encrypted at rest.
 *
 * Every method is asynchronous, both because encryption is and because the
 * underlying {@link IStorage} may be.
 */
export interface ISecureStorage {
  /**
   * Encrypt and store a value.
   *
   * @param key - Storage key
   * @param data - Data to encrypt
   * @param password - Encryption password
   */
  setSecure<T>(key: string, data: T, password: string): Promise<void>;

  /**
   * Read and decrypt a value.
   *
   * A stored `null` and an absent key both come back as `null`; call
   * {@link ISecureStorage.has} to tell them apart.
   *
   * @param key - Storage key
   * @param password - Decryption password
   * @param options - Optional runtime validation of the decrypted payload
   * @returns Decrypted data, or null if the key is absent
   * @throws CryptoBoxError if the password is wrong or the stored data is corrupted
   */
  getSecure<T>(key: string, password: string, options?: SecureReadOptions<T>): Promise<T | null>;

  /**
   * Remove a value.
   *
   * @param key - Storage key
   */
  remove(key: string): Promise<void>;

  /**
   * Check whether a key holds a value.
   *
   * @param key - Storage key
   * @returns True if the key holds a non-empty value
   */
  has(key: string): Promise<boolean>;

  /**
   * Report whether a stored value was written with outdated parameters.
   *
   * Always false when the underlying encryptor cannot inspect its own ciphertexts.
   *
   * @param key - Storage key
   * @returns True if {@link ISecureStorage.rewrap} would rewrite the value
   */
  needsRewrap(key: string): Promise<boolean>;

  /**
   * Re-encrypt a stored value under the current envelope version and parameters.
   *
   * @param key - Storage key
   * @param password - Password the value was written with
   * @returns True if the value was rewritten, false if the key is absent or already current
   * @throws CryptoBoxError if the password is wrong
   */
  rewrap(key: string, password: string): Promise<boolean>;
}
