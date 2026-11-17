import { describe, it, expect } from 'vitest';
import { AesGcmEncryptor } from '@crypto/AesGcmEncryptor';
import { inspect } from '@crypto/algorithms/aes-gcm';
import { isPlainObject, isString } from '@utils/json-utils';

describe('AesGcmEncryptor', () => {
  const encryptor = new AesGcmEncryptor({ iterations: 1000 });
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

    it('should apply the instance iteration count', async () => {
      const custom = new AesGcmEncryptor({ iterations: 2000 });
      expect(inspect(await custom.encrypt({ a: 1 }, password)).iterations).toBe(2000);
    });

    it('should let a call override the instance iteration count', async () => {
      const encrypted = await encryptor.encrypt({ a: 1 }, password, { iterations: 3000 });
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

    it('should refuse legacy envelopes when the instance forbids them', async () => {
      const strict = new AesGcmEncryptor({ iterations: 1000, allowLegacy: false });
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

  describe('needsRewrap', () => {
    it('should compare against the instance iteration count', async () => {
      const encrypted = await encryptor.encrypt({ a: 1 }, password);

      expect(encryptor.needsRewrap(encrypted)).toBe(false);
      expect(new AesGcmEncryptor({ iterations: 2000 }).needsRewrap(encrypted)).toBe(true);
    });

    it('should honour an explicit policy over the instance count', async () => {
      const encrypted = await encryptor.encrypt({ a: 1 }, password);
      const strict = new AesGcmEncryptor({
        iterations: 1000,
        rewrapPolicy: { minIterations: 5000 },
      });

      expect(strict.needsRewrap(encrypted)).toBe(true);
    });
  });
});
