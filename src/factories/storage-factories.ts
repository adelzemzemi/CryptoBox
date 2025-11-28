import type { ISecureStorage, IEncryptor } from '@core/interfaces';
import { SecureStorage } from '@secure-storage/SecureStorage';
import { SessionStorage } from '@storage/SessionStorage';
import { LocalStorage } from '@storage/LocalStorage';
import { MemoryStorage } from '@storage/MemoryStorage';
import { AesGcmEncryptor } from '@crypto/AesGcmEncryptor';

/**
 * Create secure session storage
 * @param encryptor - Custom encryptor (defaults to AES-GCM)
 * @returns Secure storage instance
 */
export function createSecureSessionStorage(
  encryptor: IEncryptor = new AesGcmEncryptor()
): ISecureStorage {
  return new SecureStorage(new SessionStorage(), encryptor);
}

/**
 * Create secure local storage
 * @param encryptor - Custom encryptor (defaults to AES-GCM)
 * @returns Secure storage instance
 */
export function createSecureLocalStorage(
  encryptor: IEncryptor = new AesGcmEncryptor()
): ISecureStorage {
  return new SecureStorage(new LocalStorage(), encryptor);
}

/**
 * Create secure memory storage
 * @param encryptor - Custom encryptor (defaults to AES-GCM)
 * @returns Secure storage instance
 */
export function createSecureMemoryStorage(
  encryptor: IEncryptor = new AesGcmEncryptor()
): ISecureStorage {
  return new SecureStorage(new MemoryStorage(), encryptor);
}

/**
 * @deprecated Use factory functions or SecureStorage constructor instead
 */

export class SecureSessionStorage extends SecureStorage {
  constructor(encryptor: IEncryptor = new AesGcmEncryptor()) {
    super(new SessionStorage(), encryptor);
  }
}

export class SecureLocalStorage extends SecureStorage {
  constructor(encryptor: IEncryptor = new AesGcmEncryptor()) {
    super(new LocalStorage(), encryptor);
  }
}

export class SecureMemoryStorage extends SecureStorage {
  constructor(encryptor: IEncryptor = new AesGcmEncryptor()) {
    super(new MemoryStorage(), encryptor);
  }
}
