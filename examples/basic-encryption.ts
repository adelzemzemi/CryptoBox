import { AesGcmEncryptor } from '../src';

async function main() {
  const encryptor = new AesGcmEncryptor();
  const password = 'my-secure-password';

  const plaintext = 'Hello, World!';
  const encrypted = await encryptor.encrypt(plaintext, password);
  console.log('Encrypted:', encrypted);

  const decrypted = await encryptor.decrypt<string>(encrypted, password);
  console.log('Decrypted:', decrypted);
}

main().catch(console.error);
