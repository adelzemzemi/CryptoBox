/**
 * Stable identifier carried by every error this package throws.
 *
 * Match on the code rather than on the message: messages may be reworded in a
 * patch release, codes only change in a major.
 */
export type CryptoBoxErrorCode =
  /** The key is wrong, the data was tampered with, or the bound context does not match. */
  | 'DECRYPTION_FAILED'
  /** The input is not a well-formed envelope (wrong length, truncated header). */
  | 'MALFORMED_CIPHERTEXT'
  /** The envelope version is readable in principle but rejected by the current options. */
  | 'UNSUPPORTED_ENVELOPE'
  /** The input is not valid base64. */
  | 'INVALID_BASE64'
  /** An iteration count is outside the accepted range or is not an integer. */
  | 'INVALID_ITERATIONS'
  /** An argument does not have the shape the function expects. */
  | 'INVALID_ARGUMENT'
  /** The value cannot be represented as JSON. */
  | 'SERIALIZATION_FAILED'
  /** The decrypted payload is not valid JSON. */
  | 'DESERIALIZATION_FAILED'
  /** The decrypted payload was rejected by the supplied validator. */
  | 'VALIDATION_FAILED'
  /** The requested storage backend does not exist in this runtime. */
  | 'STORAGE_UNAVAILABLE'
  /** The runtime lacks a global the operation requires. */
  | 'UNSUPPORTED_ENVIRONMENT';

/**
 * Every error thrown by this package.
 *
 * @example
 * ```ts
 * try {
 *   await store.getSecure('session', password);
 * } catch (error) {
 *   if (isCryptoBoxError(error, 'DECRYPTION_FAILED')) promptForPassword();
 *   else throw error;
 * }
 * ```
 */
export class CryptoBoxError extends Error {
  override readonly name = 'CryptoBoxError';

  readonly code: CryptoBoxErrorCode;

  constructor(code: CryptoBoxErrorCode, message: string) {
    super(message);
    this.code = code;
  }
}

/**
 * Narrow an unknown caught value to a {@link CryptoBoxError}.
 *
 * Prefer this over `instanceof`: the package ships several entry points, and a
 * duplicated copy of the class, through bundling, a nested install or a
 * different realm, would make `instanceof` return false for an error that is
 * genuinely ours. The check here is structural and immune to that.
 *
 * @param value - Caught value
 * @param code - Optional code to match as well
 * @returns True if the value is a CryptoBoxError with the given code
 */
export function isCryptoBoxError(value: unknown): value is CryptoBoxError;
export function isCryptoBoxError<C extends CryptoBoxErrorCode>(
  value: unknown,
  code: C
): value is CryptoBoxError & { readonly code: C };
export function isCryptoBoxError(value: unknown, code?: CryptoBoxErrorCode): boolean {
  if (typeof value !== 'object' || value === null) return false;

  const { name, code: actual } = value as { name?: unknown; code?: unknown };
  if (name !== 'CryptoBoxError' || typeof actual !== 'string') return false;

  return code === undefined || actual === code;
}

/** Extract a message from an unknown thrown value, for embedding in a wrapper error. */
export function describeCause(error: unknown): string {
  return error instanceof Error ? error.message : 'unknown error';
}
