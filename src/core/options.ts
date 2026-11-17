/** Options shared by every encryption entry point. */
export interface EncryptOptions {
  /**
   * PBKDF2 iteration count. The value is recorded in the envelope, so raising it
   * later does not invalidate existing data.
   */
  iterations?: number;

  /**
   * Accept an iteration count below `PBKDF2_ITERATIONS_WRITE_MIN`. A low count
   * makes the password cheap to brute-force from a stolen ciphertext; this exists
   * for test suites, which need speed and protect nothing.
   */
  allowWeakIterations?: boolean;

  /**
   * Opaque string bound to the ciphertext as AES-GCM additional authenticated
   * data. Decryption only succeeds when the same context is supplied.
   *
   * Use it to pin a ciphertext to the place it belongs — a storage key, a user
   * id, a tenant — so that moving it elsewhere no longer decrypts. The context
   * is not secret and is not stored; the caller must be able to reproduce it.
   */
  context?: string;
}

/** Options shared by every decryption entry point. */
export interface DecryptOptions {
  /** Context the ciphertext was bound to. See {@link EncryptOptions.context}. */
  context?: string;

  /**
   * Read envelope version 0, written by 1.x, which predates context binding. Defaults
   * to `true`. Set it to `false` once the stored data has been migrated with
   * `rewrap`, so that a downgraded ciphertext is rejected rather than accepted
   * without its binding.
   */
  allowLegacy?: boolean;
}

/** Decryption options plus a runtime check applied to the decoded payload. */
export interface TypedDecryptOptions<T> extends DecryptOptions {
  /**
   * Type guard applied to the parsed payload. Without it the generic parameter
   * is an unchecked assertion: the bytes decrypt, but nothing proves they still
   * have the shape the caller expects.
   */
  validate?: (value: unknown) => value is T;
}

/** Options accepted when reading through a secure store. */
export interface SecureReadOptions<T> {
  /** Type guard applied to the decrypted payload. See {@link TypedDecryptOptions.validate}. */
  validate?: (value: unknown) => value is T;
}
