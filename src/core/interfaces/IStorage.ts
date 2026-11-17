import type { MaybePromise } from '../types.js';

/**
 * Minimal key-value backend.
 *
 * Every method may return synchronously or asynchronously, so a single adapter
 * shape covers `localStorage` as well as IndexedDB, `chrome.storage`, React
 * Native's AsyncStorage or a server-side store. Consumers must `await` the
 * results; a synchronous implementation satisfies that at no cost.
 */
export interface IStorage {
  /**
   * Store a value.
   *
   * @param key - Storage key
   * @param value - Value to store
   */
  setItem(key: string, value: string): MaybePromise<void>;

  /**
   * Retrieve a value.
   *
   * @param key - Storage key
   * @returns Stored value, or null if the key is absent
   */
  getItem(key: string): MaybePromise<string | null>;

  /**
   * Remove a value.
   *
   * @param key - Storage key
   */
  removeItem(key: string): MaybePromise<void>;
}

/**
 * A backend that can also list and drop its contents.
 *
 * Kept separate from {@link IStorage} because the Web Storage adapters cannot
 * implement it without enumerating keys they do not own.
 */
export interface IEnumerableStorage extends IStorage {
  /**
   * List every stored key.
   *
   * @returns The keys currently held
   */
  keys(): MaybePromise<string[]>;

  /** Remove every stored value. */
  clear(): MaybePromise<void>;
}
