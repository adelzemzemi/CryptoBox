# Security Policy

## Reporting Security Vulnerabilities

If you discover a security vulnerability, please report it privately:

1. **GitHub Security Advisory** (Preferred): https://github.com/zemzemi/cryptovault/security/advisories/new
2. **Email**: adelzemzemi@hotmail.com

**Do not create public issues for security vulnerabilities.**

**Please include:**
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if available)

## Security Features

### Cryptography
- **AES-256-GCM**: Authenticated encryption with 256-bit keys
- **PBKDF2**: Key derivation with 100,000 iterations (configurable)
- **Secure Random**: Cryptographically secure random generation for salts and IVs
- **Timing Attack Protection**: Constant-time comparisons to prevent information leakage

### Implementation
- **Zero Dependencies**: Minimized attack surface
- **Web Crypto API**: Native browser cryptography (no polyfills)
- **Input Validation**: Strict type checking and sanitization
- **Error Handling**: Generic error messages to prevent information disclosure

### Data Encoding
- **Secure Base64**: Handles all byte values (0-255) correctly
- **Cross-Platform**: Browser and Node.js/Bun compatible

## Security Considerations

### Device Fingerprinting
⚠️ Device fingerprinting provides convenience but **should not be used alone for critical security**:
- Can be spoofed or bypassed
- Changes when browser/device updates
- Use as additional factor, not primary authentication

### Storage Security
- **LocalStorage/SessionStorage**: Vulnerable to XSS attacks
- **Best Practice**: Sanitize all user inputs and use Content Security Policy (CSP)
- **Server-Side**: Always validate data server-side as well

### Production Recommendations
1. Use HTTPS exclusively
2. Implement rate limiting for decryption attempts
3. Log failed decryption attempts
4. Consider increasing PBKDF2 iterations to 600,000+ (OWASP 2023)
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
npm update cryptovault
```

## Audit History

- **Version 1.0.0** (November 2025): Initial release with security review
  - 93.93% test coverage
  - Zero known vulnerabilities
  - SOLID architecture for maintainability
