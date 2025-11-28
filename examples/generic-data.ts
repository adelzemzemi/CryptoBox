/**
 * Encrypting complex objects with type safety
 */

import { AesGcmEncryptor } from '../src';

interface User {
  id: number;
  name: string;
  email: string;
  roles: string[];
  metadata: {
    lastLogin: string;
    preferences: Record<string, any>;
  };
}

async function main() {
  const encryptor = new AesGcmEncryptor();
  const password = 'my-secure-password';

  const user: User = {
    id: 123,
    name: 'John Doe',
    email: 'john@example.com',
    roles: ['admin', 'user'],
    metadata: {
      lastLogin: new Date().toISOString(),
      preferences: {
        theme: 'dark',
        language: 'en',
      },
    },
  };

  console.log('Original:', user);

  const encrypted = await encryptor.encrypt(user, password);
  console.log('Encrypted:', encrypted.substring(0, 50) + '...');

  const decrypted = await encryptor.decrypt<User>(encrypted, password);
  console.log('Decrypted:', decrypted);

  console.log('Integrity:', JSON.stringify(user) === JSON.stringify(decrypted));
}

main().catch(console.error);

