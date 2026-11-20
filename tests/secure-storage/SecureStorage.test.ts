import { describe, it, expect, beforeEach } from 'vitest';
import { SecureStorage } from '@secure-storage/SecureStorage';
import { AesGcmEncryptor } from '@crypto/AesGcmEncryptor';
import { MemoryStorage } from '@storage/MemoryStorage';
import { isString } from '@utils/json-utils';
import type { IStorage, IEncryptor } from '@core/interfaces';
import { encryptV0, collidingSalt } from '../helpers/v0';

/** Backend that only ever answers asynchronously, as IndexedDB or a KV store would. */
class AsyncStorage implements IStorage {
  private data = new Map<string, string>();

  async setItem(key: string, value: string): Promise<void> {
    await Promise.resolve();
    this.data.set(key, value);
  }

  async getItem(key: string): Promise<string | null> {
    await Promise.resolve();
    return this.data.get(key) ?? null;
  }

  async removeItem(key: string): Promise<void> {
    await Promise.resolve();
    this.data.delete(key);
  }
}

class MockEncryptor implements IEncryptor {
  async encrypt<T>(data: T, password: string): Promise<string> {
    return `encrypted|||${JSON.stringify(data)}|||${password}`;
  }

  async decrypt<T>(ciphertext: string, password: string): Promise<T> {
    const parts = ciphertext.split('|||');
    if (parts.length !== 3 || parts[0] !== 'encrypted' || parts[2] !== password) {
      throw new Error('Decryption failed');
    }
    return JSON.parse(parts[1] ?? '') as T;
  }
}

const password = 'test-pass';
const fast = new AesGcmEncryptor({ iterations: 1000, allowWeakIterations: true });

describe('SecureStorage', () => {
  let secureStorage: SecureStorage;

  beforeEach(() => {
    secureStorage = new SecureStorage(new MemoryStorage(), new MockEncryptor());
  });

  it('should store and retrieve data', async () => {
    const data = { id: 123, name: 'test' };
    await secureStorage.setSecure('key1', data, password);
    expect(await secureStorage.getSecure<typeof data>('key1', password)).toEqual(data);
  });

  it('should return null for non-existent key', async () => {
    expect(await secureStorage.getSecure('nonexistent', password)).toBeNull();
  });

  it('should fail with wrong password', async () => {
    await secureStorage.setSecure('key2', { secret: 'value' }, password);
    await expect(secureStorage.getSecure('key2', 'wrong-pass')).rejects.toThrow(
      'Decryption failed'
    );
  });

  it('should not embed the storage key in the failure message', async () => {
    await secureStorage.setSecure('very-secret-key-name', { a: 1 }, password);

    await expect(secureStorage.getSecure('very-secret-key-name', 'wrong-pass')).rejects.toThrow(
      expect.objectContaining({
        message: expect.not.stringContaining('very-secret-key-name') as unknown as string,
      })
    );
  });

  it('should remove data', async () => {
    await secureStorage.setSecure('key3', { test: 'data' }, password);
    await secureStorage.remove('key3');
    expect(await secureStorage.getSecure('key3', password)).toBeNull();
  });

  it('should agree between has and getSecure', async () => {
    await secureStorage.setSecure('key4', { test: 'data' }, password);

    expect(await secureStorage.has('key4')).toBe(true);
    expect(await secureStorage.has('nonexistent')).toBe(false);
  });

  it('should treat a stored empty string as absent in both has and getSecure', async () => {
    const backend = new MemoryStorage();
    const store = new SecureStorage(backend, new MockEncryptor());
    backend.setItem('blank', '');

    expect(await store.has('blank')).toBe(false);
    expect(await store.getSecure('blank', password)).toBeNull();
  });

  it('should handle different data types', async () => {
    const testCases = [
      { data: 'string', key: 'str' },
      { data: 123, key: 'num' },
      { data: true, key: 'bool' },
      { data: [1, 2, 3], key: 'arr' },
      { data: { nested: { value: 42 } }, key: 'obj' },
      { data: null, key: 'null' },
    ];

    for (const { data, key } of testCases) {
      await secureStorage.setSecure(key, data, password);
      expect(await secureStorage.getSecure(key, password)).toEqual(data);
    }
  });
});

