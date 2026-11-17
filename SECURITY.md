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

## Security Features

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
- **Error Handling**: A wrong password and a corrupted ciphertext produce the same `Decryption failed` message, so the error is not a decryption oracle. Structural problems (invalid base64, truncated input) are reported distinctly — an attacker can determine those without the key, so they leak nothing.
- **Supply chain**: Published from CI with npm provenance; GitHub Actions are pinned by commit SHA

### Data Encoding

- **Secure Base64**: Handles all byte values (0-255) correctly
- **Cross-Platform**: Browser and Node.js/Bun compatible

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
  is already inside the application.
- **A password shipped with the application.** A password hard-coded in the bundle,
  or derivable from values the page can read, is available to anyone who has the
  ciphertext. That is obfuscation. The password has to come from the user, or from
  a secret the storage attacker cannot reach.
- **A weak password.** PBKDF2 slows guessing down; it does not make a guessable
  password safe. PBKDF2 is not memory-hard, so dedicated hardware tests candidates
  far faster than a browser does. It is used because it is the password-based KDF
  Web Crypto provides, and the package takes no dependencies.
- **Values written by 1.x, until they are migrated.** They carry no binding. While
  `allowLegacy` is on, which is the default, an old 1.x ciphertext is accepted
  under any key. Migrate with `rewrap()` from a store you trust, then set
  `allowLegacy: false`.
- **Rollback.** An earlier value of the same key, put back in place, decrypts: the
  format has no notion of freshness. Keep a counter or a timestamp inside the
  payload if that matters.
- **Availability.** Whoever can write to the store can delete or corrupt its
  values. Tampering is detected, not prevented.
- **Metadata.** Storage keys, the size of each value and when it changes are
  visible.

## Security Considerations

### Device Fingerprinting

⚠️ **Never derive an encryption key from `getDeviceFingerprint()`.** The value is unstable: a
browser update, a driver change, a new monitor, a resized window, a timezone change or an
anti-fingerprinting setting all change it. Data encrypted under the previous value becomes
permanently unrecoverable, silently and with no way back.

- Can be spoofed or bypassed
- Changes when the browser or device changes
- Use as an additional signal, never as key material or primary authentication
- Guard the call with `isDeviceFingerprintAvailable()`; it requires a browser environment

### Storage Security

- **LocalStorage/SessionStorage**: Vulnerable to XSS attacks
- **Best Practice**: Sanitize all user inputs and use Content Security Policy (CSP)
- **Server-Side**: Always validate data server-side as well

### Production Recommendations

1. Use HTTPS exclusively
2. Implement rate limiting for decryption attempts
3. Log failed decryption attempts
4. Keep the default of 600,000 PBKDF2 iterations, or raise it — the value is recorded per ciphertext, so raising it is safe for existing data
5. Implement proper CSP headers
6. Regular security audits

## Known Limitations

- No protection against XSS if application is compromised
- LocalStorage data accessible by any JavaScript on the same origin
- Device fingerprinting can be circumvented
- Client-side encryption cannot replace server-side security

## Security Updates

This library is regularly updated to address security concerns. Keep your dependencies up to date:

```bash
npm update @azemzemi/cryptobox
```

## Independent audit status

**This library has never been audited by a third party.**

No external firm or independent cryptographer has reviewed the design, the envelope
format or the implementation. The reviews listed below were performed by the
maintainers on their own code. They are useful — they are how the issues in the list
were found — but a self-review cannot substitute for adversarial examination by
someone with no stake in the result, and it should not be read as one.

Treat the guarantees here as "carefully built and thoroughly tested", not as
"independently verified". If you are protecting assets whose loss you could not
absorb, commission an audit before relying on this package, and read
[Known Limitations](#known-limitations) first — several classes of attack are out of
scope by design and no amount of review changes that.

## Internal review history

- **Version 2.0.0** (August 2026): Security, architecture and packaging review
  - PBKDF2 raised from 100,000 to 600,000 iterations, with a versioned envelope so the parameter can be raised again later
  - The envelope header is authenticated as AES-GCM additional data, so the declared version and iteration count are tamper-evident and a format downgrade is rejected
  - Ciphertexts are bound to a caller-supplied context, and `SecureStorage` binds each value to its storage key, so a ciphertext relocated by an attacker with write access no longer decrypts
  - Removed a decryption-error inconsistency: malformed base64 previously surfaced a runtime-specific error instead of the uniform failure message
  - `SecureStorage` no longer embeds the storage key in decryption failure messages
  - Range check on envelope iteration counts to bound attacker-controlled key-derivation work
  - Browser-only entry points now fail with an actionable error outside the browser instead of a `ReferenceError`, thrown on use so that server-side rendering can still construct them
  - `rewrap()` lets stored data be migrated to the current parameters, after which `allowLegacy: false` refuses the older format outright
  - Frozen ciphertext vectors committed as literals, so a silent drift in key derivation or envelope layout is caught instead of masked by tests that generate their own input
  - The envelope reader is exercised with random buffers, every truncation and every single-bit flip of a valid ciphertext
  - The format is cross-checked against an independent implementation (Node's OpenSSL bindings), in both directions
  - Writing below 100,000 PBKDF2 iterations is refused unless explicitly overridden
  - 100% statement / line / function coverage, enforced as a CI gate
  - Not covered by this review: coverage-guided fuzzing, side-channel analysis of the JavaScript runtime, and any form of external validation

- **Version 1.0.0** (November 2025): Initial release with security review
  - 93.93% test coverage
  - Zero known vulnerabilities
  - SOLID architecture for maintainability
