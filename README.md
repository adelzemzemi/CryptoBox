# CryptoBox

Secure encryption and storage for JavaScript & TypeScript.

[![npm version](https://img.shields.io/npm/v/@azemzemi/cryptobox.svg)](https://www.npmjs.com/package/@azemzemi/cryptobox)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)
[![GitHub](https://img.shields.io/badge/GitHub-zemzemi%2Fcryptobox-blue.svg)](https://github.com/zemzemi/cryptobox)

Zero dependencies • AES-256-GCM • Type-safe • Cross-platform

## Why CryptoBox?

- **🔒 Secure by Default** - Military-grade AES-256-GCM encryption
- **📦 Zero Dependencies** - No supply chain vulnerabilities
- **🎯 Type-Safe** - Full TypeScript support with strict typing
- **✅ Production-Ready** - 93% test coverage, battle-tested
- **⚡ Simple API** - 3 lines to encrypt localStorage
- **🌐 Universal** - Works in Browser, Node.js, Deno, and Bun

## Install

```bash
npm install @azemzemi/cryptobox
```

## Usage

```typescript
import { createSecureLocalStorage } from '@azemzemi/cryptobox';

const storage = createSecureLocalStorage();

await storage.setSecure('user', { id: 123 }, 'password');
const user = await storage.getSecure('user', 'password');
```

## Features

- AES-256-GCM encryption with PBKDF2
- Zero dependencies
- Full TypeScript support
- Browser, Node.js 18+, Deno, Bun
- 93% test coverage

## Use Cases

```typescript
// Authentication tokens
await storage.setSecure('auth', { jwt: 'xxx', refresh: 'yyy' }, password);

// Sensitive user data
await storage.setSecure('payment', { cardLast4: '1234' }, password);

// Form auto-save
await storage.setSecure('draft', { title: 'Post', content: '...' }, password);
```

## API

### Storage

```typescript
createSecureLocalStorage()      // Browser: localStorage
createSecureSessionStorage()    // Browser: sessionStorage
createSecureMemoryStorage()     // Universal: in-memory
```

### Encryption

```typescript
import { AesGcmEncryptor } from '@azemzemi/cryptobox';

const encryptor = new AesGcmEncryptor();
const encrypted = await encryptor.encrypt(data, 'password');
const decrypted = await encryptor.decrypt(encrypted, 'password');
```

### Custom Storage

```typescript
import { SecureStorage, AesGcmEncryptor, IStorage } from '@azemzemi/cryptobox';

class MyStorage implements IStorage {
  setItem(key: string, value: string): void { }
  getItem(key: string): string | null { return null; }
  removeItem(key: string): void { }
}

const storage = new SecureStorage(new MyStorage(), new AesGcmEncryptor());
```

## Security

- AES-256-GCM authenticated encryption
- PBKDF2-HMAC-SHA256 (100,000 iterations)
- Random salt and IV per operation
- Timing-attack protection

See [SECURITY.md](SECURITY.md) for vulnerability reporting.

## License

MIT
