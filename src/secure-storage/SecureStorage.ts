import type { ISecureStorage, IEncryptor, IStorage } from '../core/interfaces/index.js';
import type { EncryptOptions, SecureReadOptions, TypedDecryptOptions } from '../core/options.js';
import { isCryptoBoxError } from '../core/errors.js';

/** Behaviour of a {@link SecureStorage} instance. */
export interface SecureStorageOptions {
  /**
   * Bind each ciphertext to the key it is stored under, so that a value moved to
   * another key no longer decrypts. Defaults to `true`.
   *
   * Disable it only if ciphertexts must remain transferable between keys — an
   * attacker who can write to the backend can then swap two stored values and
   * both will still decrypt.
   */
  bindToKey?: boolean;

  /**
   * Accept values written by 1.x, which predate key binding. Left unset, the
   * encryptor's own setting applies (`true` for a default {@link AesGcmEncryptor});
   * set here, it overrides the encryptor. Set it to `false` once
   * {@link SecureStorage.rewrap} has migrated the stored data, so a downgraded
   * value is rejected outright.
   */
  allowLegacy?: boolean;
}

function isAbsent(raw: string | null): raw is null | '' {
  return raw === null || raw === '';
}

/**
 * Storage decorator that encrypts on write and decrypts on read.
 *
 * The backend may be synchronous or asynchronous; every method here is async
 * either way.
 */
export class SecureStorage implements ISecureStorage {
  private readonly bindToKey: boolean;
  private readonly allowLegacy: boolean | undefined;

  /**
   * @param storage - Backend the ciphertexts are written to
   * @param encryptor - Encryption strategy
   * @param options - Key binding and legacy tolerance
   */
  constructor(
    private readonly storage: IStorage,
    private readonly encryptor: IEncryptor,
    options: SecureStorageOptions = {}
  ) {
    this.bindToKey = options.bindToKey ?? true;
    this.allowLegacy = options.allowLegacy;
  }

  private encryptOptions(key: string): EncryptOptions {
    return this.bindToKey ? { context: key } : {};
  }

  private async isCurrent(key: string, raw: string, password: string): Promise<boolean> {
    try {
      await this.encryptor.decrypt<unknown>(raw, password, {
        ...this.decryptOptions(key, {}),
        allowLegacy: false,
      });
      return true;
    } catch (error) {
      if (isCryptoBoxError(error, 'DECRYPTION_FAILED')) return false;
      throw error;
    }
  }

  private decryptOptions<T>(key: string, options: SecureReadOptions<T>): TypedDecryptOptions<T> {
    return {
      ...(this.allowLegacy === undefined ? {} : { allowLegacy: this.allowLegacy }),
      ...(this.bindToKey ? { context: key } : {}),
      ...(options.validate === undefined ? {} : { validate: options.validate }),
    };
  }

  /**
   * Encrypt and store a value.
   *
   * @param key - Storage key
   * @param data - Data to encrypt
   * @param password - Encryption password
   */
  async setSecure<T>(key: string, data: T, password: string): Promise<void> {
    const encrypted = await this.encryptor.encrypt(data, password, this.encryptOptions(key));
    await this.storage.setItem(key, encrypted);
  }

  /**
   * Read and decrypt a value.
   *
   * A stored `null` and an absent key both come back as `null`; call {@link has}
   * to tell them apart.
   *
   * @param key - Storage key
   * @param password - Decryption password
   * @param options - Optional runtime validation of the decrypted payload
   * @returns Decrypted data, or null if the key is absent
   * @throws CryptoBoxError if the password is wrong or the stored data is corrupted
   */
  async getSecure<T>(
    key: string,
    password: string,
    options: SecureReadOptions<T> = {}
  ): Promise<T | null> {
    const raw = await this.storage.getItem(key);
    if (isAbsent(raw)) return null;

    return this.encryptor.decrypt<T>(raw, password, this.decryptOptions(key, options));
  }

  /**
   * Remove a value.
   *
   * @param key - Storage key
   */
  async remove(key: string): Promise<void> {
    await this.storage.removeItem(key);
  }

  /**
   * Check whether a key holds a value.
   *
   * @param key - Storage key
   * @returns True if the key holds a non-empty value
   */
  async has(key: string): Promise<boolean> {
    return !isAbsent(await this.storage.getItem(key));
  }

  /**
   * Report whether a stored value was written with outdated parameters.
   *
   * Always false when the injected encryptor cannot inspect its own ciphertexts.
   * The answer is given without the password and is therefore an estimate: see
   * {@link rewrap}, which is authoritative.
   *
   * @param key - Storage key
   * @returns True if {@link rewrap} would rewrite the value
   */
  async needsRewrap(key: string): Promise<boolean> {
    const raw = await this.storage.getItem(key);
    if (isAbsent(raw)) return false;

    return this.encryptor.needsRewrap?.(raw) ?? false;
  }

  /**
   * Re-encrypt a stored value under the current envelope version and parameters.
   *
   * This is how data written before key binding acquires it, and how an old
   * iteration count is raised. The password is unchanged.
   *
   * A value is only reported as already current after it has decrypted as the
   * current format, so every call derives the key at least once and a wrong
   * password always throws. A 1.x value that merely looks current is caught here
   * and rewritten.
   *
   * @param key - Storage key
   * @param password - Password the value was written with
   * @returns True if the value was rewritten, false if it is absent or already current
   * @throws CryptoBoxError if the password is wrong
   */
  async rewrap(key: string, password: string): Promise<boolean> {
    const raw = await this.storage.getItem(key);
    if (isAbsent(raw)) return false;

    if (this.encryptor.needsRewrap?.(raw) === false && (await this.isCurrent(key, raw, password))) {
      return false;
    }

    const data = await this.encryptor.decrypt<unknown>(raw, password, this.decryptOptions(key, {}));
    await this.storage.setItem(
      key,
      await this.encryptor.encrypt(data, password, this.encryptOptions(key))
    );

    return true;
  }
}
