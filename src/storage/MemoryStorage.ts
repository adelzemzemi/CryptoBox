import type { IEnumerableStorage } from '../core/interfaces/index.js';

/**
 * In-memory storage adapter. Works in every runtime; not persistent.
 */
export class MemoryStorage implements IEnumerableStorage {
  private store = new Map<string, string>();

  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }

  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  keys(): string[] {
    return Array.from(this.store.keys());
  }

  clear(): void {
    this.store.clear();
  }
}
