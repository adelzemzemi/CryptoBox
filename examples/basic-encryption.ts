/**
 * Encrypting a string, and reading the failures apart.
 */

import { AesGcmEncryptor, isCryptoBoxError } from '../src';

async function main() {
  const encryptor = new AesGcmEncryptor();
  const password = 'my-secure-password';

  const plaintext = 'Hello, World!';
  const encrypted = await encryptor.encrypt(plaintext, password);
  console.log('Encrypted:', encrypted);

  const decrypted = await encryptor.decrypt<string>(encrypted, password);
  console.log('Decrypted:', decrypted);

  // Every failure carries a code, so no message parsing is needed.
  for (const [label, attempt] of [
    ['wrong password', () => encryptor.decrypt(encrypted, 'wrong')],
    ['not a ciphertext', () => encryptor.decrypt('!!!', password)],
  ] as const) {
    try {
      await attempt();
    } catch (error) {
      if (isCryptoBoxError(error)) console.log(`${label} ->`, error.code);
      else throw error;
    }
  }
}

main().catch(console.error);
