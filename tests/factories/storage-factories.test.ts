import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  createSecureSessionStorage,
  createSecureLocalStorage,
  createSecureMemoryStorage,
} from '@factories/storage-factories';
import { AesGcmEncryptor } from '@crypto/AesGcmEncryptor';

function createFakeWebStorage() {
  const data = new Map<string, string>();
  return {
    setItem: (k: string, v: string) => void data.set(k, v),
    getItem: (k: string) => data.get(k) ?? null,
    removeItem: (k: string) => void data.delete(k),
  };
}

const fast = { encryptor: new AesGcmEncryptor({ iterations: 1000, allowWeakIterations: true }) };

describe('Storage Factories', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', createFakeWebStorage());
    vi.stubGlobal('sessionStorage', createFakeWebStorage());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('should expose the full secure storage contract', () => {
    const storage = createSecureMemoryStorage();

    const contract = ['setSecure', 'getSecure', 'remove', 'has', 'needsRewrap', 'rewrap'] as const;

    for (const method of contract) {
      expect(typeof storage[method]).toBe('function');
    }
  });

  it('should create secure local storage', () => {
    expect(createSecureLocalStorage()).toBeDefined();
  });

  it('should create secure session storage', () => {
    expect(createSecureSessionStorage()).toBeDefined();
  });

  it('should be constructible outside the browser, for SSR', () => {
    vi.stubGlobal('localStorage', undefined);
    vi.stubGlobal('sessionStorage', undefined);

    expect(() => createSecureLocalStorage()).not.toThrow();
    expect(() => createSecureSessionStorage()).not.toThrow();
  });

  it('should surface a clear error when it is actually used outside the browser', async () => {
    vi.stubGlobal('localStorage', undefined);
    const storage = createSecureLocalStorage(fast);

    await expect(storage.setSecure('k', { a: 1 }, 'pw')).rejects.toMatchObject({
      code: 'STORAGE_UNAVAILABLE',
    });
    await expect(storage.getSecure('k', 'pw')).rejects.toThrow(/localStorage is not available/);
  });

  it('should work with memory storage', async () => {
    const storage = createSecureMemoryStorage(fast);
    const data = { id: 123, name: 'test' };

    await storage.setSecure('key1', data, 'test-pass');
    expect(await storage.getSecure<typeof data>('key1', 'test-pass')).toEqual(data);
  });

  it('should round-trip through a stubbed localStorage', async () => {
    const storage = createSecureLocalStorage(fast);
    const data = { token: 'abc' };

    await storage.setSecure('auth', data, 'pw');
    expect(await storage.getSecure<typeof data>('auth', 'pw')).toEqual(data);
  });

  it('should round-trip through a stubbed sessionStorage', async () => {
    const storage = createSecureSessionStorage(fast);

    await storage.setSecure('auth', { token: 'abc' }, 'pw');
    expect(await storage.getSecure<{ token: string }>('auth', 'pw')).toEqual({ token: 'abc' });
  });

  it('should accept a custom encryptor', async () => {
    const storage = createSecureMemoryStorage({
      encryptor: {
        encrypt: async <T>(data: T) => `plain:${JSON.stringify(data)}`,
        decrypt: async <T>(raw: string) => JSON.parse(raw.replace('plain:', '')) as T,
      },
    });

    await storage.setSecure('k', { a: 1 }, 'ignored');
    expect(await storage.getSecure<{ a: number }>('k', 'ignored')).toEqual({ a: 1 });
  });

  it('should refuse an encryptor passed positionally, as 1.x accepted', () => {
    const encryptor = new AesGcmEncryptor({ iterations: 1000, allowWeakIterations: true });
    const factories = [
      createSecureMemoryStorage,
      createSecureLocalStorage,
      createSecureSessionStorage,
    ] as unknown as ((encryptor: AesGcmEncryptor) => unknown)[];

    for (const factory of factories) {
      expect(() => factory(encryptor)).toThrow(
        expect.objectContaining({ code: 'INVALID_ARGUMENT' })
      );
    }
  });

  it('should forward the secure storage options', async () => {
    const storage = createSecureMemoryStorage({ ...fast, bindToKey: false });

    await storage.setSecure('k', { a: 1 }, 'pw');
    expect(await storage.getSecure<{ a: number }>('k', 'pw')).toEqual({ a: 1 });
  });
});
