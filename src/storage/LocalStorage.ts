import { WebStorageAdapter } from './web-storage.js';

/**
 * `localStorage` adapter, for runtimes that provide the global.
 *
 * Constructing one is always safe; see {@link WebStorageAdapter}.
 *
 * @throws CryptoBoxError `STORAGE_UNAVAILABLE` on use when `localStorage` is absent or blocked.
 */
export class LocalStorage extends WebStorageAdapter {
  constructor() {
    super('localStorage');
  }
}
