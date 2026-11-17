import { WebStorageAdapter } from './web-storage.js';

/**
 * `sessionStorage` adapter, for runtimes that provide the global.
 *
 * Constructing one is always safe; see {@link WebStorageAdapter}.
 *
 * @throws CryptoBoxError `STORAGE_UNAVAILABLE` on use when `sessionStorage` is absent or blocked.
 */
export class SessionStorage extends WebStorageAdapter {
  constructor() {
    super('sessionStorage');
  }
}
