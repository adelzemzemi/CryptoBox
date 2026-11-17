import {
  SALT_SIZE,
  IV_SIZE,
  ENVELOPE_HEADER_SIZE,
  ENVELOPE_VERSION,
  ENVELOPE_VERSION_HEADERLESS,
  PBKDF2_ITERATIONS_LEGACY,
  PBKDF2_ITERATIONS_MIN,
  PBKDF2_ITERATIONS_MAX,
  PBKDF2_ITERATIONS_WRITE_MIN,
} from '../core/constants.js';
import { CryptoBoxError } from '../core/errors.js';

/** A parsed ciphertext envelope. */
export interface Envelope {
  version: number;
  iterations: number;
  salt: Uint8Array;
  iv: Uint8Array;
  body: Uint8Array;
  /** Header bytes, authenticated for version 2 and empty otherwise. */
  header: Uint8Array;
}

/** Smallest byte length a version 2 envelope can have. */
export const HEADERED_MINIMUM = ENVELOPE_HEADER_SIZE + SALT_SIZE + IV_SIZE;

/** Smallest byte length a version 0 envelope can have. */
export const HEADERLESS_MINIMUM = SALT_SIZE + IV_SIZE;

export function isValidIterations(iterations: number): boolean {
  return (
    Number.isInteger(iterations) &&
    iterations >= PBKDF2_ITERATIONS_MIN &&
    iterations <= PBKDF2_ITERATIONS_MAX
  );
}

/**
 * Reject an iteration count outside the accepted range.
 *
 * @param iterations - PBKDF2 iteration count supplied by a caller
 * @throws CryptoBoxError `INVALID_ITERATIONS` if the count is out of range or not an integer
 */
export function assertValidIterations(iterations: number): void {
  if (!isValidIterations(iterations)) {
    throw new CryptoBoxError(
      'INVALID_ITERATIONS',
      `Invalid iteration count: expected an integer between ${PBKDF2_ITERATIONS_MIN} and ${PBKDF2_ITERATIONS_MAX}`
    );
  }
}

/**
 * Reject an iteration count that is out of range or too low to write with.
 *
 * @param iterations - PBKDF2 iteration count for a new ciphertext
 * @param allowWeak - Whether a count below {@link PBKDF2_ITERATIONS_WRITE_MIN} is accepted
 * @throws CryptoBoxError `INVALID_ITERATIONS` if the count is refused
 */
export function assertWritableIterations(iterations: number, allowWeak: boolean): void {
  assertValidIterations(iterations);

  if (!allowWeak && iterations < PBKDF2_ITERATIONS_WRITE_MIN) {
    throw new CryptoBoxError(
      'INVALID_ITERATIONS',
      `Invalid iteration count: ${iterations} is below the minimum of ${PBKDF2_ITERATIONS_WRITE_MIN} for new ciphertexts. ` +
        'Pass allowWeakIterations: true to override, in tests only.'
    );
  }
}

function view(bytes: Uint8Array): DataView {
  return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
}

/**
 * Build the 5-byte header of a version 2 envelope.
 *
 * @param iterations - PBKDF2 iteration count to record
 * @returns The header bytes
 */
export function buildHeader(iterations: number): Uint8Array {
  const header = new Uint8Array(ENVELOPE_HEADER_SIZE);
  header[0] = ENVELOPE_VERSION;
  view(header).setUint32(1, iterations, false);
  return header;
}

/**
 * Concatenate a header and a context into AES-GCM additional authenticated data.
 *
 * @param header - Envelope header bytes
 * @param context - Caller-supplied context
 * @returns The AAD bytes
 */
export function buildAad(header: Uint8Array, context: string): Uint8Array {
  const contextBytes = new TextEncoder().encode(context);
  const aad = new Uint8Array(header.length + contextBytes.length);
  aad.set(header, 0);
  aad.set(contextBytes, header.length);
  return aad;
}

/**
 * Read the leading version byte of a non-empty buffer.
 *
 * For a version 0 envelope this is simply the first byte of the salt.
 *
 * @param bytes - Raw envelope bytes
 * @returns The first byte
 */
