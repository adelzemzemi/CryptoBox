/**
 * Using a device fingerprint as a SIGNAL, not as key material.
 *
 * A fingerprint must never be an encryption password: it changes when the browser,
 * the driver, the screen or the timezone changes, and every ciphertext derived from
 * the old value becomes permanently unrecoverable.
 *
 * The safe pattern is below: encrypt with a real password, store the fingerprint
 * alongside the data, and treat a mismatch as "this session moved — re-authenticate".
 *
 * Fingerprinting ships under its own entry point, `@azemzemi/cryptobox/fingerprint`,
 * because it only runs in a browser and because collecting device characteristics
 * carries privacy obligations the rest of the package does not.
 */

import { getDeviceFingerprint, isDeviceFingerprintAvailable } from '../src/fingerprint';
import { createSecureMemoryStorage, AesGcmEncryptor } from '../src';

interface BoundSession {
  apiKey: string;
  userId: string;
  /** Fingerprint observed when the session was created. */
  boundTo: string;
}

async function main() {
  if (!isDeviceFingerprintAvailable()) {
    console.log('This example requires a browser environment (document, navigator, screen).');
    console.log('Run it in a bundler dev server rather than under Node.js.');
    return;
  }

  const password = 'a-real-user-password';
  const storage = createSecureMemoryStorage({ encryptor: new AesGcmEncryptor() });

  // 1. On login: record which device the session was issued to.
  const fingerprint = await getDeviceFingerprint();
  console.log('Fingerprint:', fingerprint.substring(0, 16) + '...');

  const session: BoundSession = {
    apiKey: 'sk-1234567890',
    userId: 'user-abc-123',
    boundTo: fingerprint,
  };

  await storage.setSecure('session', session, password);

  // 2. On a later read: the password decrypts the data, the fingerprint only decides
  //    whether the session is still trusted. A changed device costs a re-login,
  //    never the data itself.
  const restored = await storage.getSecure<BoundSession>('session', password);
  const current = await getDeviceFingerprint();

  if (restored && restored.boundTo !== current) {
    console.log('Device changed — forcing re-authentication.');
    await storage.remove('session');
    return;
  }

  console.log('Session still bound to this device:', restored?.userId);

  console.log('');
  console.log('⚠️  Notes:');
  console.log('- Never pass a fingerprint as the password argument');
  console.log('- A fingerprint can be spoofed; it is a signal, not an authenticator');
  console.log('- It changes on browser updates, hardware changes and privacy settings');
}

main().catch(console.error);
