import { deriveKey } from './key-derivation.js';
import { encodeBase64, decodeBase64 } from '../encoding/base64.js';
import {
  buildAad,
  buildHeader,
  envelopeAad,
  envelopeCandidates,
  parseHeadered,
  parseHeaderless,
  assertWritableIterations,
  readVersion,
  serializeEnvelope,
  HEADERLESS_MINIMUM,
  type Envelope,
} from '../envelope.js';
import { CryptoBoxError, isCryptoBoxError } from '../../core/errors.js';
import { assertContext, assertPassword, assertWritePassword, requireWebCrypto } from '../guards.js';
import type { DecryptOptions, EncryptOptions } from '../../core/options.js';
import {
  SALT_SIZE,
  IV_SIZE,
  ENCRYPTION_ALGORITHM,
  ENVELOPE_VERSION,
  PBKDF2_ITERATIONS,
} from '../../core/constants.js';

/** What a ciphertext declares about itself, readable without the password. */
export interface EnvelopeInfo {
  /** Envelope format version: 0 or 2. */
  version: number;
  /** PBKDF2 iteration count used to derive the key. */
  iterations: number;
  /** True when the ciphertext is bound to a context and authenticates its header. */
  contextBound: boolean;
}

/** Conditions under which a ciphertext should be re-encrypted. */
export interface RewrapPolicy {
  /** Flag ciphertexts derived with fewer iterations. Defaults to {@link PBKDF2_ITERATIONS}. */
  minIterations?: number;
  /** Flag ciphertexts in an older envelope version. Defaults to {@link ENVELOPE_VERSION}. */
  minVersion?: number;
}

/** Options for {@link rewrap}. */
export interface RewrapOptions extends EncryptOptions {
  /**
   * Context the existing ciphertext was written with. Defaults to
   * {@link EncryptOptions.context}, which is the common case of re-encrypting in
   * place. Supply it explicitly to move a ciphertext from one context to another.
   */
  previousContext?: string;
  /** Whether the existing ciphertext may be an older version. Defaults to `true`. */
  allowLegacy?: boolean;
}

function decodeEnvelopeBytes(ciphertext: string): Uint8Array {
  let bytes: Uint8Array;

  try {
    bytes = decodeBase64(ciphertext);
  } catch (error) {
    if (!isCryptoBoxError(error, 'INVALID_BASE64')) throw error;
    throw new CryptoBoxError('MALFORMED_CIPHERTEXT', 'Invalid encrypted data: not valid base64');
  }

  if (bytes.length < HEADERLESS_MINIMUM) {
    throw new CryptoBoxError('MALFORMED_CIPHERTEXT', 'Invalid encrypted data: too short');
  }

  return bytes;
}

async function tryDecrypt(
  envelope: Envelope,
  password: string,
  context: string
): Promise<string | null> {
  const key = await deriveKey(password, envelope.salt, envelope.iterations);
  const aad = envelopeAad(envelope, context);

  try {
    const decrypted = await requireWebCrypto().subtle.decrypt(
      aad
        ? {
            name: ENCRYPTION_ALGORITHM,
            iv: envelope.iv as BufferSource,
            additionalData: aad as BufferSource,
          }
        : { name: ENCRYPTION_ALGORITHM, iv: envelope.iv as BufferSource },
      key,
      envelope.body as BufferSource
    );
    return new TextDecoder().decode(decrypted);
  } catch {
    return null;
  }
}

/**
 * Encrypt a string using AES-256-GCM with a PBKDF2-derived key.
 *
 * @param plaintext - String to encrypt
 * @param password - Encryption password
 * @param options - Iteration count and context binding
 * @returns Base64-encoded version 2 envelope
 * @throws CryptoBoxError `INVALID_ITERATIONS` if the iteration count is out of range or too low
 * @throws CryptoBoxError `INVALID_ARGUMENT` if the password is empty or the context is ill-formed
 */
export async function encrypt(
  plaintext: string,
  password: string,
  options: EncryptOptions = {}
): Promise<string> {
  const iterations = options.iterations ?? PBKDF2_ITERATIONS;
  const context = options.context ?? '';

  assertWritePassword(password);
  assertContext(context);
  assertWritableIterations(iterations, options.allowWeakIterations ?? false);

  const webCrypto = requireWebCrypto();
  const salt = webCrypto.getRandomValues(new Uint8Array(SALT_SIZE));
  const iv = webCrypto.getRandomValues(new Uint8Array(IV_SIZE));
  const header = buildHeader(iterations);
  const aad = buildAad(header, context);

  const key = await deriveKey(password, salt, iterations);

  const body = new Uint8Array(
    await webCrypto.subtle.encrypt(
      { name: ENCRYPTION_ALGORITHM, iv: iv as BufferSource, additionalData: aad as BufferSource },
      key,
      new TextEncoder().encode(plaintext) as BufferSource
    )
  );

  return encodeBase64(serializeEnvelope(header, salt, iv, body));
}

