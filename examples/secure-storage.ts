/**
 * SecureStorage with automatic encryption/decryption
 */

import { createSecureLocalStorage, createSecureSessionStorage } from '../src';

interface AppState {
  userId: number;
  token: string;
  preferences: {
    theme: 'light' | 'dark';
    notifications: boolean;
  };
}

async function main() {
  const password = 'my-secure-password';

  const localStorage = createSecureLocalStorage();
  const sessionStorage = createSecureSessionStorage();

  const appState: AppState = {
    userId: 123,
    token: 'jwt-token-here',
    preferences: {
      theme: 'dark',
      notifications: true,
    },
  };

  await localStorage.setSecure('app-state', appState, password);
  await sessionStorage.setSecure('session-data', { timestamp: Date.now() }, password);

  console.log('Has app-state:', localStorage.has('app-state'));

  const retrieved = await localStorage.getSecure<AppState>('app-state', password);
  console.log('Retrieved:', retrieved);

  localStorage.remove('app-state');
  console.log('After removal:', localStorage.has('app-state'));
}

main().catch(console.error);