import type { IEncryptor } from '../core/interfaces/index.js';
import type { EncryptOptions, TypedDecryptOptions } from '../core/options.js';
import { encrypt, decrypt, needsRewrap, type RewrapPolicy } from './algorithms/aes-gcm.js';
import { safeJsonStringify, safeJsonParse } from '../utils/json-utils.js';
import { assertWritableIterations } from './envelope.js';
import { CryptoBoxError } from '../core/errors.js';
import { ENVELOPE_VERSION, PBKDF2_ITERATIONS } from '../core/constants.js';

/** Defaults applied to every operation of an {@link AesGcmEncryptor}. */
export interface AesGcmEncryptorOptions {
  /** PBKDF2 iteration count. Recorded in each ciphertext. */
  iterations?: number;
  /** Accept an iteration count below the write minimum. For test suites only. */
  allowWeakIterations?: boolean;
  /** Whether reads accept envelope version 0, written by 1.x. Defaults to `true`. */
  allowLegacy?: boolean;
  /** Thresholds used by {@link AesGcmEncryptor.needsRewrap}. */
  rewrapPolicy?: RewrapPolicy;
}

/**
 * AES-256-GCM encryptor with automatic JSON serialization.
 *
 * Options given here are defaults; every call may override them.
 */
export class AesGcmEncryptor implements IEncryptor {
  private readonly iterations: number | undefined;
  private readonly allowWeakIterations: boolean;
  private readonly allowLegacy: boolean;
  private readonly rewrapPolicy: RewrapPolicy;

  /**
   * @param options - Per-instance defaults
   * @throws CryptoBoxError `INVALID_ITERATIONS` if the iteration count is out of range or too low
   * @throws CryptoBoxError `INVALID_ARGUMENT` if the rewrap policy exceeds what this instance writes
   */
  constructor(options: AesGcmEncryptorOptions = {}) {
    this.allowWeakIterations = options.allowWeakIterations ?? false;

    if (options.iterations !== undefined) {
      assertWritableIterations(options.iterations, this.allowWeakIterations);
    }

    this.iterations = options.iterations;
    this.allowLegacy = options.allowLegacy ?? true;
    this.rewrapPolicy = options.rewrapPolicy ?? {};

    // A policy stricter than what this instance writes can never be satisfied:
    // every rewrap would produce a value that still needs one.
    if (
      (this.rewrapPolicy.minIterations ?? 0) > (this.iterations ?? PBKDF2_ITERATIONS) ||
      (this.rewrapPolicy.minVersion ?? 0) > ENVELOPE_VERSION
    ) {
      throw new CryptoBoxError(
        'INVALID_ARGUMENT',
        'Invalid rewrapPolicy: it asks for more than this encryptor writes'
      );
    }
  }

  /**
   * Serialize and encrypt a value.
   *
   * @param data - Data to encrypt
   * @param password - Encryption password
   * @param options - Per-call overrides
   * @returns Base64-encoded ciphertext
   */
  async encrypt<T>(data: T, password: string, options: EncryptOptions = {}): Promise<string> {
    const iterations = options.iterations ?? this.iterations;

    return encrypt(safeJsonStringify(data), password, {
      allowWeakIterations: options.allowWeakIterations ?? this.allowWeakIterations,
      ...(iterations === undefined ? {} : { iterations }),
      ...(options.context === undefined ? {} : { context: options.context }),
    });
  }

  /**
   * Decrypt and deserialize a value.
   *
   * @param ciphertext - Base64-encoded ciphertext
   * @param password - Decryption password
   * @param options - Per-call overrides and runtime validation
   * @returns Decrypted data
   * @throws CryptoBoxError if the password, the context or the payload is wrong
   */
  async decrypt<T>(
    ciphertext: string,
    password: string,
    options: TypedDecryptOptions<T> = {}
  ): Promise<T> {
    const plaintext = await decrypt(ciphertext, password, {
      allowLegacy: options.allowLegacy ?? this.allowLegacy,
      ...(options.context === undefined ? {} : { context: options.context }),
    });

    return safeJsonParse<T>(plaintext, options.validate);
  }

  /**
   * Report whether a ciphertext falls short of this instance's parameters.
   *
   * @param ciphertext - Base64-encoded ciphertext
   * @returns True if the ciphertext should be re-encrypted
   */
  needsRewrap(ciphertext: string): boolean {
    return needsRewrap(ciphertext, {
      ...this.rewrapPolicy,
      ...(this.rewrapPolicy.minIterations === undefined && this.iterations !== undefined
        ? { minIterations: this.iterations }
        : {}),
    });
  }
}