/**
 * Decrypt a string produced by {@link encrypt}, including version 0 envelopes written by 1.x.
 *
 * A wrong password, a corrupted ciphertext and a mismatched context all report
 * `DECRYPTION_FAILED`, so the error carries no information about the key.
 * Structural problems report `MALFORMED_CIPHERTEXT`; they are determined without
 * the key and leak nothing.
 *
 * @param ciphertext - Base64-encoded envelope
 * @param password - Decryption password
 * @param options - Context binding and legacy tolerance
 * @returns Decrypted plaintext
 * @throws CryptoBoxError `MALFORMED_CIPHERTEXT`, `UNSUPPORTED_ENVELOPE` or `DECRYPTION_FAILED`
 */
export async function decrypt(
  ciphertext: string,
  password: string,
  options: DecryptOptions = {}
): Promise<string> {
  const context = options.context ?? '';

  assertPassword(password);
  assertContext(context);

  const bytes = decodeEnvelopeBytes(ciphertext);
  const allowLegacy = options.allowLegacy ?? true;
  const candidates = envelopeCandidates(bytes, allowLegacy);

  if (candidates.length === 0) {
    // Only reachable with allowLegacy false: the buffer is not a version 2 envelope.
    // One that announces version 2 is damaged; anything else can only be version 0.
    if (readVersion(bytes) === ENVELOPE_VERSION) {
      throw new CryptoBoxError(
        'MALFORMED_CIPHERTEXT',
        'Invalid encrypted data: not a well-formed version 2 envelope'
      );
    }

    throw new CryptoBoxError(
      'UNSUPPORTED_ENVELOPE',
      'Legacy envelope (version 0) is rejected because allowLegacy is false. ' +
        'Migrate the data with rewrap() before disabling legacy reads.'
    );
  }

  for (const envelope of candidates) {
    const plaintext = await tryDecrypt(envelope, password, context);
    if (plaintext !== null) return plaintext;
  }

  throw new CryptoBoxError('DECRYPTION_FAILED', 'Decryption failed');
}

/**
 * Read what a ciphertext declares about itself, without the password.
 *
 * Without the key the answer is a reading, not a proof. A version 0 envelope
 * starts with a random salt, and roughly one in 200,000 of them happens to look
 * like a version 2 header; it is then reported as version 2. Only decryption
 * settles it, which is why {@link rewrap} never relies on this function.
 *
 * @param ciphertext - Base64-encoded envelope
 * @returns The declared version, iteration count and binding status
 * @throws CryptoBoxError `MALFORMED_CIPHERTEXT` if the input is not an envelope
 */
export function inspect(ciphertext: string): EnvelopeInfo {
  const bytes = decodeEnvelopeBytes(ciphertext);
  const envelope = parseHeadered(bytes) ?? parseHeaderless(bytes);

  return {
    version: envelope.version,
    iterations: envelope.iterations,
    contextBound: envelope.version === ENVELOPE_VERSION,
  };
}

/**
 * Report whether a ciphertext falls short of the current parameters.
 *
 * Use it to size or schedule a migration. It works without the password, so it
 * inherits the limit of {@link inspect}: a rare version 0 ciphertext can pass for
 * a current one. Before switching reads to `allowLegacy: false`, pass every value
 * through {@link rewrap} (or `SecureStorage.rewrap`), which decrypts and cannot be
 * fooled, instead of only the values flagged here.
 *
 * @param ciphertext - Base64-encoded envelope
 * @param policy - Thresholds to compare against
 * @returns True if the ciphertext should be passed through {@link rewrap}
 * @throws CryptoBoxError `MALFORMED_CIPHERTEXT` if the input is not an envelope
 */
export function needsRewrap(ciphertext: string, policy: RewrapPolicy = {}): boolean {
  const info = inspect(ciphertext);

  return (
    info.version < (policy.minVersion ?? ENVELOPE_VERSION) ||
    info.iterations < (policy.minIterations ?? PBKDF2_ITERATIONS)
  );
}

/**
 * Re-encrypt a ciphertext under the current envelope version and parameters.
 *
 * The plaintext is unchanged; only the envelope is rebuilt. This is how data
 * written before context binding acquires it, and how an old iteration count is
 * raised without asking the user to re-enter anything beyond their password.
 *
 * @param ciphertext - Base64-encoded envelope
 * @param password - Password the ciphertext was written with
 * @param options - Target parameters, and the context the ciphertext currently uses
 * @returns A fresh base64-encoded version 2 envelope
 * @throws CryptoBoxError `DECRYPTION_FAILED` if the password or previous context is wrong
 */
export async function rewrap(
  ciphertext: string,
  password: string,
  options: RewrapOptions = {}
): Promise<string> {
  const context = options.context ?? '';

  const plaintext = await decrypt(ciphertext, password, {
    context: options.previousContext ?? context,
    allowLegacy: options.allowLegacy ?? true,
  });

  return encrypt(plaintext, password, {
    context,
    ...(options.iterations === undefined ? {} : { iterations: options.iterations }),
    ...(options.allowWeakIterations === undefined
      ? {}
      : { allowWeakIterations: options.allowWeakIterations }),
  });
}
