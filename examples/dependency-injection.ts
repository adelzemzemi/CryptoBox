/**
 * Injecting a custom backend and a custom encryptor.
 *
 * `IStorage` accepts synchronous and asynchronous backends alike, so the same
 * `SecureStorage` works over `localStorage`, IndexedDB or a remote key-value store.
 */

import { SecureStorage, AesGcmEncryptor, MemoryStorage } from '../src';
import type { IStorage, IEncryptor, EncryptOptions, TypedDecryptOptions } from '../src';

/** An asynchronous backend, as IndexedDB or a network store would be. */
class AsyncStorage implements IStorage {
  private cache = new Map<string, string>();

  async setItem(key: string, value: string): Promise<void> {
    await Promise.resolve();
    this.cache.set(key, value);
  }

  async getItem(key: string): Promise<string | null> {
    await Promise.resolve();
    return this.cache.get(key) ?? null;
  }

  async removeItem(key: string): Promise<void> {
    await Promise.resolve();
    this.cache.delete(key);
  }
}

/** A decorator that counts operations without touching the crypto itself. */
class InstrumentedEncryptor implements IEncryptor {
  readonly counts = { encrypt: 0, decrypt: 0 };

  constructor(private readonly inner: IEncryptor) {}

  async encrypt<T>(data: T, password: string, options?: EncryptOptions): Promise<string> {
    this.counts.encrypt += 1;
    return this.inner.encrypt(data, password, options);
  }

  async decrypt<T>(
    ciphertext: string,
    password: string,
    options?: TypedDecryptOptions<T>
  ): Promise<T> {
    this.counts.decrypt += 1;
    return this.inner.decrypt<T>(ciphertext, password, options);
  }

  needsRewrap(ciphertext: string): boolean {
    return this.inner.needsRewrap?.(ciphertext) ?? false;
  }
}

async function main() {
  const encryptor = new InstrumentedEncryptor(new AesGcmEncryptor());
  const store = new SecureStorage(new AsyncStorage(), encryptor);

  await store.setSecure('key', { msg: 'Hello!' }, 'password');
  console.log('Retrieved:', await store.getSecure('key', 'password'));
  console.log('Operations:', encryptor.counts);

  // MemoryStorage is the drop-in backend for tests.
  const testStore = new SecureStorage(new MemoryStorage(), new AesGcmEncryptor());
  await testStore.setSecure('test', { value: 42 }, 'pass');
  console.log('Test:', await testStore.getSecure('test', 'pass'));
}

main().catch(console.error);
