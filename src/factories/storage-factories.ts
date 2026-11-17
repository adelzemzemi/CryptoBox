import type { ISecureStorage, IEncryptor } from '../core/interfaces/index.js';
import { SecureStorage, type SecureStorageOptions } from '../secure-storage/SecureStorage.js';
import { SessionStorage } from '../storage/SessionStorage.js';
import { LocalStorage } from '../storage/LocalStorage.js';
import { MemoryStorage } from '../storage/MemoryStorage.js';
import { AesGcmEncryptor } from '../crypto/AesGcmEncryptor.js';
import { CryptoBoxError } from '../core/errors.js';

/** Arguments shared by the secure storage factories. */
export interface SecureStorageFactoryOptions extends SecureStorageOptions {
  /** Encryption strategy. Defaults to AES-256-GCM. */
  encryptor?: IEncryptor;
}

function split(options: SecureStorageFactoryOptions): [IEncryptor, SecureStorageOptions] {
  // 1.x took the encryptor positionally. Untyped callers still doing so would
  // otherwise have it silently replaced by the default one.
  if (typeof (options as Partial<IEncryptor>).encrypt === 'function') {
    throw new CryptoBoxError(
      'INVALID_ARGUMENT',
      'The secure storage factories take an options object: pass { encryptor } instead of the encryptor itself.'
    );
  }

  const { encryptor, ...storageOptions } = options;
  return [encryptor ?? new AesGcmEncryptor(), storageOptions];
}

/**
 * Create secure `sessionStorage`-backed storage, for runtimes that provide the
 * global. Building it is always safe; each operation rejects with
 * `STORAGE_UNAVAILABLE` where `sessionStorage` is absent or blocked.
 *
 * @param options - Encryptor and secure storage behaviour
 * @returns Secure storage instance
 * @throws CryptoBoxError `INVALID_ARGUMENT` if an encryptor is passed in place of the options object
 */
export function createSecureSessionStorage(
  options: SecureStorageFactoryOptions = {}
): ISecureStorage {
  const [encryptor, storageOptions] = split(options);
  return new SecureStorage(new SessionStorage(), encryptor, storageOptions);
}

/**
 * Create secure `localStorage`-backed storage, for runtimes that provide the
 * global. Building it is always safe; each operation rejects with
 * `STORAGE_UNAVAILABLE` where `localStorage` is absent or blocked.
 *
 * @param options - Encryptor and secure storage behaviour
 * @returns Secure storage instance
 * @throws CryptoBoxError `INVALID_ARGUMENT` if an encryptor is passed in place of the options object
 */
export function createSecureLocalStorage(
  options: SecureStorageFactoryOptions = {}
): ISecureStorage {
  const [encryptor, storageOptions] = split(options);
  return new SecureStorage(new LocalStorage(), encryptor, storageOptions);
}

/**
 * Create secure in-memory storage. Works in every runtime.
 *
 * @param options - Encryptor and secure storage behaviour
 * @returns Secure storage instance
 * @throws CryptoBoxError `INVALID_ARGUMENT` if an encryptor is passed in place of the options object
 */
export function createSecureMemoryStorage(
  options: SecureStorageFactoryOptions = {}
): ISecureStorage {
  const [encryptor, storageOptions] = split(options);
  return new SecureStorage(new MemoryStorage(), encryptor, storageOptions);
}
