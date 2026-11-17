/**
 * SecureStorage with automatic encryption/decryption.
 *
 * `createSecureLocalStorage()` and `createSecureSessionStorage()` are browser-only
 * and throw outside one, so this example falls back to in-memory storage under
 * Node.js.
 */

import {
  createSecureLocalStorage,
  createSecureSessionStorage,
  createSecureMemoryStorage,
  isCryptoBoxError,
} from '../src';
import type { ISecureStorage } from '../src';

interface AppState {
  userId: number;
  token: string;
  preferences: {
    theme: 'light' | 'dark';
    notifications: boolean;
  };
}

/** Use the browser-backed store when there is one, otherwise stay in memory. */
function createStore(kind: 'local' | 'session'): ISecureStorage {
  if (typeof globalThis.localStorage === 'undefined') {
    console.log(`(no ${kind}Storage in this runtime — using MemoryStorage)`);
    return createSecureMemoryStorage();
  }

  return kind === 'local' ? createSecureLocalStorage() : createSecureSessionStorage();
}

async function main() {
  const password = 'my-secure-password';

  const persistent = createStore('local');
  const ephemeral = createStore('session');

  const appState: AppState = {
    userId: 123,
    token: 'jwt-token-here',
    preferences: {
      theme: 'dark',
      notifications: true,
    },
  };

  await persistent.setSecure('app-state', appState, password);
  await ephemeral.setSecure('session-data', { timestamp: Date.now() }, password);

  console.log('Has app-state:', await persistent.has('app-state'));
  console.log('Retrieved:', await persistent.getSecure<AppState>('app-state', password));

  // A wrong password fails identically to corrupted data, and carries a code.
  try {
    await persistent.getSecure<AppState>('app-state', 'wrong-password');
  } catch (error) {
    if (isCryptoBoxError(error)) console.log('Wrong password ->', error.code);
    else throw error;
  }

  // Each value is bound to its key, so a ciphertext moved elsewhere no longer opens.
  await persistent.setSecure('other', { unrelated: true }, password);
  console.log('Bound to its key: a value copied to another key stops decrypting.');

  // Migration: re-encrypt anything written under older parameters. rewrap() is
  // safe to call on every key and reports whether it had anything to do.
  if (await persistent.rewrap('app-state', password)) {
    console.log('app-state re-encrypted under the current parameters');
  }

  await persistent.remove('app-state');
  console.log('After removal:', await persistent.has('app-state'));
}

main().catch(console.error);
