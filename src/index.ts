// Errors
export { CryptoBoxError, isCryptoBoxError } from './core/errors.js';
export type { CryptoBoxErrorCode } from './core/errors.js';

// Contracts
export type {
  IEncryptor,
  IStorage,
  IEnumerableStorage,
  ISecureStorage,
} from './core/interfaces/index.js';
export type { MaybePromise } from './core/types.js';
export type {
  EncryptOptions,
  DecryptOptions,
  TypedDecryptOptions,
  SecureReadOptions,
} from './core/options.js';

// Tuning
export {
  PBKDF2_ITERATIONS,
  PBKDF2_ITERATIONS_MIN,
  PBKDF2_ITERATIONS_MAX,
  ENVELOPE_VERSION,
} from './core/constants.js';

// Crypto
export { encrypt, decrypt, inspect, needsRewrap, rewrap } from './crypto/algorithms/aes-gcm.js';
export type { EnvelopeInfo, RewrapPolicy, RewrapOptions } from './crypto/algorithms/aes-gcm.js';
export { deriveKey } from './crypto/algorithms/key-derivation.js';
export { AesGcmEncryptor } from './crypto/AesGcmEncryptor.js';
export type { AesGcmEncryptorOptions } from './crypto/AesGcmEncryptor.js';

// Encoding
export { encodeBase64, decodeBase64 } from './crypto/encoding/base64.js';

// Storage
export { MemoryStorage } from './storage/MemoryStorage.js';
export { LocalStorage } from './storage/LocalStorage.js';
export { SessionStorage } from './storage/SessionStorage.js';
export { resolveWebStorage } from './storage/web-storage.js';
export type { WebStorageLike, WebStorageKind } from './storage/web-storage.js';

// Secure storage
export { SecureStorage } from './secure-storage/SecureStorage.js';
export type { SecureStorageOptions } from './secure-storage/SecureStorage.js';
export {
  createSecureSessionStorage,
  createSecureLocalStorage,
  createSecureMemoryStorage,
} from './factories/storage-factories.js';
export type { SecureStorageFactoryOptions } from './factories/storage-factories.js';

// Security helpers
export { timingSafeEqual, timingSafeEqualBuffer, randomDelay } from './security/timing-safe.js';

// JSON utilities
export {
  safeJsonParse,
  safeJsonStringify,
  isPlainObject,
  isString,
  isNumber,
  isBoolean,
  isArray,
} from './utils/json-utils.js';
