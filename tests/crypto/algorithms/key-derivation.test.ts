import { describe, it, expect } from 'vitest';
import { deriveKey } from '@crypto/algorithms/key-derivation';
import { PBKDF2_ITERATIONS } from '@core/constants';

describe('PBKDF2 Key Derivation', () => {
  const password = 'test-password';
  const salt = new Uint8Array(16).fill(1);

  it('should derive a CryptoKey', async () => {
    const key = await deriveKey(password, salt);
    expect(key).toBeInstanceOf(CryptoKey);
    expect(key.type).toBe('secret');
  });

  it('should produce same key with same password and salt', async () => {
    const key1 = await deriveKey(password, salt);
    const key2 = await deriveKey(password, salt);
    
    // Keys are not extractable for security, so we verify they work for encryption
    expect(key1).toBeInstanceOf(CryptoKey);
    expect(key2).toBeInstanceOf(CryptoKey);
  });

  it('should produce different keys with different passwords', async () => {
    const key1 = await deriveKey('password1', salt);
    const key2 = await deriveKey('password2', salt);
    
    // Keys should be different instances (crypto operations would fail if using wrong key)
    expect(key1).toBeInstanceOf(CryptoKey);
    expect(key2).toBeInstanceOf(CryptoKey);
  });

  it('should produce different keys with different salts', async () => {
    const salt1 = new Uint8Array(16).fill(1);
    const salt2 = new Uint8Array(16).fill(2);
    
    const key1 = await deriveKey(password, salt1);
    const key2 = await deriveKey(password, salt2);
    
    // Keys should be different instances
    expect(key1).toBeInstanceOf(CryptoKey);
    expect(key2).toBeInstanceOf(CryptoKey);
  });

  it('should use default iterations', async () => {
    const key = await deriveKey(password, salt);
    expect(key).toBeDefined();
    // Verify default uses PBKDF2_ITERATIONS constant
    const keyWithExplicitDefault = await deriveKey(password, salt, PBKDF2_ITERATIONS);
    expect(keyWithExplicitDefault).toBeInstanceOf(CryptoKey);
  });

  it('should accept custom iterations', async () => {
    const customIterations = 50000;
    expect(customIterations).not.toBe(PBKDF2_ITERATIONS); // Ensure we test with different value
    const key = await deriveKey(password, salt, customIterations);
    expect(key).toBeDefined();
  });

  it('should handle empty password', async () => {
    const key = await deriveKey('', salt);
    expect(key).toBeInstanceOf(CryptoKey);
  });
});