describe('SecureStorage over an asynchronous backend', () => {
  it('should await every backend call', async () => {
    const store = new SecureStorage(new AsyncStorage(), fast);
    const data = { token: 'abc' };

    await store.setSecure('auth', data, password);

    expect(await store.has('auth')).toBe(true);
    expect(await store.getSecure<typeof data>('auth', password)).toEqual(data);

    await store.remove('auth');
    expect(await store.has('auth')).toBe(false);
  });
});

describe('SecureStorage key binding', () => {
  it('should refuse a value moved to another key', async () => {
    const backend = new MemoryStorage();
    const store = new SecureStorage(backend, fast);

    await store.setSecure('role:guest', { admin: false }, password);
    await store.setSecure('role:admin', { admin: true }, password);

    // An attacker with write access to the backend swaps the two ciphertexts.
    backend.setItem('role:guest', backend.getItem('role:admin') ?? '');

    await expect(store.getSecure('role:guest', password)).rejects.toThrow('Decryption failed');
  });

  it('should allow relocation when binding is disabled', async () => {
    const backend = new MemoryStorage();
    const store = new SecureStorage(backend, fast, { bindToKey: false });

    await store.setSecure('a', { value: 1 }, password);
    backend.setItem('b', backend.getItem('a') ?? '');

    expect(await store.getSecure<{ value: number }>('b', password)).toEqual({ value: 1 });
  });
});

describe('SecureStorage validation', () => {
  it('should reject a payload that no longer matches the expected shape', async () => {
    const backend = new MemoryStorage();
    const store = new SecureStorage(backend, fast);

    await store.setSecure('token', 42, password);

    await expect(store.getSecure('token', password, { validate: isString })).rejects.toMatchObject({
      code: 'VALIDATION_FAILED',
    });
  });

  it('should pass a payload that matches', async () => {
    const store = new SecureStorage(new MemoryStorage(), fast);
    await store.setSecure('token', 'abc', password);

    expect(await store.getSecure('token', password, { validate: isString })).toBe('abc');
  });
});

