import { runInNewContext } from 'node:vm';
import { describe, it, expect } from 'vitest';
import { CryptoBoxError, isCryptoBoxError, describeCause } from '@core/errors';

describe('CryptoBoxError', () => {
  it('should carry a stable code and a readable name', () => {
    const error = new CryptoBoxError('DECRYPTION_FAILED', 'Decryption failed');

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('CryptoBoxError');
    expect(error.code).toBe('DECRYPTION_FAILED');
    expect(error.message).toBe('Decryption failed');
  });

  it('should keep a usable stack trace', () => {
    expect(new CryptoBoxError('DECRYPTION_FAILED', 'boom').stack).toContain('CryptoBoxError');
  });
});

describe('isCryptoBoxError', () => {
  it('should recognise a package error', () => {
    expect(isCryptoBoxError(new CryptoBoxError('VALIDATION_FAILED', 'x'))).toBe(true);
  });

  it('should filter on the code when one is given', () => {
    const error = new CryptoBoxError('VALIDATION_FAILED', 'x');

    expect(isCryptoBoxError(error, 'VALIDATION_FAILED')).toBe(true);
    expect(isCryptoBoxError(error, 'DECRYPTION_FAILED')).toBe(false);
  });

  it('should reject unrelated values', () => {
    for (const value of [null, undefined, 'DECRYPTION_FAILED', {}, new Error('plain')]) {
      expect(isCryptoBoxError(value)).toBe(false);
    }
  });

  it('should recognise a duplicated copy of the class', () => {
    // Two bundles, a nested install or a second realm each produce a distinct
    // class object, so the guard must not rely on instanceof.
    class Duplicate extends Error {
      override readonly name = 'CryptoBoxError';
      readonly code = 'DECRYPTION_FAILED';
    }

    const duplicated = new Duplicate('failed');

    expect(duplicated instanceof CryptoBoxError).toBe(false);
    expect(isCryptoBoxError(duplicated, 'DECRYPTION_FAILED')).toBe(true);
  });

  it('should recognise an error thrown in another realm', () => {
    const foreign: unknown = runInNewContext(
      "Object.assign(new Error('failed'), { name: 'CryptoBoxError', code: 'DECRYPTION_FAILED' })"
    );

    expect(foreign instanceof Error).toBe(false);
    expect(isCryptoBoxError(foreign, 'DECRYPTION_FAILED')).toBe(true);
  });

  it('should keep a package error typed as one when the code does not match', () => {
    const error = new CryptoBoxError('VALIDATION_FAILED', 'x');

    if (isCryptoBoxError(error, 'DECRYPTION_FAILED')) throw new Error('unexpected match');

    // Compiles only if the failed check did not narrow `error` to never.
    expect(error.code).toBe('VALIDATION_FAILED');
  });

  it('should reject an error that merely borrows the name', () => {
    const impostor = new Error('x');
    impostor.name = 'CryptoBoxError';

    expect(isCryptoBoxError(impostor)).toBe(false);
  });
});

describe('describeCause', () => {
  it('should extract a message from an Error', () => {
    expect(describeCause(new Error('boom'))).toBe('boom');
  });

  it('should fall back for non-Error values', () => {
    expect(describeCause('boom')).toBe('unknown error');
  });
});
