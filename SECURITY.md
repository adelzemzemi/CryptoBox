# Security Policy

## Reporting Security Vulnerabilities

If you discover a security vulnerability, please report it privately:

1. **GitHub Security Advisory** (Preferred): https://github.com/adelzemzemi/cryptobox/security/advisories/new
2. **Email**: hello@adelzemzemi.com

**Do not create public issues for security vulnerabilities.**

**Please include:**

- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if available)

## Security properties

### Cryptography

- **AES-256-GCM**: Authenticated encryption with 256-bit keys
- **PBKDF2**: Key derivation with 600,000 iterations by default (OWASP recommendation), configurable per encryptor. Writing below 100,000 iterations is refused unless explicitly overridden
- **Versioned envelope**: Each ciphertext records its format version and iteration count, so parameters can be strengthened without invalidating existing data
- **Bounded key derivation**: Iteration counts read from a ciphertext are range-checked, so a hostile envelope cannot force unbounded PBKDF2 work
- **Secure Random**: Cryptographically secure random generation for salts and IVs
- **Constant-time comparison**: `timingSafeEqual` avoids input-dependent early exits (note that input _length_ is not hidden)

### Implementation

- **Zero Dependencies**: Minimized attack surface
- **Web Crypto API**: Native browser cryptography (no polyfills)
- **Input Validation**: Strict type checking and sanitization
- **Error Handling**: A wrong password and a corrupted ciphertext produce the same `Decryption failed` message, so the error is not a decryption oracle. Structural problems (invalid base64, truncated input) are reported distinctly, an attacker can determine those without the key, so they leak nothing.
- **Supply chain**: Published from CI with npm provenance; GitHub Actions are pinned by commit SHA

## Threat model

**What the package protects.** Data at rest in a store the attacker can read or
write but where they do not hold the password: a copied browser profile, a backup,
a synced or shared storage area, a database dump. Without the password the values
are unreadable, a modified value is rejected, and a value written by 2.x and moved
to another key or context stops decrypting.

**What it does not protect.**

- **Script running in your page.** An XSS payload, a malicious dependency or a
  browser extension with page access sees the password when it is typed and the
  plaintext when it is decrypted. Encryption does nothing against an attacker who
  is already inside the application: a Content Security Policy and careful output
  encoding are the defences there.
- **A password shipped with the application.** A password hard-coded in the bundle,
  or derivable from values the page can read, is available to anyone who has the
  ciphertext. That is obfuscation. The password has to come from the user, or from
  a secret the storage attacker cannot reach.
- **A weak password.** PBKDF2 slows guessing down; it does not make a guessable
  password safe. PBKDF2 is not memory-hard, so dedicated hardware tests candidates
  far faster than a browser does. It is used because it is the password-based KDF
  Web Crypto provides, and the package takes no dependencies.
- **A password in another Unicode form.** The password's UTF-8 bytes are used as
  given, without normalization, so the NFC and NFD forms of the same visible text
  (`café` precomposed or with a combining accent) are different passwords. Data
  written under one does not decrypt under the other. Normalize the password
  consistently before every call, for example with `password.normalize('NFC')`.
- **Values written by 1.x, until they are migrated.** They carry no binding. While
  `allowLegacy` is on, which is the default, an old 1.x ciphertext is accepted
  under any key. Migrate with `rewrap()` from a store you trust, then set
  `allowLegacy: false`.
- **Rollback.** An earlier value of the same key, put back in place, decrypts: the
  format has no notion of freshness. Keep a counter or a timestamp inside the
  payload if that matters.
- **Availability.** Whoever can write to the store can delete or corrupt its
  values. Tampering is detected, not prevented. They can also raise the iteration
  count declared by a value, which is used before the tag is checked: the read
  still fails, but only after up to 5,000,000 iterations. `maxIterations` lowers
  that bound to the count the application writes with. While 1.x values are still
  accepted, a refused value also costs one derivation at the 1.x count of 100,000.
- **Metadata.** Storage keys, the size of each value and when it changes are
  visible.

## Device fingerprinting

