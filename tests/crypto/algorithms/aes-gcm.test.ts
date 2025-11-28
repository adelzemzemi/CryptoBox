import { describe, it, expect } from 'vitest';
import { encrypt, decrypt } from '@crypto/algorithms/aes-gcm';

describe('AES-GCM Encryption', () => {
  const password = 'test-password-123';
  const plaintext = 'Hello, World!';

  it('should encrypt and decrypt successfully', async () => {
    const encrypted = await encrypt(plaintext, password);
    const decrypted = await decrypt(encrypted, password);
    expect(decrypted).toBe(plaintext);
  });

  it('should produce different ciphertexts for same input', async () => {
    const encrypted1 = await encrypt(plaintext, password);
    const encrypted2 = await encrypt(plaintext, password);
    expect(encrypted1).not.toBe(encrypted2);
  });

  it('should fail with wrong password', async () => {
    const encrypted = await encrypt(plaintext, password);
    await expect(decrypt(encrypted, 'wrong-password')).rejects.toThrow('Decryption failed');
  });

  it('should fail with corrupted data', async () => {
    const encrypted = await encrypt(plaintext, password);
    const corrupted = encrypted.slice(0, -5) + 'XXXXX';
    await expect(decrypt(corrupted, password)).rejects.toThrow();
  });

  it('should fail with too short data', async () => {
    await expect(decrypt('dGVzdA==', password)).rejects.toThrow('Invalid encrypted data: too short');
  });

  it('should handle empty string', async () => {
    const encrypted = await encrypt('', password);
    const decrypted = await decrypt(encrypted, password);
    expect(decrypted).toBe('');
  });

  it('should handle unicode characters', async () => {
    const unicode = '你好世界 🔐 émojis';
    const encrypted = await encrypt(unicode, password);
    const decrypted = await decrypt(encrypted, password);
    expect(decrypted).toBe(unicode);
  });

  it('should handle very long strings', async () => {
    const longText = 'a'.repeat(10000);
    const encrypted = await encrypt(longText, password);
    const decrypted = await decrypt(encrypted, password);
    expect(decrypted).toBe(longText);
  });
});
