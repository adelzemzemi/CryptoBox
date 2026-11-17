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
- **PBKDF2**: Key derivation with 600,000 iterations by default (OWASP recommendation), configurable per encryptor
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
  - 100% statement / line / function coverage, enforced as a CI gate
  - Not covered by this review: fuzzing of the envelope parser, side-channel analysis of the JavaScript runtime, and any form of external validation

- **Version 1.0.0** (November 2025): Initial release with security review
  - 93.93% test coverage
  - Zero known vulnerabilities
  - SOLID architecture for maintainability
