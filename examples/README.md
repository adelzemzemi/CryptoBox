# CryptoBox Examples

## Files

- `basic-encryption.ts` - Simple string encryption
- `generic-data.ts` - Complex objects with type safety
- `secure-storage.ts` - Auto encryption/decryption storage
- `device-fingerprint.ts` - Password-less encryption
- `dependency-injection.ts` - Custom implementations

## Run

```bash
npm run build
npx tsx examples/basic-encryption.ts
```

## Best Practices

- Use strong passwords (12+ chars)
- Type your data with interfaces
- Handle errors with try-catch
- HTTPS only in production
- Don't commit passwords

## Security

- Device fingerprint = convenience only
- LocalStorage vulnerable to XSS
- See `SECURITY.md` for details
