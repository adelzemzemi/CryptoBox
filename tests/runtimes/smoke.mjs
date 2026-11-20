/**
 * Smoke test of the built package, shared by every runtime CI exercises outside
 * the Vitest suite: Bun, Deno and headless Chrome (and Node, against the tarball).
 *
 * It receives the module namespace instead of importing it, so each runtime can
 * load the package its own way: from an installed tarball, or from `dist` over a
 * page origin.
 */

/** Frozen vectors, copied from tests/crypto/test-vectors.test.ts. Never regenerate them. */
const PASSWORD = 'correct horse battery staple';
const ASCII = '{"user":"alice","id":42}';

/** Version 0, written by 1.0.x. */
const V0_ASCII =
  'WYb/Hbsesqf8zeimGpEiIl0a6sXPz5Z+SthYwElBwk5kQ6HV8zx8l+MYMxuTrMLvO/3STKBSdsRAmNCtATUHoix8HyM=';

/** Version 2, bound to the context `user:42`. */
const V2_CONTEXT =
  'AgAAA+g1FOLK6fQfWFWoJnzX2s0lxIkbX8PwNy1iLMHAZ30amO5355E9VJVMzHBKEHkYcM6skITN/KV9m5m3h8zVUyoJUZt4xA==';

function check(condition, label) {
  if (!condition) throw new Error(`Smoke test failed: ${label}`);
}

async function rejectsWith(promise, cryptobox, code, label) {
  try {
    await promise;
  } catch (error) {
    check(cryptobox.isCryptoBoxError(error, code), `${label} (got ${String(error)})`);
    return;
  }
  check(false, `${label} (it resolved)`);
}

/**
 * Run the checks against a loaded copy of the package.
 *
 * @param cryptobox - Namespace of `@azemzemi/cryptobox`
 * @returns A one-line summary
 * @throws Error naming the first check that failed
 */
export async function smoke(cryptobox) {
  const encryptor = new cryptobox.AesGcmEncryptor({ iterations: 1000, allowWeakIterations: true });

  const bound = await encryptor.encrypt({ a: 1 }, 'pw', { context: 'k' });
  const roundTrip = await encryptor.decrypt(bound, 'pw', { context: 'k' });
  check(roundTrip.a === 1, 'round-trip through AesGcmEncryptor');
  check(cryptobox.inspect(bound).version === cryptobox.ENVELOPE_VERSION, 'envelope version');

  await rejectsWith(
    encryptor.decrypt(bound, 'pw', { context: 'other' }),
    cryptobox,
    'DECRYPTION_FAILED',
    'a mismatched context must fail'
  );
  await rejectsWith(
    encryptor.decrypt(bound, 'wrong', { context: 'k' }),
    cryptobox,
    'DECRYPTION_FAILED',
    'a wrong password must fail'
  );

  check((await cryptobox.decrypt(V0_ASCII, PASSWORD)) === ASCII, 'frozen 1.x ciphertext');
  check(
    (await cryptobox.decrypt(V2_CONTEXT, PASSWORD, { context: 'user:42' })) === ASCII,
    'frozen 2.x context-bound ciphertext'
  );

  const store = cryptobox.createSecureMemoryStorage({ encryptor });
  await store.setSecure('user', { id: 123 }, 'pw');
  check((await store.getSecure('user', 'pw')).id === 123, 'round-trip through SecureStorage');

  return 'all smoke checks passed';
}
