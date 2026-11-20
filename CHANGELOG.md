# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Fixed

- **`encrypt()` coerced a plaintext that is not a string.** From untyped JavaScript,
  `encrypt(undefined, pw)` encrypted `""`, `encrypt({ a: 1 }, pw)` encrypted `"[object Object]"`
  and `encrypt(123, pw)` encrypted `"123"`, so the value read back was not the value written. A
  non-string plaintext is now refused with `INVALID_ARGUMENT`. `AesGcmEncryptor` and
  `SecureStorage` are unaffected: they serialize to JSON first and always pass a string.
- **A context that is not a string was coerced.** `context: 42` bound to `"42"`, and any two
  objects bound to the same `"[object Object]"`, so the binding silently stopped telling them
  apart. `encrypt()`, `decrypt()`, `rewrap()` and `AesGcmEncryptor` now refuse a non-string
  `context` (and `previousContext`) with `INVALID_ARGUMENT`. Leaving it out still means no
  context.
- **An `AesGcmEncryptor` could write what it then refused to read.** The constructor checks that
  `maxIterations` is not below the instance's own iteration count, but a per-call `iterations`
  was not checked against it: `new AesGcmEncryptor({ maxIterations: 600_000 })` accepted
  `encrypt(data, pw, { iterations: 700_000 })`, then failed to decrypt the result with
  `INVALID_ITERATIONS`. The write is now refused up front with `INVALID_ARGUMENT`, the code the
  constructor uses for the same contradiction.

### Changed

- **CI now runs the package on every runtime the README names.** The packed tarball is installed
  into a consumer project and exercised under Bun and Deno, and the built module is loaded in
  headless Chrome. Each run checks a round-trip, that a mismatched context and a wrong password
  fail with `DECRYPTION_FAILED`, and that a frozen 1.x ciphertext and a frozen context-bound 2.x
  ciphertext still decrypt. Until now only Node was tested. `playwright-core` is a new dev
  dependency; it drives the Chrome already installed on the runner, so no browser is downloaded.

### Documentation

- **Passwords are not Unicode-normalized, and now say so.** The password's UTF-8 bytes go into
  PBKDF2 as given, so the NFC and NFD forms of the same visible text (`café` precomposed, or
  with a combining accent) are different passwords: data written under one fails to decrypt
  under the other with `DECRYPTION_FAILED`. Normalizing inside the package would change the key
  of every non-ASCII password already in use, so the behaviour is kept and pinned by a test. The
  README and the threat model in `SECURITY.md` tell callers to normalize consistently before
  every call, for example with `password.normalize('NFC')`.

## [2.1.0] - 2026-11-20

### Added

- **`maxIterations`, a read-side cap on the PBKDF2 iteration count**, on `decrypt()`, `rewrap()`
  and `AesGcmEncryptor`. The count is read from the envelope and used to derive the key before
  the authentication tag can be checked, so whoever can write to the store could raise it to
  the 5,000,000 ceiling and make a failing read cost about eight times the default. With the
  cap set, a version 2 envelope declaring more is refused with `INVALID_ITERATIONS` before any
  key derivation. It is opt-in: the default stays at 5,000,000, so values written with a higher
  count than the one configured today keep decrypting. An encryptor refuses a cap lower than
  the count it writes with. Reported by a reader of the 2.0 write-up.

## [2.0.0] - 2026-11-17

Supersedes 1.0.2, the previous published release.

A contracts release. `IStorage` and `IEncryptor` were the two ceilings on what this
package could do: a synchronous backend interface ruled out every asynchronous store,
and an encryptor that took only `(data, password)` had nowhere to put a context, a
validator or a migration hook. Both are widened here, and the features that were
blocked behind them land at the same time. It also carries the packaging and hardening
fixes listed under Fixed, which is where most of the day-to-day difference from 1.0.2
will be felt.

Ciphertexts written by 1.0.x keep working. Nothing needs to be re-encrypted to upgrade. See
`rewrap()` for the optional migration that raises the iteration count and adds context
binding to data written by 1.0.x.

