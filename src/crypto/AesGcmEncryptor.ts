import type { IEncryptor } from '../core/interfaces/index.js';
import type { EncryptOptions, TypedDecryptOptions } from '../core/options.js';
import { encrypt, decrypt, needsRewrap, type RewrapPolicy } from './algorithms/aes-gcm.js';
import { safeJsonStringify, safeJsonParse } from '../utils/json-utils.js';
import { assertValidIterations } from './envelope.js';

/** Defaults applied to every operation of an {@link AesGcmEncryptor}. */
export interface AesGcmEncryptorOptions {
  /** PBKDF2 iteration count. Recorded in each ciphertext. */
  iterations?: number;
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
  private readonly allowLegacy: boolean;
  private readonly rewrapPolicy: RewrapPolicy;

  /**
   * @param options - Per-instance defaults
   * @throws CryptoBoxError `INVALID_ITERATIONS` if the iteration count is out of range
   */
  constructor(options: AesGcmEncryptorOptions = {}) {
    if (options.iterations !== undefined) assertValidIterations(options.iterations);

    this.iterations = options.iterations;
    this.allowLegacy = options.allowLegacy ?? true;
    this.rewrapPolicy = options.rewrapPolicy ?? {};
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
