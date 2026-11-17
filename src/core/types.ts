/**
 * A value that a backend may return either synchronously or asynchronously.
 *
 * Storage adapters use this so that a single interface covers `localStorage`
 * (synchronous) as well as IndexedDB, `chrome.storage`, React Native's
 * AsyncStorage or a server-side key-value store (all asynchronous).
 */
export type MaybePromise<T> = T | Promise<T>;
