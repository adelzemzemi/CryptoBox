import { describe, it, expect, vi } from 'vitest';
import { SecureStorage } from '@secure-storage/SecureStorage';
import type { IStorage, IEncryptor } from '@core/interfaces';

// Mock storage
class MockStorage implements IStorage {
  private data = new Map<string, string>();

  setItem(key: string, value: string): void {
    this.data.set(key, value);
  }

  getItem(key: string): string | null {
    return this.data.get(key) ?? null;
  }

  removeItem(key: string): void {
    this.data.delete(key);
  }
}

// Mock encryptor
class MockEncryptor implements IEncryptor {
  async encrypt<T>(data: T, password: string): Promise<string> {
    const json = JSON.stringify(data);
    // Use a separator that won't appear in JSON
    return `encrypted|||${json}|||${password}`;
  }

  async decrypt<T>(encryptedData: string, password: string): Promise<T> {
    const parts = encryptedData.split('|||');
    if (parts.length !== 3 || parts[0] !== 'encrypted' || parts[2] !== password) {
      throw new Error('Decryption failed');
    }
    return JSON.parse(parts[1]) as T;
  }
}

describe('SecureStorage', () => {
  const storage = new MockStorage();
  const encryptor = new MockEncryptor();
  const secureStorage = new SecureStorage(storage, encryptor);
  const password = 'test-pass';

  it('should store and retrieve data', async () => {
    const data = { id: 123, name: 'test' };
    await secureStorage.setSecure('key1', data, password);
    const retrieved = await secureStorage.getSecure<typeof data>('key1', password);
    expect(retrieved).toEqual(data);
  });

  it('should return null for non-existent key', async () => {
    const result = await secureStorage.getSecure('nonexistent', password);
    expect(result).toBeNull();
  });

  it('should fail with wrong password', async () => {
    const data = { secret: 'value' };
    await secureStorage.setSecure('key2', data, password);
    await expect(secureStorage.getSecure('key2', 'wrong-pass')).rejects.toThrow('Failed to decrypt');
  });

  it('should remove data', async () => {
    await secureStorage.setSecure('key3', { test: 'data' }, password);
    secureStorage.remove('key3');
    const result = await secureStorage.getSecure('key3', password);
    expect(result).toBeNull();
  });

  it('should check if key exists', async () => {
    await secureStorage.setSecure('key4', { test: 'data' }, password);
    expect(secureStorage.has('key4')).toBe(true);
    expect(secureStorage.has('nonexistent')).toBe(false);
  });

  it('should handle different data types', async () => {
    const testCases = [
      { data: 'string', key: 'str' },
      { data: 123, key: 'num' },
      { data: true, key: 'bool' },
      { data: [1, 2, 3], key: 'arr' },
      { data: { nested: { value: 42 } }, key: 'obj' }
    ];

    for (const { data, key } of testCases) {
      await secureStorage.setSecure(key, data, password);
      const retrieved = await secureStorage.getSecure(key, password);
      expect(retrieved).toEqual(data);
    }
  });
});
