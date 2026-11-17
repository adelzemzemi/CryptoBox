# CryptoBox

Secure encryption and storage for JavaScript & TypeScript.

[![npm version](https://img.shields.io/npm/v/@azemzemi/cryptobox.svg)](https://www.npmjs.com/package/@azemzemi/cryptobox)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)
[![GitHub](https://img.shields.io/badge/GitHub-zemzemi%2Fcryptobox-blue.svg)](https://github.com/adelzemzemi/cryptobox)

Zero dependencies • AES-256-GCM • Type-safe • Cross-platform

## Why CryptoBox?

- **🔒 Secure by default** — AES-256-GCM authenticated encryption, PBKDF2 at 600,000 iterations, authenticated envelope header
- **🔗 Bound to its place** — each stored value is tied to its key, so a ciphertext moved elsewhere no longer decrypts
- **📦 Zero dependencies** — nothing to audit at runtime
- **🎯 Type-safe** — strict TypeScript, typed errors, runtime validation on read
- **🔄 Upgradable** — parameters travel inside each ciphertext, and `rewrap()` migrates old data in place
- **🌐 Universal** — Browser, Node.js 20+, Deno, Bun; synchronous and asynchronous backends alike

## Install

```bash
npm install @azemzemi/cryptobox
```

Upgrading from 1.0.x? See the [migration guide](#migrating-from-10x).

## Usage

```typescript
import { createSecureLocalStorage } from '@azemzemi/cryptobox';

const storage = createSecureLocalStorage();

await storage.setSecure('user', { id: 123 }, 'password');
const user = await storage.getSecure('user', 'password');
```

Every method is asynchronous, including `has()` and `remove()`, because the backend
may be.

## API

### Storage

```typescript
createSecureLocalStorage(); // Browser: localStorage
createSecureSessionStorage(); // Browser: sessionStorage
createSecureMemoryStorage(); // Universal: in-memory
```

All three are safe to construct anywhere, including during server-side rendering.
The two browser-backed ones resolve their global lazily and throw
`STORAGE_UNAVAILABLE` only when a read or write actually happens without one
(Node.js, Deno, Bun, workers, SSR). So a module-scope store in a Next.js or Nuxt app
is fine as long as it is only used in the browser; otherwise reach for
`createSecureMemoryStorage()`, or supply your own `IStorage`.

### Encryption

```typescript
import { AesGcmEncryptor } from '@azemzemi/cryptobox';

const encryptor = new AesGcmEncryptor();
const encrypted = await encryptor.encrypt(data, 'password');
const decrypted = await encryptor.decrypt(encrypted, 'password');
```

Any JSON-serializable value works, including `null`. Values JSON cannot represent
(`undefined`, functions, symbols) are rejected rather than silently corrupted.

`getSecure()` returns `null` both for a stored `null` and for a key that does not
exist. Use `has()` when the difference matters.

### Typed errors

Every failure is a `CryptoBoxError` carrying a stable `code`. Match on the code, not
on the message.

```typescript
import { isCryptoBoxError } from '@azemzemi/cryptobox';

try {
  await storage.getSecure('session', password);
} catch (error) {
  if (isCryptoBoxError(error, 'DECRYPTION_FAILED')) promptForPassword();
  else throw error;
}
```

| Code                      | Meaning                                                     |
| ------------------------- | ----------------------------------------------------------- |
| `DECRYPTION_FAILED`       | Wrong password, tampered data, or a mismatched context      |
| `MALFORMED_CIPHERTEXT`    | Not a well-formed envelope                                  |
| `UNSUPPORTED_ENVELOPE`    | Readable version, refused by `allowLegacy: false`           |
| `INVALID_BASE64`          | Input is not valid base64                                   |
| `INVALID_ITERATIONS`      | Iteration count out of range, or too low to write with      |
| `INVALID_ARGUMENT`        | An argument does not have the expected shape                |
| `SERIALIZATION_FAILED`    | Value is not representable in JSON                          |
| `DESERIALIZATION_FAILED`  | Decrypted payload is not valid JSON                         |
| `VALIDATION_FAILED`       | Decrypted payload rejected by the supplied validator        |
| `STORAGE_UNAVAILABLE`     | The storage backend is absent from this runtime, or blocked |
| `UNSUPPORTED_ENVIRONMENT` | A required global is missing                                |

Use `isCryptoBoxError()` rather than `instanceof`: the package ships several entry
points, and a duplicated copy of the class would defeat an identity check.

### Validating what you decrypt

`decrypt<T>()` and `getSecure<T>()` cannot check `T` on their own — the bytes are
authentic, but a payload written by an older version of your application may no
longer have the shape you expect. Pass a type guard whenever the data outlives the
code that wrote it.

```typescript
import { isPlainObject } from '@azemzemi/cryptobox';

function isUser(value: unknown): value is User {
  if (!isPlainObject(value)) return false;

  const { id, name } = value;
  return typeof id === 'number' && typeof name === 'string';
}

const user = await storage.getSecure('user', password, { validate: isUser });
```

`isPlainObject()` narrows to `Record<string, unknown>`, so destructure the fields
rather than reaching for them with dot notation — that keeps the guard compiling
under `noPropertyAccessFromIndexSignature`.

```typescript
const stale = await encryptor.encrypt({ id: 'not-a-number' }, password);

// CryptoBoxError, code VALIDATION_FAILED — instead of a crash further down.
await encryptor.decrypt(stale, password, { validate: isUser });
```

### Context binding

Each value written through `SecureStorage` is bound to the key it lives under. An
attacker who can write to `localStorage` therefore cannot swap two ciphertexts and
have them decrypt in the wrong place.

```typescript
await storage.setSecure('role:guest', { admin: false }, password);
await storage.setSecure('role:admin', { admin: true }, password);

// Copying the admin ciphertext over the guest key no longer decrypts.
```

The same binding is available directly:

```typescript
const encrypted = await encryptor.encrypt(data, password, { context: 'tenant:42' });
await encryptor.decrypt(encrypted, password, { context: 'tenant:42' });
```

The context is not secret and is not stored — the caller must be able to reproduce
it. Pass `{ bindToKey: false }` to a store whose ciphertexts must stay transferable.

### Tuning the KDF, and migrating

```typescript
// Slower, stronger. The value is stored in the ciphertext.
const strong = new AesGcmEncryptor({ iterations: 1_200_000 });

// Decryption reads the iteration count from the data; nothing to configure.
await new AesGcmEncryptor().decrypt(await strong.encrypt(data, pw), pw);
```

#### What it costs

A key is derived on **every** operation — the password is an argument, not instance
state, so nothing is cached between calls. At the 600,000-iteration default that is
roughly 65 ms per read or write on a desktop, and several times that on a mid-range
phone. Ten values written in a loop means ten derivations.

Budget for it: batch a page's writes into one object rather than one key per field,
and keep hot-path values out of encrypted storage. Where the threat model allows it,
lowering the count is a deliberate, recorded choice:

```typescript
// Recorded in the ciphertext, so existing data is unaffected.
const cheap = new AesGcmEncryptor({ iterations: 100_000 });
```

100,000 is the lowest count the package writes with. Anything below it is refused
with `INVALID_ITERATIONS`, because a low count makes the password cheap to
brute-force from a stolen ciphertext. Test suites, which need speed and protect
nothing, can opt out:

```typescript
const forTests = new AesGcmEncryptor({ iterations: 1000, allowWeakIterations: true });
```

Reading is unaffected: a ciphertext written below the minimum still decrypts.

Amortising the derivation properly needs an encryptor that holds a `CryptoKey`
instead of a password. That is a different envelope mode and is not part of 2.0.0.

Raising the parameters does not upgrade existing data on its own. `rewrap()` does.
It returns `false` when the value was already current, so it is safe to call on
every key:

```typescript
await storage.rewrap('user', password); // true if the value was rewritten
```

`needsRewrap()` answers without the password, which makes it useful for counting
what is left to migrate but not for deciding what to skip: about one 1.x ciphertext
in 200,000 starts with bytes that read like a current header. `rewrap()` decrypts,
so it is never fooled. Run it over every key before turning legacy reads off.

You can also inspect a ciphertext without the password:

```typescript
import { inspect, needsRewrap, rewrap } from '@azemzemi/cryptobox';

inspect(ciphertext); // { version: 2, iterations: 600000, contextBound: true }
needsRewrap(ciphertext); // true while it is below the current parameters
await rewrap(ciphertext, password, { context: 'tenant:42' });
```

Once the stored data has been migrated, close the door on the older format:

```typescript
const storage = createSecureMemoryStorage({ allowLegacy: false });
```

`allowLegacy` can be set on the store or on the encryptor
(`new AesGcmEncryptor({ allowLegacy: false })`). The store's setting wins when both
are given.

### Custom Storage

`IStorage` accepts synchronous and asynchronous backends alike, so the same
`SecureStorage` works over `localStorage`, IndexedDB, `chrome.storage`, React
Native's AsyncStorage or a server-side key-value store.

```typescript
import { SecureStorage, AesGcmEncryptor } from '@azemzemi/cryptobox';
import type { IStorage } from '@azemzemi/cryptobox';

class IndexedDbStorage implements IStorage {
  async setItem(key: string, value: string): Promise<void> {}
  async getItem(key: string): Promise<string | null> {
    return null;
  }
  async removeItem(key: string): Promise<void> {}
}

const storage = new SecureStorage(new IndexedDbStorage(), new AesGcmEncryptor());
```

### Utilities

```typescript
import {
  timingSafeEqual,
  timingSafeEqualBuffer,
  randomDelay,
  safeJsonParse,
  safeJsonStringify,
  encodeBase64,
  decodeBase64,
} from '@azemzemi/cryptobox';
```

`timingSafeEqual` removes the data-dependent early exit, which is the part a
JavaScript library can control. It is best-effort: the engine's string
representation and JIT are not under its control, and input length is not hidden.
For byte comparison on Node.js, `crypto.timingSafeEqual` is the stronger primitive.

## Ciphertext format

```
base64( version(1) || iterations(4, big-endian) || salt(16) || iv(12) || ciphertext+tag )
```

The 5-byte header is passed to AES-GCM as additional authenticated data, together
with the caller's context. Neither the declared version nor the declared iteration
count can be altered without invalidating the tag, and a ciphertext cannot be
replayed under a different context.

| Version | Written by | Layout                   | Header authenticated | Context |
| ------- | ---------- | ------------------------ | -------------------- | ------- |
| 0       | 1.0.x      | `salt \|\| iv \|\| body` | —                    | —       |
| 2       | 2.x        | headered                 | yes                  | yes     |

Version 0 is still read transparently, so upgrading does not strand existing data.
It carries no context binding and uses 100,000 PBKDF2 iterations — that is what
`rewrap()` upgrades.

## Device fingerprinting

Fingerprinting ships under its own entry point. It only runs in a browser, and
collecting device characteristics carries privacy obligations that the rest of the
package does not impose on its consumers.

```typescript
import {
  getDeviceFingerprint,
  isDeviceFingerprintAvailable,
} from '@azemzemi/cryptobox/fingerprint';
```

> [!WARNING]
> Never use `getDeviceFingerprint()` as an encryption password. The value is not stable —
> a browser update, a new monitor, a timezone change or an anti-fingerprinting setting all
> change it, and the data encrypted under the old value becomes permanently unrecoverable.
> Use it as a signal (for example, to force re-authentication when a session appears on a
> different device), never as key material.

## Migrating from 1.0.x

> [!IMPORTANT]
> **`has()` is now asynchronous.** In JavaScript without type checking, `if (storage.has(k))`
> still compiles and is now **always true** — a promise is truthy. This is the one change
> that fails silently instead of loudly, so grep for `.has(` before upgrading.
>
> ```diff
> - if (storage.has('session')) { … }
> + if (await storage.has('session')) { … }
> ```
>
> TypeScript reports it as a type error, so only untyped call sites are at risk.

The 1.0.x aliases are gone. Replacements:

| Removed                                                               | Use instead                                           |
| --------------------------------------------------------------------- | ----------------------------------------------------- |
| `encryptData` / `decryptData`                                         | `new AesGcmEncryptor()` + `.encrypt()` / `.decrypt()` |
| `encryptToken` / `decryptToken`                                       | `encrypt` / `decrypt`                                 |
| `SecureLocalStorage` / `SecureSessionStorage` / `SecureMemoryStorage` | `createSecureLocalStorage()` and friends              |
| `LocalTokenStorage` / `SessionTokenStorage` / `MemoryTokenStorage`    | `LocalStorage` / `SessionStorage` / `MemoryStorage`   |
| `TokenStorage`                                                        | `IStorage`                                            |
| `getDeviceFingerprint` from the main entry                            | `@azemzemi/cryptobox/fingerprint`                     |

Two further signature changes:

```diff
- storage.remove('key')         // void
+ await storage.remove('key')   // Promise<void>

- createSecureLocalStorage(myEncryptor)
+ createSecureLocalStorage({ encryptor: myEncryptor })
```

Errors are now `CryptoBoxError`. Several messages changed since 1.0.2, so code that
matched on message text must move to `isCryptoBoxError(error, code)`.

Behaviour that changes without a signature change:

- `require('@azemzemi/cryptobox')` works. In 1.0.2 the CommonJS entry resolved to an
  empty object on Node 22+ and threw `ERR_REQUIRE_ESM` on Node 18–20.
- PBKDF2 defaults to 600,000 iterations instead of 100,000, so encryption is roughly
  six times slower. Existing data still decrypts at its recorded count.
- A wrong password and corrupted data now fail identically, and the failure no longer
  names the storage key — in 1.0.2 the error was a decryption oracle.
- `null` round-trips. `undefined`, functions and symbols are rejected instead of
  silently producing a corrupt ciphertext.
- `MemoryStorage.getItem()` returns `''` for a stored empty string rather than `null`.
- `LocalStorage` / `SessionStorage` throw at construction outside a browser instead of
  a bare `ReferenceError` on first use.

Stored data needs no migration to keep working. To gain context binding and the
current iteration count on data written by 1.0.x, run `rewrap()` (see
[Tuning the KDF](#tuning-the-kdf-and-migrating)).

## Security

- AES-256-GCM authenticated encryption
- PBKDF2-HMAC-SHA256, 600,000 iterations by default (OWASP recommendation)
- A fresh random salt and IV per encryption
- The envelope header is authenticated, so a downgrade to an earlier format is rejected
- Ciphertexts are bound to a context, so relocating one does not decrypt it
- Uniform failure for wrong passwords, corrupted data and mismatched contexts, so the
  error is not a decryption oracle
- Iteration counts read from a ciphertext are range-checked, so a hostile envelope cannot
  force unbounded key-derivation work

**This library has not been audited by a third party.** The reviews behind the list
above were done by the maintainers. It is also client-side encryption: it protects
data at rest against someone reading the storage, not against script running on your
own origin — an XSS reads the plaintext after decryption regardless of the cipher.

See [SECURITY.md](SECURITY.md) for the threat model, known limitations and
vulnerability reporting.

## License

MIT