export function readVersion(bytes: Uint8Array): number {
  return view(bytes).getUint8(0);
}

/**
 * Parse a version 2 envelope.
 *
 * @param bytes - Raw envelope bytes
 * @returns The envelope, or null if the buffer does not carry a version 2 header
 */
export function parseHeadered(bytes: Uint8Array): Envelope | null {
  if (bytes.length < HEADERED_MINIMUM) return null;

  const version = readVersion(bytes);
  if (version !== ENVELOPE_VERSION) return null;

  const iterations = view(bytes).getUint32(1, false);
  if (!isValidIterations(iterations)) return null;

  return {
    version,
    iterations,
    header: bytes.slice(0, ENVELOPE_HEADER_SIZE),
    salt: bytes.slice(ENVELOPE_HEADER_SIZE, ENVELOPE_HEADER_SIZE + SALT_SIZE),
    iv: bytes.slice(ENVELOPE_HEADER_SIZE + SALT_SIZE, HEADERED_MINIMUM),
    body: bytes.slice(HEADERED_MINIMUM),
  };
}

/**
 * Parse a version 0 envelope: no header, fixed iteration count.
 *
 * Any buffer of sufficient length is a syntactically valid version 0 envelope, so
 * this never rules a candidate out; AES-GCM authentication does that.
 *
 * @param bytes - Raw envelope bytes, at least {@link HEADERLESS_MINIMUM} long
 * @returns The envelope
 */
export function parseHeaderless(bytes: Uint8Array): Envelope {
  return {
    version: ENVELOPE_VERSION_HEADERLESS,
    iterations: PBKDF2_ITERATIONS_LEGACY,
    header: new Uint8Array(0),
    salt: bytes.slice(0, SALT_SIZE),
    iv: bytes.slice(SALT_SIZE, HEADERLESS_MINIMUM),
    body: bytes.slice(HEADERLESS_MINIMUM),
  };
}

/**
 * List the envelopes a buffer could be, most likely first.
 *
 * A version 0 envelope starts with a random salt byte, so it can collide with a
 * version 2 header. Both readings are therefore returned and each is tried in
 * turn; only the one whose authentication tag verifies can succeed.
 *
 * @param bytes - Raw envelope bytes
 * @param allowLegacy - Whether version 0 may be read
 * @returns Candidate envelopes
 */
export function envelopeCandidates(bytes: Uint8Array, allowLegacy: boolean): Envelope[] {
  const candidates: Envelope[] = [];

  const headered = parseHeadered(bytes);
  if (headered) candidates.push(headered);

  if (allowLegacy && bytes.length >= HEADERLESS_MINIMUM) {
    candidates.push(parseHeaderless(bytes));
  }

  return candidates;
}

/**
 * Build the additional authenticated data for a parsed envelope.
 *
 * Version 2 authenticates its own header followed by the caller's context, which
 * makes the declared version and iteration count tamper-evident and pins the
 * ciphertext to its context. Version 0 has no AAD, so a context supplied when
 * reading it is ignored: that is precisely what `rewrap` fixes.
 *
 * @param envelope - Parsed envelope
 * @param context - Caller-supplied context
 * @returns The AAD bytes, or undefined for version 0, which has none
 */
export function envelopeAad(envelope: Envelope, context: string): Uint8Array | undefined {
  return envelope.version === ENVELOPE_VERSION ? buildAad(envelope.header, context) : undefined;
}

/**
 * Assemble a version 2 envelope from its parts.
 *
 * @param header - Header produced by {@link buildHeader}
 * @param salt - Key derivation salt
 * @param iv - AES-GCM initialisation vector
 * @param body - Ciphertext and tag
 * @returns The full envelope bytes
 */
export function serializeEnvelope(
  header: Uint8Array,
  salt: Uint8Array,
  iv: Uint8Array,
  body: Uint8Array
): Uint8Array {
  const bytes = new Uint8Array(header.length + salt.length + iv.length + body.length);

  bytes.set(header, 0);
  bytes.set(salt, header.length);
  bytes.set(iv, header.length + salt.length);
  bytes.set(body, header.length + salt.length + iv.length);

  return bytes;
}
