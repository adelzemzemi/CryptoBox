import type { IStorage } from '../core/interfaces/index.js';
import { CryptoBoxError } from '../core/errors.js';

/** Subset of the Web Storage API used by this package. */
export interface WebStorageLike {
  setItem(key: string, value: string): void;
  getItem(key: string): string | null;
  removeItem(key: string): void;
}

export type WebStorageKind = 'localStorage' | 'sessionStorage';

function readGlobal(kind: WebStorageKind): WebStorageLike | undefined {
  try {
    return (globalThis as Partial<Record<WebStorageKind, WebStorageLike>>)[kind];
  } catch {
    // Browsers throw a SecurityError from the getter itself when storage is
    // blocked: sandboxed iframes, disabled cookies, some private modes.
    return undefined;
  }
}

/**
 * Resolve a Web Storage global, throwing when the runtime does not provide one.
 *
 * @param kind - Which global to resolve
 * @returns The resolved storage object
 * @throws CryptoBoxError `STORAGE_UNAVAILABLE` if the global is absent or access to it is denied
 */
export function resolveWebStorage(kind: WebStorageKind): WebStorageLike {
  const candidate = readGlobal(kind);

  if (!candidate) {
    throw new CryptoBoxError(
      'STORAGE_UNAVAILABLE',
      `${kind} is not available in this environment. ` +
        `Use MemoryStorage for non-browser runtimes, or pass a custom IStorage implementation to SecureStorage.`
    );
  }

  return candidate;
}

/**
 * Adapter over a Web Storage global, shared by `LocalStorage` and `SessionStorage`.
 *
 * The global is resolved on each call instead of in the constructor, so a
 * server-rendered application can build the adapter during SSR and only reach
 * for storage once it is running in the browser.
 */
export abstract class WebStorageAdapter implements IStorage {
  protected constructor(private readonly kind: WebStorageKind) {}

  setItem(key: string, value: string): void {
    resolveWebStorage(this.kind).setItem(key, value);
  }

  getItem(key: string): string | null {
    return resolveWebStorage(this.kind).getItem(key);
  }

  removeItem(key: string): void {
    resolveWebStorage(this.kind).removeItem(key);
  }
}