describe('SecureStorage rewrap', () => {
  it('should report false for an absent key', async () => {
    const store = new SecureStorage(new MemoryStorage(), fast);
    expect(await store.rewrap('missing', password)).toBe(false);
    expect(await store.needsRewrap('missing')).toBe(false);
  });

  it('should leave an already current value untouched', async () => {
    const backend = new MemoryStorage();
    const store = new SecureStorage(
      backend,
      new AesGcmEncryptor({ iterations: 1000, allowWeakIterations: true })
    );

    await store.setSecure('k', { a: 1 }, password);
    const before = backend.getItem('k');

    expect(await store.needsRewrap('k')).toBe(false);
    expect(await store.rewrap('k', password)).toBe(false);
    expect(backend.getItem('k')).toBe(before);
  });

  it('should throw on a wrong password even when the value is current', async () => {
    const store = new SecureStorage(new MemoryStorage(), fast);
    await store.setSecure('k', { a: 1 }, password);

    await expect(store.rewrap('k', 'wrong')).rejects.toMatchObject({ code: 'DECRYPTION_FAILED' });
  });

  it('should not mistake an unrelated failure for an outdated value', async () => {
    const backend = new MemoryStorage();
    backend.setItem('k', 'opaque');

    const broken: IEncryptor = {
      encrypt: async () => 'never written',
      decrypt: async () => {
        throw new Error('backend exploded');
      },
      needsRewrap: () => false,
    };

    await expect(new SecureStorage(backend, broken).rewrap('k', password)).rejects.toThrow(
      'backend exploded'
    );
    expect(backend.getItem('k')).toBe('opaque');
  });

  it('should migrate a 1.x value whose salt passes for a current header', async () => {
    const backend = new MemoryStorage();
    backend.setItem('k', await encryptV0(JSON.stringify({ a: 1 }), password, collidingSalt(1000)));

    const store = new SecureStorage(backend, fast);
    expect(await store.needsRewrap('k')).toBe(false);
    expect(await store.rewrap('k', password)).toBe(true);

    const strict = new SecureStorage(backend, fast, { allowLegacy: false });
    expect(await strict.getSecure<{ a: number }>('k', password)).toEqual({ a: 1 });
  });

  it('should leave a value alone when it changed during the rewrap', async () => {
    const backend = new MemoryStorage();
    const old = new AesGcmEncryptor({ iterations: 1000, allowWeakIterations: true });
    await new SecureStorage(backend, old).setSecure('k', { items: 1 }, password);

    const current = new AesGcmEncryptor({ iterations: 4000, allowWeakIterations: true });
    const newer = await current.encrypt({ items: 99 }, password, { context: 'k' });

    // Another writer lands while the migration is busy deriving its key.
    const interrupted: IEncryptor = {
      decrypt: (ciphertext, pw, options) => current.decrypt(ciphertext, pw, options),
      needsRewrap: ciphertext => current.needsRewrap(ciphertext),
      encrypt: async (data, pw, options) => {
        backend.setItem('k', newer);
        return current.encrypt(data, pw, options);
      },
    };

    expect(await new SecureStorage(backend, interrupted).rewrap('k', password)).toBe(false);
    expect(backend.getItem('k')).toBe(newer);
  });

  it('should raise an outdated iteration count', async () => {
    const backend = new MemoryStorage();

    const oldStore = new SecureStorage(
      backend,
      new AesGcmEncryptor({ iterations: 1000, allowWeakIterations: true })
    );
    await oldStore.setSecure('k', { a: 1 }, password);

    const newStore = new SecureStorage(
      backend,
      new AesGcmEncryptor({ iterations: 4000, allowWeakIterations: true })
    );
    expect(await newStore.needsRewrap('k')).toBe(true);
    expect(await newStore.rewrap('k', password)).toBe(true);
    expect(await newStore.needsRewrap('k')).toBe(false);

    expect(await newStore.getSecure<{ a: number }>('k', password)).toEqual({ a: 1 });
  });

  it('should migrate a 1.x value whose salt looks like a count above the read cap', async () => {
    const backend = new MemoryStorage();
    backend.setItem('k', await encryptV0('"legacy"', password, collidingSalt(300_000)));

    const store = new SecureStorage(
      backend,
      new AesGcmEncryptor({ iterations: 1000, allowWeakIterations: true, maxIterations: 200_000 })
    );

    expect(await store.rewrap('k', password)).toBe(true);
    expect(await store.getSecure<string>('k', password)).toBe('legacy');
  });

  it('should report false when the encryptor cannot inspect its own ciphertexts', async () => {
    const store = new SecureStorage(new MemoryStorage(), new MockEncryptor());
    await store.setSecure('k', { a: 1 }, password);

    expect(await store.needsRewrap('k')).toBe(false);
    expect(await store.rewrap('k', password)).toBe(true);
  });
});

describe('SecureStorage legacy tolerance', () => {
  const strictEncryptor = new AesGcmEncryptor({
    iterations: 1000,
    allowWeakIterations: true,
    allowLegacy: false,
  });

  async function backendWithLegacyValue(): Promise<MemoryStorage> {
    const backend = new MemoryStorage();
    backend.setItem('k', await encryptV0(JSON.stringify({ a: 1 }), password));
    return backend;
  }

  it('should read 1.x values by default', async () => {
    const store = new SecureStorage(await backendWithLegacyValue(), fast);
    expect(await store.getSecure<{ a: number }>('k', password)).toEqual({ a: 1 });
  });

  it('should honour an encryptor that forbids legacy envelopes', async () => {
    const store = new SecureStorage(await backendWithLegacyValue(), strictEncryptor);

    await expect(store.getSecure('k', password)).rejects.toMatchObject({
      code: 'UNSUPPORTED_ENVELOPE',
    });
  });

  it('should let the store option override the encryptor in both directions', async () => {
    const lenient = new SecureStorage(await backendWithLegacyValue(), strictEncryptor, {
      allowLegacy: true,
    });
    expect(await lenient.getSecure<{ a: number }>('k', password)).toEqual({ a: 1 });

    const strict = new SecureStorage(await backendWithLegacyValue(), fast, { allowLegacy: false });
    await expect(strict.getSecure('k', password)).rejects.toMatchObject({
      code: 'UNSUPPORTED_ENVELOPE',
    });
  });
});

describe('SecureStorage stored null', () => {
  it('should return null for a stored null and tell it apart through has', async () => {
    const store = new SecureStorage(new MemoryStorage(), fast);
    await store.setSecure('k', null, password);

    expect(await store.getSecure('k', password)).toBeNull();
    expect(await store.has('k')).toBe(true);
    expect(await store.has('missing')).toBe(false);
  });
});
