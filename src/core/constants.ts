export const SALT_SIZE = 16;
export const IV_SIZE = 12;

/** Default PBKDF2 iteration count (OWASP recommendation for PBKDF2-HMAC-SHA256). */
export const PBKDF2_ITERATIONS = 600_000;

/** Iteration count used by envelope version 0. Only used when reading legacy data. */
export const PBKDF2_ITERATIONS_LEGACY = 100_000;

/** Lower bound accepted for an iteration count read out of an envelope. */
export const PBKDF2_ITERATIONS_MIN = 1;

/**
 * Upper bound accepted for an iteration count read out of an envelope, so that a
 * hostile envelope cannot force an unbounded amount of key derivation.
 */
export const PBKDF2_ITERATIONS_MAX = 5_000_000;

/**
 * Envelope version written by this release.
 *
 * Layout: `version(1) || iterations(4, big-endian) || salt(16) || iv(12) || ciphertext`
 *
 * The 5-byte header is passed to AES-GCM as additional authenticated data, together
 * with the caller's context, so neither the declared version nor the declared
 * iteration count can be altered without invalidating the tag.
 */
export const ENVELOPE_VERSION = 2;

/**
 * Version 0: no header at all (`salt || iv || ciphertext`), with a fixed iteration
 * count of {@link PBKDF2_ITERATIONS_LEGACY}.
 */
export const ENVELOPE_VERSION_HEADERLESS = 0;

/** Size of the version + iterations header in a version 2 envelope. */
export const ENVELOPE_HEADER_SIZE = 5;

export const AES_KEY_LENGTH = 256;
export const HASH_ALGORITHM = 'SHA-256';
export const ENCRYPTION_ALGORITHM = 'AES-GCM';
export const KEY_DERIVATION_ALGORITHM = 'PBKDF2';
