import { describe, it, expect } from 'vitest';
import * as cryptobox from '../src/index';
import * as fingerprint from '../src/fingerprint/index';

/** Guards the published export surface against accidental additions or removals. */
const EXPECTED_EXPORTS = [
  // errors
  'CryptoBoxError',
  'isCryptoBoxError',
  // tuning
  'ENVELOPE_VERSION',
  'PBKDF2_ITERATIONS',
  'PBKDF2_ITERATIONS_MAX',
  'PBKDF2_ITERATIONS_MIN',
  // crypto
  'AesGcmEncryptor',
  'decrypt',
  'deriveKey',
  'encrypt',
  'inspect',
  'needsRewrap',
  'rewrap',
  // encoding
  'decodeBase64',
  'encodeBase64',
  // storage
  'LocalStorage',
  'MemoryStorage',
  'SessionStorage',
  'resolveWebStorage',
  // secure storage + factories
  'SecureStorage',
  'createSecureLocalStorage',
  'createSecureMemoryStorage',
  'createSecureSessionStorage',
  // security helpers
  'randomDelay',
  'timingSafeEqual',
  'timingSafeEqualBuffer',
  // json utilities
  'isArray',
  'isBoolean',
  'isNumber',
  'isPlainObject',
  'isString',
  'safeJsonParse',
  'safeJsonStringify',
].sort();

const EXPECTED_FINGERPRINT_EXPORTS = [
  'CryptoBoxError',
  'getDeviceFingerprint',
  'isCryptoBoxError',
  'isDeviceFingerprintAvailable',
].sort();

describe('public API', () => {
  it('should export exactly the documented surface', () => {
    expect(Object.keys(cryptobox).sort()).toEqual(EXPECTED_EXPORTS);
  });

  it('should keep device fingerprinting out of the main entry', () => {
    expect(Object.keys(cryptobox)).not.toContain('getDeviceFingerprint');
  });

  it('should expose fingerprinting through its own entry point', () => {
    expect(Object.keys(fingerprint).sort()).toEqual(EXPECTED_FINGERPRINT_EXPORTS);
  });

  it('should no longer export the version 1 aliases', () => {
    const removed = [
      'encryptData',
      'decryptData',
      'encryptToken',
      'decryptToken',
      'SecureLocalStorage',
      'SecureSessionStorage',
      'SecureMemoryStorage',
      'LocalTokenStorage',
      'SessionTokenStorage',
      'MemoryTokenStorage',
    ];

    expect(Object.keys(cryptobox).filter(name => removed.includes(name))).toEqual([]);
  });

  it('should default to the OWASP-recommended iteration count', () => {
    expect(cryptobox.PBKDF2_ITERATIONS).toBe(600_000);
  });

  it('should write version 2 envelopes', () => {
    expect(cryptobox.ENVELOPE_VERSION).toBe(2);
  });
});
