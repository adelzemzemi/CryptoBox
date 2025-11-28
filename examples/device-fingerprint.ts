/**
 * Password-less encryption using device fingerprint
 */

import { getDeviceFingerprint, AesGcmEncryptor } from '../src';

async function main() {
  const encryptor = new AesGcmEncryptor();

  // Device fingerprint is stable across reloads
  const fingerprint = await getDeviceFingerprint();
  console.log('Fingerprint:', fingerprint.substring(0, 16) + '...');

  const data = {
    apiKey: 'sk-1234567890',
    userId: 'user-abc-123',
  };

  const encrypted = await encryptor.encrypt(data, fingerprint);
  console.log('Encrypted with device fingerprint');

  // After reload, fingerprint remains the same
  const fingerprintAfterReload = await getDeviceFingerprint();
  console.log('Fingerprints match:', fingerprint === fingerprintAfterReload);

  const decrypted = await encryptor.decrypt(encrypted, fingerprintAfterReload);
  console.log('Decrypted:', decrypted);

  console.log('⚠️ Important Warnings:');
  console.log('- Device fingerprint is NOT cryptographically secure');
  console.log('- Can be spoofed or change with browser updates');
  console.log('- Use only for convenience, not for critical security');
  console.log('- Data encrypted on one device cannot be decrypted on another');
}

main().catch(console.error);