The upgrade is one-way for stored data: 1.0.x cannot read what 2.0 writes. See
"Changed - breaking" before rolling out to clients that share a store.

### Fixed

- **CommonJS entry point was unusable.** The CJS bundle was written to `dist/index.js` inside a
  `"type": "module"` package, so Node parsed it as ESM: `require('@azemzemi/cryptobox')` resolved
  to an empty object on Node 22+, and threw `ERR_REQUIRE_ESM` on Node 18-20. The CJS build is now
  `dist/index.cjs`, with per-condition `types` in the `exports` map. Verified in CI by
  `are-the-types-wrong`, `publint`, and a smoke test that installs the packed tarball and imports
  it from both CJS and ESM.
- The ciphertext reader ignores ASCII whitespace and accepts missing padding, as 1.0.x did, so a
  value that went through a file or a URL still decrypts. `decodeBase64()` itself is strict.
- Malformed base64 escaped as a runtime-specific `InvalidCharacterError`. It is now reported as
  `MALFORMED_CIPHERTEXT`.
- A JSON syntax error on the read path quoted the start of the decrypted plaintext in its message,
  which then reached logs and error reporting. The message is now fixed text.
- A validator that throws is reported as `VALIDATION_FAILED` instead of escaping as a raw error.
- A missing Web Crypto implementation (a page served over plain http) is reported as
  `UNSUPPORTED_ENVIRONMENT` instead of a bare `TypeError`.
- `SecureStorage.getSecure()` embedded the storage key in the error message on failure, undoing
  the intent of the generic message.
- `null` could be encrypted but not decrypted; `undefined` silently produced a non-string from
  `safeJsonStringify` and corrupted the ciphertext. `null` now round-trips, and values JSON cannot
  represent are rejected with a clear error.
- `MemoryStorage.getItem()` returned `null` for a stored empty string, violating the `IStorage`
  contract.
- The security and JSON helpers were implemented and tested since 1.0.0 but never re-exported, so
  they were unreachable: `timingSafeEqual`, `timingSafeEqualBuffer`, `randomDelay`,
  `safeJsonParse`, `safeJsonStringify`, the type guards and the base64 helpers.

### Security

- **PBKDF2 raised from 100,000 to 600,000 iterations** (OWASP recommendation for HMAC-SHA256).
  Encryption is correspondingly slower; existing data still decrypts at its recorded count.
- **Ciphertexts carry a versioned envelope** recording their iteration count, so KDF parameters
  can be strengthened later without invalidating stored data. Counts read from an envelope are
  range-checked, so a hostile ciphertext cannot force unbounded key-derivation work.
- **The envelope header is authenticated.** Version 2 passes the version and the iteration count
  to GCM as additional authenticated data, so neither can be altered without failing decryption.
  With `allowLegacy: false`, a ciphertext downgraded to the 1.0.x format, which would strip its
  context binding, is rejected instead of accepted.
- **Ciphertexts can be bound to a context**, and `SecureStorage` binds each value to the key it is
  stored under by default. Previously an attacker with write access to `localStorage` could swap
  two stored values and both would still decrypt; the application saw authentic plaintext in the
  wrong place. Disable with `{ bindToKey: false }` where ciphertexts must stay transferable.
  Values written by 1.x carry no binding and stay swappable until they are migrated with
  `rewrap()` and `allowLegacy` is turned off.
- **A password must be a string, and a non-empty one to encrypt.** `undefined` and `null` were
  coerced, so a missing form field or environment variable encrypted under `''` or `'null'`.
  Data written by 1.x under an empty password still decrypts.
- A context holding a lone surrogate is refused with `INVALID_ARGUMENT`: UTF-8 encodes every lone
  surrogate the same way, so two such contexts would have bound identically.
- A wrong password and a corrupted ciphertext now fail identically, so the error is not a
  decryption oracle.
- **Writing below 100,000 iterations is refused** with `INVALID_ITERATIONS`. The count was
  previously accepted down to 1. `allowWeakIterations: true` opts out, for test suites; reading
  a ciphertext written with a low count is unaffected.
