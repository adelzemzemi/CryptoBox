# Changelog

All notable changes to this project will be documented in this file.

## [2.0.0] - 2026-08-13

Supersedes 1.0.2, the previous published release.

A contracts release. `IStorage` and `IEncryptor` were the two ceilings on what this
package could do: a synchronous backend interface ruled out every asynchronous store,
and an encryptor that took only `(data, password)` had nowhere to put a context, a
validator or a migration hook. Both are widened here, and the features that were
blocked behind them land at the same time. It also carries the packaging and hardening
fixes listed under Fixed, which is where most of the day-to-day difference from 1.0.2
will be felt.

Existing ciphertexts keep working. Nothing needs to be re-encrypted to upgrade — see
`rewrap()` for the optional migration that raises the iteration count and adds context
binding to data written by 1.0.x.

### Fixed

- **CommonJS entry point was unusable.** The CJS bundle was written to `dist/index.js` inside a
  `"type": "module"` package, so Node parsed it as ESM: `require('@azemzemi/cryptobox')` resolved
  to an empty object on Node 22+, and threw `ERR_REQUIRE_ESM` on Node 18-20. The CJS build is now
  `dist/index.cjs`, with per-condition `types` in the `exports` map. Verified in CI by
  `are-the-types-wrong`, `publint`, and a smoke test that installs the packed tarball and imports
  it from both CJS and ESM.
- Malformed base64 escaped as a runtime-specific `InvalidCharacterError` instead of the uniform
  decryption failure message.
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
- **The envelope header is authenticated.** Version and iteration count used to sit in the clear
  outside the AES-GCM tag. Version 2 passes the header to GCM as additional authenticated data,
  so a ciphertext downgraded to an earlier format - which would strip its context binding - is
  rejected instead of accepted.
- **Ciphertexts can be bound to a context**, and `SecureStorage` binds each value to the key it is
  stored under by default. Previously an attacker with write access to `localStorage` could swap
  two stored values and both would still decrypt; the application saw authentic plaintext in the
  wrong place. Disable with `{ bindToKey: false }` where ciphertexts must stay transferable.
- A wrong password and a corrupted ciphertext now fail identically, so the error is not a
  decryption oracle.
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
  bytes that read like a current header.
- Configurable iteration count via `new AesGcmEncryptor({ iterations })`, per instance or per call.
- `IEnumerableStorage`, so `MemoryStorage.keys()` and `.clear()` are part of a contract rather than
  implementation details invisible through `IStorage`.
- `isDeviceFingerprintAvailable()` and `resolveWebStorage()`.
- `@azemzemi/cryptobox/fingerprint` subpath export.

### Changed - breaking

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
  `encrypt()`.
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
