/**
 * Encrypting complex objects, and proving on read that they still have the
 * expected shape.
 *
 * The generic parameter of `decrypt<T>()` is an assertion, not a check: the bytes
 * are authentic, but a payload written by an older version of the application can
 * still be the wrong shape. A validator turns that into a typed failure instead of
 * a crash three call frames later.
 */

import { AesGcmEncryptor, isCryptoBoxError, isPlainObject } from '../src';

interface User {
  id: number;
  name: string;
  email: string;
  roles: string[];
}

function isUser(value: unknown): value is User {
  if (!isPlainObject(value)) return false;

  const { id, name, email, roles } = value;

  return (
    typeof id === 'number' &&
    typeof name === 'string' &&
    typeof email === 'string' &&
    Array.isArray(roles) &&
    roles.every(role => typeof role === 'string')
  );
}

async function main() {
  const encryptor = new AesGcmEncryptor();
  const password = 'my-secure-password';

  const user: User = {
    id: 123,
    name: 'John Doe',
    email: 'john@example.com',
    roles: ['admin', 'user'],
  };

  const encrypted = await encryptor.encrypt(user, password);
  console.log('Encrypted:', encrypted.substring(0, 50) + '...');

  const decrypted = await encryptor.decrypt(encrypted, password, { validate: isUser });
  console.log('Decrypted:', decrypted);
  console.log('Integrity:', JSON.stringify(user) === JSON.stringify(decrypted));

  // A payload written under an older schema is caught on read.
  const stale = await encryptor.encrypt({ id: 'not-a-number' }, password);

  try {
    await encryptor.decrypt(stale, password, { validate: isUser });
  } catch (error) {
    if (isCryptoBoxError(error, 'VALIDATION_FAILED')) console.log('Stale payload rejected');
    else throw error;
  }
}

main().catch(console.error);