**Never derive an encryption key from `getDeviceFingerprint()`.** The value is unstable: a
browser update, a driver change, a new monitor, a resized window, a timezone change or an
anti-fingerprinting setting all change it. Data encrypted under the previous value becomes
permanently unrecoverable, silently and with no way back.

- Can be spoofed or bypassed
- Changes when the browser or device changes
- Use as an additional signal, never as key material or primary authentication
- Guard the call with `isDeviceFingerprintAvailable()`; it requires a browser environment

## Independent audit status

**This library has never been audited by a third party.**

No external firm or independent cryptographer has reviewed the design, the envelope
format or the implementation. The reviews listed below were performed by the
maintainers on their own code. They are useful (they are how the issues in the list
were found), but a self-review cannot substitute for adversarial examination by
someone with no stake in the result, and it should not be read as one.

Treat the guarantees here as "carefully built and thoroughly tested", not as
"independently verified". If you are protecting assets whose loss you could not
absorb, commission an audit before relying on this package, and read the
[threat model](#threat-model) first: several classes of attack are out of scope by
design and no amount of review changes that.

## Internal review history

- **Version 2.1.1** (November 2026): Review of 2.1.0
  - `encrypt()` refuses a plaintext that is not a string, and every entry point refuses a context that is not a string, instead of coercing them: an untyped caller could encrypt `undefined` as `""`, and any two objects bound to the same context
  - An `AesGcmEncryptor` refuses a per-call iteration count above its own `maxIterations`, which it would otherwise write and then refuse to read
  - Passwords are used without Unicode normalization; this is now documented in the threat model and pinned by a test, since normalizing would change the key of existing non-ASCII passwords
  - The packed package is exercised in CI under Bun, Deno and headless Chrome, not only Node
  - Not covered by this review: other browser engines than Chromium, and any form of external validation
- **Version 2.1.0** (November 2026): Read-side iteration cap
  - `maxIterations` bounds the PBKDF2 count a read will derive with. The count is read from the envelope before the tag can be checked, so whoever can write to the store could make a failing read cost up to 5,000,000 iterations; with the cap set, an envelope declaring more is refused without deriving at that count (one 100,000-iteration attempt remains while 1.x values are accepted)
  - An encryptor refuses a cap lower than the count it writes with
- **Version 2.0.0** (November 2026): Security, architecture and packaging review
  - PBKDF2 raised from 100,000 to 600,000 iterations, with a versioned envelope so the parameter can be raised again later
  - The envelope header is authenticated as AES-GCM additional data, so the declared version and iteration count are tamper-evident; with `allowLegacy: false`, a downgrade to the 1.x format is rejected
  - Ciphertexts are bound to a caller-supplied context, and `SecureStorage` binds each value to its storage key, so a ciphertext relocated by an attacker with write access no longer decrypts
  - Removed a decryption-error inconsistency: malformed base64 previously surfaced a runtime-specific error instead of a `CryptoBoxError` with code `MALFORMED_CIPHERTEXT`
  - `SecureStorage` no longer embeds the storage key in decryption failure messages
  - Range check on envelope iteration counts to bound attacker-controlled key-derivation work
  - Browser-only entry points now fail with an actionable error outside the browser instead of a `ReferenceError`, thrown on use so that server-side rendering can still construct them
  - `rewrap()` lets stored data be migrated to the current parameters, after which `allowLegacy: false` refuses the older format outright
  - Frozen ciphertext vectors committed as literals, so a silent drift in key derivation or envelope layout is caught instead of masked by tests that generate their own input
  - The envelope reader is exercised with random buffers, every truncation and single-bit flips across a valid ciphertext (all bytes except the two high bytes of the iteration count)
  - The format is cross-checked against an independent implementation (Node's OpenSSL bindings), in both directions
  - Writing below 100,000 PBKDF2 iterations is refused unless explicitly overridden
  - 100% statement, line and function coverage at release, with a CI gate at 100% for those three and 95% for branches
  - Not covered by this review: coverage-guided fuzzing, side-channel analysis of the JavaScript runtime, and any form of external validation