- `allowLegacy: false` refuses the 1.x envelope, which predates context binding, for use once
  stored data has been migrated. It can be set on the encryptor or on the store; the store only
  overrides the encryptor when it is given a value.
- Blocked Web Storage (a sandboxed iframe, disabled cookies) is reported as `STORAGE_UNAVAILABLE`
  instead of escaping as the browser's own `SecurityError`.
- `getDeviceFingerprint()`, `LocalStorage` and `SessionStorage` fail with an actionable
  `STORAGE_UNAVAILABLE` / `UNSUPPORTED_ENVIRONMENT` error outside a browser instead of throwing a
  bare `ReferenceError`. The Web Storage adapters resolve their global lazily, so constructing one
  during server-side rendering stays safe; only an actual read or write throws.
- Documented that a device fingerprint must never be used as key material - it is unstable, and
  data keyed on it becomes permanently unrecoverable when it changes.

### Added

- `CryptoBoxError` with a stable `code`, and `isCryptoBoxError(error, code?)`. Failures no longer
  have to be told apart by message text. The guard is structural rather than `instanceof`, so it
  survives a duplicated copy of the class across entry points and an error thrown in another realm.
- Runtime validation on the read path: `decrypt(..., { validate })` and
  `getSecure(..., { validate })`. `decrypt<T>()` was an unchecked assertion; the validator that
  `safeJsonParse` had always supported was unreachable from the public API.
- Migration primitives: `inspect()` reads a ciphertext's declared parameters without the password,
  `needsRewrap()` compares them against a policy, and `rewrap()` re-encrypts under the current
  format. `SecureStorage` exposes `needsRewrap(key)` and `rewrap(key, password)`. `rewrap` only
  reports a value as current after decrypting it, because a 1.x ciphertext can, rarely, start with
  bytes that read like a current header. It re-reads the value before writing it back and leaves
  it alone if another writer changed it in the meantime.
- Configurable iteration count via `new AesGcmEncryptor({ iterations })`, per instance or per call.
- `IEnumerableStorage`, so `MemoryStorage.keys()` and `.clear()` are part of a contract rather than
  implementation details invisible through `IStorage`.
- `isDeviceFingerprintAvailable()` and `resolveWebStorage()`.
- `PBKDF2_ITERATIONS_WRITE_MIN`, the lowest iteration count accepted when writing.
- `@azemzemi/cryptobox/fingerprint` subpath export.

### Changed - breaking

- **1.0.x cannot read ciphertexts written by 2.0.** There is no option to write the 1.0.x format.
  After a rollback, or while an old tab or service worker still runs a 1.0.x bundle, values
  written by 2.0 fail to decrypt there. Roll 2.0 out to every client sharing a store first.
- **`deriveKey()` defaults to 600,000 iterations** instead of 100,000. A direct caller who relied
  on the default derives a different key; pass `100_000` explicitly to keep the 1.0.x key.
- **`IStorage` accepts asynchronous backends.** Every method may now return a promise, which brings
  IndexedDB, `chrome.storage`, React Native AsyncStorage and server-side key-value stores into
  scope. Synchronous adapters are unaffected.
- **`ISecureStorage.has()` and `.remove()` are asynchronous**, following from the above.
- **`IEncryptor.encrypt()` and `.decrypt()` take an options argument**, and gained an optional
  `needsRewrap()` capability.
- **The storage factories take an options object**: `createSecureLocalStorage({ encryptor })`
  instead of `createSecureLocalStorage(encryptor)`. They also forward `bindToKey` and
  `allowLegacy`. Passing the encryptor positionally throws `INVALID_ARGUMENT` rather than being
  silently replaced by the default encryptor.
- **Node.js 20 is the minimum.** The package relies on the global Web Crypto API, which Node 18
  only exposes behind a flag.
- `getSecure()` returns `null` for a stored `null` as well as for an absent key, now that `null`
  round-trips. Use `has()` to tell them apart.
