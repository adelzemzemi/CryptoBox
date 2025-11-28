# Contributing to CryptoVault

Thank you for considering contributing to CryptoVault! 🎉

## Code of Conduct

This project adheres to the [Code of Conduct](CODE_OF_CONDUCT.md).

## How to Contribute

### Reporting Bugs

Use the [Bug Report template](.github/ISSUE_TEMPLATE/bug_report.md) and include:
- Steps to reproduce
- Expected vs actual behavior
- Environment (OS, Node version, browser)

### Suggesting Features

Use the [Feature Request template](.github/ISSUE_TEMPLATE/feature_request.md) and describe:
- Use case and motivation
- Proposed solution

### Security Issues

**DO NOT** open public issues. Report privately:
- GitHub Security Advisory: https://github.com/zemzemi/cryptovault/security/advisories/new
- Email: adelzemzemi@hotmail.com

See [SECURITY.md](SECURITY.md) for details.

## Development

```bash
git clone https://github.com/zemzemi/cryptovault.git
cd cryptovault
npm install
npm run build
npm test
npm run lint
```

## Pull Request Process

1. Fork and create a branch: `git checkout -b feature/my-feature`
2. Make changes and add tests
3. Run: `npm test && npm run lint`
4. Commit with clear messages (see [Conventional Commits](https://www.conventionalcommits.org/))
5. Push and open a Pull Request

### Commit Format

```
type(scope): subject
```

**Types:** `feat`, `fix`, `docs`, `refactor`, `test`, `security`

**Examples:**
```
feat(crypto): add ChaCha20 encryption
fix(storage): resolve memory leak
security(crypto): increase PBKDF2 iterations
```

## Guidelines

### Code Standards
- TypeScript strict mode
- No `any` types without justification
- JSDoc for public APIs
- Named constants (no magic numbers)

### Security
- Validate all inputs
- Use `timingSafeEqual` for comparisons
- Generic error messages
- No information leakage

### Testing
- Unit tests required for new features
- Minimum 80% coverage
- Run `npm test` before submitting

### Style
- Run `npm run format` (Prettier)
- Run `npm run lint` (ESLint)

## Questions?

- [GitHub Discussions](https://github.com/zemzemi/cryptovault/discussions)
- [GitHub Issues](https://github.com/zemzemi/cryptovault/issues)
- Email: adelzemzemi@hotmail.com

Thank you for contributing! 🚀
