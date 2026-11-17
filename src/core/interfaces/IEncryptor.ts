import type { EncryptOptions, TypedDecryptOptions } from '../options.js';

/** Encrypts and decrypts arbitrary values, handling serialization itself. */
export interface IEncryptor {
  /**
   * Serialize and encrypt a value.
   *
   * @param data - Data to encrypt (any JSON-serializable value)
   * @param password - Encryption password
   * @param options - Iteration count and context binding
   * @returns Base64-encoded ciphertext
   */
  encrypt<T>(data: T, password: string, options?: EncryptOptions): Promise<string>;

  /**
   * Decrypt and deserialize a value.
   *
   * Without `options.validate` the generic parameter is an unchecked assertion:
   * the bytes are authentic, but nothing proves the payload still has the shape
   * the caller expects. Pass a type guard whenever the data outlives the code
   * that wrote it.
   *
   * @param ciphertext - Base64-encoded ciphertext
   * @param password - Decryption password
   * @param options - Context binding, legacy tolerance and runtime validation
   * @returns Decrypted data
   * @throws CryptoBoxError if the password, the context or the payload is wrong
   */
  decrypt<T>(ciphertext: string, password: string, options?: TypedDecryptOptions<T>): Promise<T>;

  /**
   * Report whether a ciphertext falls short of this encryptor's current
   * parameters and should be re-encrypted.
   *
   * Optional: an encryptor whose format carries no parameters cannot answer, and
   * callers must treat its absence as "cannot tell".
   *
   * @param ciphertext - Base64-encoded ciphertext
   * @returns True if the ciphertext should be re-encrypted
   */
  needsRewrap?(ciphertext: string): boolean;
}