- `AesGcmEncryptor` validates its options at construction instead of failing on the first
  `encrypt()`, and refuses a `rewrapPolicy` stricter than what it writes.
- `SecureStorage.has()` and `.getSecure()` now agree on a stored empty string: both treat it as
  absent. `has()` used to report `true` for a value `getSecure()` returned `null` for.

### Changed

- `strict` TypeScript tightened with `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`,
  `isolatedModules` and `verbatimModuleSyntax`; module resolution moved to `Bundler`.
- `src/` is no longer published (sourcemaps already embed the sources), and internal path aliases
  were replaced with relative imports.
- CI runs the type-check over source, tests and examples, plus lint, formatting, a coverage gate,
  and tests across Node 20/22/24. The dependency audit only blocks on runtime dependencies;
  dev-tooling advisories are advisory, since the package ships zero runtime dependencies.
- Releases publish from CI with npm provenance; GitHub Actions are pinned by commit SHA.
- The envelope reader is exercised with random buffers, every truncation and single-bit flips
  across a valid ciphertext, and the format is cross-checked against Node's OpenSSL bindings in
  both directions.

### Removed - breaking

- The 1.0.x aliases: `encryptData`, `decryptData`, `encryptToken`, `decryptToken`,
  `SecureLocalStorage`, `SecureSessionStorage`, `SecureMemoryStorage`, `LocalTokenStorage`,
  `SessionTokenStorage`, `MemoryTokenStorage`, `TokenStorage`. Roughly a fifth of the public
  surface was legacy aliasing. The README has the replacement for each.
- `getDeviceFingerprint` and `isDeviceFingerprintAvailable` leave the main entry for
  `@azemzemi/cryptobox/fingerprint`. They only run in a browser, and collecting device
  characteristics carries privacy obligations the rest of the package should not impose on its
  consumers.
- The internal format constants (`SALT_SIZE`, `IV_SIZE`, `ENVELOPE_HEADER_SIZE`, `AES_KEY_LENGTH`,
  `HASH_ALGORITHM`, `ENCRYPTION_ALGORITHM`, `KEY_DERIVATION_ALGORITHM`) are no longer exported.
  They locked the format into the public API without giving consumers anything to do with it.

### Known limitation

Key derivation is still performed per operation: writing ten values derives ten keys at 600,000
iterations each. Amortising it requires an encryptor that holds a derived `CryptoKey` rather than
a password, which is a separate envelope mode and is deliberately not mixed into this release.

## [1.0.2] - 2026-05-15

### Fixed

- Resolved advisories reported against the development dependencies.
- Updated the author email, repository and funding links after the rebranding.

## [1.0.1] - 2025-12-03

### Fixed

- Build system migrated from `tsc` to `tsup` to properly resolve TypeScript path aliases
- Fixed "Module not found" errors when using the package with modern bundlers (Next.js, Vite, Webpack, etc.)
- All path aliases (@core, @crypto, @storage, etc.) are now correctly resolved in compiled output
- Package now works seamlessly in all JavaScript projects with bundlers

### Changed

- Build tool: TypeScript compiler → tsup (esbuild-based bundler)
- Added tsup configuration for proper CommonJS and ESM builds
- Generated correct module extensions (.js for ESM, .cjs for CommonJS)

## [1.0.0] - 2025-11-28

### Added

- AES-256-GCM encryption with PBKDF2 (100,000 iterations)
- Storage abstraction (LocalStorage, SessionStorage, MemoryStorage)
- Device fingerprinting with Canvas + WebGL
- Timing-attack protection
- Full TypeScript support
- Zero dependencies
- Cross-platform (Browser, Node.js 18+, Deno, Bun)
- 93% test coverage

[2.0.0]: https://github.com/adelzemzemi/cryptobox/releases/tag/v2.0.0
[1.0.2]: https://github.com/adelzemzemi/cryptobox/releases/tag/v1.0.2
[1.0.1]: https://github.com/adelzemzemi/cryptobox/releases/tag/v1.0.1
[1.0.0]: https://github.com/adelzemzemi/cryptobox/releases/tag/v1.0.0
