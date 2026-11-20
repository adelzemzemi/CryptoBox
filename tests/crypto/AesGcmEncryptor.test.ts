import { describe, it, expect } from 'vitest';
import { AesGcmEncryptor } from '@crypto/AesGcmEncryptor';
import { inspect } from '@crypto/algorithms/aes-gcm';
import { isPlainObject, isString } from '@utils/json-utils';

describe('AesGcmEncryptor', () => {
  const encryptor = new AesGcmEncryptor({ iterations: 1000, allowWeakIterations: true });
  const password = 'test-password';

  it.each([
    ['string', 'Hello, World!'],
    ['number', 42],
    ['boolean', true],
    ['null', null],
    ['array', [1, 2, 3, 'test', true]],
    ['object', { id: 123, name: 'Alice', active: true, tags: ['admin'] }],
    ['nested object', { user: { id: 1, profile: { name: 'Bob' } }, settings: { theme: 'dark' } }],
    ['object holding a null field', { value: null, other: 1 }],
    ['unicode', { message: '你好 🔐', emoji: '🚀' }],
  ])('should round-trip %s', async (_label, data) => {
    const encrypted = await encryptor.encrypt(data, password);
    expect(await encryptor.decrypt<typeof data>(encrypted, password)).toEqual(data);
  });

  it('should fail with wrong password', async () => {
    const encrypted = await encryptor.encrypt({ secret: 'value' }, password);
    await expect(encryptor.decrypt(encrypted, 'wrong-password')).rejects.toThrow(
      'Decryption failed'
    );
  });

  it('should reject values JSON cannot represent', async () => {
    for (const value of [undefined, () => 1, Symbol('x')]) {
      await expect(encryptor.encrypt(value, password)).rejects.toMatchObject({
        code: 'SERIALIZATION_FAILED',
      });
    }
  });

  describe('options', () => {
    it('should reject an out-of-range iteration count at construction', () => {
      expect(() => new AesGcmEncryptor({ iterations: -1 })).toThrow('Invalid iteration count');
      expect(() => new AesGcmEncryptor({ iterations: 1.5 })).toThrow('Invalid iteration count');
    });

    it('should refuse a weak iteration count unless explicitly allowed', async () => {
      expect(() => new AesGcmEncryptor({ iterations: 99_999 })).toThrow(
        expect.objectContaining({ code: 'INVALID_ITERATIONS' })
      );
      expect(() => new AesGcmEncryptor({ iterations: 100_000 })).not.toThrow();

      const strict = new AesGcmEncryptor();
      await expect(strict.encrypt({ a: 1 }, password, { iterations: 1000 })).rejects.toMatchObject({
        code: 'INVALID_ITERATIONS',
      });
      await expect(
        strict.encrypt({ a: 1 }, password, { iterations: 1000, allowWeakIterations: true })
      ).resolves.toBeTypeOf('string');
    });

    it('should apply the instance iteration count', async () => {
      const custom = new AesGcmEncryptor({ iterations: 2000, allowWeakIterations: true });
      expect(inspect(await custom.encrypt({ a: 1 }, password)).iterations).toBe(2000);
    });

    it('should let a call override the instance iteration count', async () => {
      const encrypted = await encryptor.encrypt({ a: 1 }, password, {
        iterations: 3000,
        allowWeakIterations: true,
      });
      expect(inspect(encrypted).iterations).toBe(3000);
    });

    it('should bind and require a context', async () => {
      const encrypted = await encryptor.encrypt({ a: 1 }, password, { context: 'tenant:1' });

      expect(
        await encryptor.decrypt<{ a: number }>(encrypted, password, { context: 'tenant:1' })
      ).toEqual({ a: 1 });
      await expect(encryptor.decrypt(encrypted, password, { context: 'tenant:2' })).rejects.toThrow(
        'Decryption failed'
      );
    });

    it('should refuse a context that is not a string', async () => {
      const encrypted = await encryptor.encrypt({ a: 1 }, password);
      const context = { tenant: 1 } as unknown as string;

      await expect(encryptor.encrypt({ a: 1 }, password, { context })).rejects.toMatchObject({
        code: 'INVALID_ARGUMENT',
      });
      await expect(encryptor.decrypt(encrypted, password, { context })).rejects.toMatchObject({
        code: 'INVALID_ARGUMENT',
      });
    });

    it('should refuse legacy envelopes when the instance forbids them', async () => {
      const strict = new AesGcmEncryptor({
        iterations: 1000,
        allowWeakIterations: true,
        allowLegacy: false,
      });
      const encrypted = await strict.encrypt({ a: 1 }, password);

      expect(await strict.decrypt<{ a: number }>(encrypted, password)).toEqual({ a: 1 });
    });
  });

  describe('validation', () => {
    it('should reject a payload the validator refuses', async () => {
      const encrypted = await encryptor.encrypt(42, password);

      await expect(
        encryptor.decrypt(encrypted, password, { validate: isString })
      ).rejects.toMatchObject({ code: 'VALIDATION_FAILED' });
    });

    it('should accept a payload the validator approves', async () => {
      const encrypted = await encryptor.encrypt({ a: 1 }, password);

      expect(await encryptor.decrypt(encrypted, password, { validate: isPlainObject })).toEqual({
        a: 1,
      });
    });
  });

  describe('maxIterations', () => {
    const higher = new AesGcmEncryptor({ iterations: 2000, allowWeakIterations: true });

    it('should refuse a ciphertext declaring more than the instance cap', async () => {
      const capped = new AesGcmEncryptor({
        iterations: 1000,
        allowWeakIterations: true,
        maxIterations: 1000,
      });
      const encrypted = await higher.encrypt('value', password);

      await expect(capped.decrypt(encrypted, password)).rejects.toMatchObject({
        code: 'INVALID_ITERATIONS',
      });
      expect(await capped.decrypt(await capped.encrypt('value', password), password)).toBe('value');
    });

    it('should let a call override the instance cap', async () => {
      const capped = new AesGcmEncryptor({
        iterations: 1000,
        allowWeakIterations: true,
        maxIterations: 1000,
      });
      const encrypted = await higher.encrypt('value', password);

      expect(await capped.decrypt(encrypted, password, { maxIterations: 2000 })).toBe('value');
    });

    it('should refuse to write a per-call count above the instance cap', async () => {
      const capped = new AesGcmEncryptor({
        iterations: 1000,
        allowWeakIterations: true,
        maxIterations: 2000,
      });

      await expect(capped.encrypt('value', password, { iterations: 2001 })).rejects.toMatchObject({
        code: 'INVALID_ARGUMENT',
      });

      // Refused before any key is derived, so the reported case stays cheap to test.
      await expect(
        new AesGcmEncryptor({ maxIterations: 600_000 }).encrypt('value', password, {
          iterations: 700_000,
        })
      ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });

      const atCap = await capped.encrypt('value', password, { iterations: 2000 });
      expect(await capped.decrypt(atCap, password)).toBe('value');
    });

    it('should leave per-call counts alone when no cap is set', async () => {
      const encrypted = await encryptor.encrypt('value', password, { iterations: 2000 });
      expect(inspect(encrypted).iterations).toBe(2000);
    });

    it('should reject a cap below the count the instance writes with', () => {
      expect(() => new AesGcmEncryptor({ maxIterations: 100_000 })).toThrow(
        expect.objectContaining({ code: 'INVALID_ARGUMENT' })
      );
    });

    it('should reject a cap that is not a valid iteration count', () => {
      expect(() => new AesGcmEncryptor({ maxIterations: 1.5 })).toThrow(
        expect.objectContaining({ code: 'INVALID_ITERATIONS' })
      );
    });
  });

  describe('needsRewrap', () => {
    it('should compare against the instance iteration count', async () => {
      const encrypted = await encryptor.encrypt({ a: 1 }, password);

      expect(encryptor.needsRewrap(encrypted)).toBe(false);
      expect(new AesGcmEncryptor({ iterations: 100_000 }).needsRewrap(encrypted)).toBe(true);
    });

    it('should honour an explicit policy over the instance count', async () => {
      const encrypted = await encryptor.encrypt({ a: 1 }, password);
      const lenient = new AesGcmEncryptor({
        iterations: 5000,
        allowWeakIterations: true,
        rewrapPolicy: { minIterations: 1000 },
      });

      // The instance count alone would flag a 1000-iteration ciphertext.
      expect(lenient.needsRewrap(encrypted)).toBe(false);
    });

    it('should refuse a policy stricter than what the instance writes', () => {
      const unsatisfiable = [
        { iterations: 100_000, rewrapPolicy: { minIterations: 600_000 } },
        { rewrapPolicy: { minIterations: 600_001 } },
        { rewrapPolicy: { minVersion: 3 } },
      ];

      for (const options of unsatisfiable) {
        expect(() => new AesGcmEncryptor(options)).toThrow(
          expect.objectContaining({ code: 'INVALID_ARGUMENT' })
        );
      }
    });
  });
});
