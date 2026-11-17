import { CryptoBoxError } from '../core/errors.js';

/**
 * Resolve the Web Crypto implementation.
 *
 * `crypto.subtle` is undefined on a page served over plain http, and absent from
 * runtimes without Web Crypto; both would otherwise surface as a bare TypeError.
 *
 * @returns The runtime's Web Crypto object
 * @throws CryptoBoxError `UNSUPPORTED_ENVIRONMENT` if Web Crypto is unavailable
 */
export function requireWebCrypto(): Crypto {
  const candidate = (globalThis as { crypto?: Crypto }).crypto;

  if (!candidate?.subtle || typeof candidate.getRandomValues !== 'function') {
    throw new CryptoBoxError(
      'UNSUPPORTED_ENVIRONMENT',
      'Web Crypto is not available in this environment. Browsers only expose it on secure origins (https or localhost).'
    );
  }

  return candidate;
}

/**
 * Reject a password that is not a string.
 *
 * Untyped callers passing `undefined` or `null` would otherwise have it coerced,
 * and encrypt under the empty string or the text "null".
 *
 * @param password - Value received as a password
 * @throws CryptoBoxError `INVALID_ARGUMENT` if it is not a string
 */
export function assertPassword(password: unknown): asserts password is string {
  if (typeof password !== 'string') {
    throw new CryptoBoxError('INVALID_ARGUMENT', 'Invalid password: expected a string');
  }
}

/**
 * Reject a password that cannot protect new data.
 *
 * The empty string is refused on write only: 1.x accepted it, so data it wrote
 * that way must stay readable.
 *
 * @param password - Value received as a password
 * @throws CryptoBoxError `INVALID_ARGUMENT` if it is not a non-empty string
 */
export function assertWritePassword(password: unknown): asserts password is string {
  assertPassword(password);

  if (password.length === 0) {
    throw new CryptoBoxError('INVALID_ARGUMENT', 'Invalid password: it must not be empty');
  }
}

function isWellFormed(text: string): boolean {
  for (let i = 0; i < text.length; i++) {
    const unit = text.charCodeAt(i);

    if (unit >= 0xd800 && unit <= 0xdbff) {
      const next = text.charCodeAt(i + 1);
      if (!(next >= 0xdc00 && next <= 0xdfff)) return false;
      i++;
    } else if (unit >= 0xdc00 && unit <= 0xdfff) {
      return false;
    }
  }

  return true;
}

/**
 * Reject a context that UTF-8 cannot represent faithfully.
 *
 * A lone surrogate is encoded as U+FFFD, so two different contexts would
 * authenticate as the same bytes and the binding would not tell them apart.
 *
 * @param context - Caller-supplied context
 * @throws CryptoBoxError `INVALID_ARGUMENT` if it contains a lone surrogate
 */
export function assertContext(context: string): void {
  if (!isWellFormed(context)) {
    throw new CryptoBoxError(
      'INVALID_ARGUMENT',
      'Invalid context: it contains a lone surrogate and cannot be encoded as UTF-8'
    );
  }
}
