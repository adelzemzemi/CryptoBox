# Changelog

All notable changes to this project will be documented in this file.

## [1.0.1] - 2025-12-03

### Fixed
- Build system migrated from `tsc` to `tsup` to properly resolve TypeScript path aliases
- Fixed "Module not found" errors when using the package in Next.js and other bundlers
- All path aliases (@core, @crypto, @storage, etc.) are now correctly resolved in compiled output

### Changed
- Build tool: TypeScript compiler → tsup (esbuild-based bundler)
- Added tsup configuration for proper CommonJS and ESM builds

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

[1.0.1]: https://github.com/zemzemi/cryptobox/releases/tag/v1.0.1
[1.0.0]: https://github.com/zemzemi/cryptobox/releases/tag/v1.0.0
