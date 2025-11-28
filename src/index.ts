// Interfaces
export type { IEncryptor, IStorage, ISecureStorage } from './core/interfaces/index.js';

// Crypto
export { deriveKey } from './crypto/algorithms/key-derivation.js';
export { encrypt, decrypt } from './crypto/algorithms/aes-gcm.js';
export { AesGcmEncryptor } from './crypto/AesGcmEncryptor.js';
export { encryptToken, decryptToken, encryptData, decryptData } from './crypto/index.js';

// Storage
export { SessionStorage, LocalStorage, MemoryStorage } from './storage/index.js';
export { SessionTokenStorage, LocalTokenStorage, MemoryTokenStorage } from './storage/index.js';
export type { TokenStorage } from './storage/index.js';

// Secure Storage
export { SecureStorage } from './secure-storage/SecureStorage.js';

// Factories
export {
  createSecureSessionStorage,
  createSecureLocalStorage,
  createSecureMemoryStorage,
  SecureSessionStorage,
  SecureLocalStorage,
  SecureMemoryStorage
} from './factories/storage-factories.js';

// Fingerprint
export { getDeviceFingerprint } from './fingerprint/device-fingerprint.js';
