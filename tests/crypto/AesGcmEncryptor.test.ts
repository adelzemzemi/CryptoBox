import { describe, it, expect } from 'vitest';
import { AesGcmEncryptor } from '@crypto/AesGcmEncryptor';

describe('AesGcmEncryptor', () => {
  const encryptor = new AesGcmEncryptor();
  const password = 'test-password';

  it('should encrypt and decrypt string', async () => {
    const data = 'Hello, World!';
    const encrypted = await encryptor.encrypt(data, password);
    const decrypted = await encryptor.decrypt<string>(encrypted, password);
    expect(decrypted).toBe(data);
  });

  it('should encrypt and decrypt number', async () => {
    const data = 42;
    const encrypted = await encryptor.encrypt(data, password);
    const decrypted = await encryptor.decrypt<number>(encrypted, password);
    expect(decrypted).toBe(data);
  });

  it('should encrypt and decrypt boolean', async () => {
    const data = true;
    const encrypted = await encryptor.encrypt(data, password);
    const decrypted = await encryptor.decrypt<boolean>(encrypted, password);
    expect(decrypted).toBe(data);
  });

  it('should encrypt and decrypt array', async () => {
    const data = [1, 2, 3, 'test', true];
    const encrypted = await encryptor.encrypt(data, password);
    const decrypted = await encryptor.decrypt<typeof data>(encrypted, password);
    expect(decrypted).toEqual(data);
  });

  it('should encrypt and decrypt object', async () => {
    const data = { id: 123, name: 'Alice', active: true, tags: ['admin'] };
    const encrypted = await encryptor.encrypt(data, password);
    const decrypted = await encryptor.decrypt<typeof data>(encrypted, password);
    expect(decrypted).toEqual(data);
  });

  it('should encrypt and decrypt nested object', async () => {
    const data = {
      user: { id: 1, profile: { name: 'Bob', age: 30 } },
      settings: { theme: 'dark', notifications: true }
    };
    const encrypted = await encryptor.encrypt(data, password);
    const decrypted = await encryptor.decrypt<typeof data>(encrypted, password);
    expect(decrypted).toEqual(data);
  });

  it('should fail with wrong password', async () => {
    const data = { secret: 'value' };
    const encrypted = await encryptor.encrypt(data, password);
    await expect(encryptor.decrypt(encrypted, 'wrong-password')).rejects.toThrow();
  });

  it('should handle null value', async () => {
    const data = null;
    const encrypted = await encryptor.encrypt(data, password);
    await expect(encryptor.decrypt(encrypted, password)).rejects.toThrow('Invalid JSON');
  });

  it('should handle unicode in objects', async () => {
    const data = { message: '你好 🔐', emoji: '🚀' };
    const encrypted = await encryptor.encrypt(data, password);
    const decrypted = await encryptor.decrypt<typeof data>(encrypted, password);
    expect(decrypted).toEqual(data);
  });
});
