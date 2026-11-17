import { describe, it, expect } from 'vitest';
import {
  safeJsonParse,
  safeJsonStringify,
  isPlainObject,
  isString,
  isNumber,
  isBoolean,
  isArray,
} from '@utils/json-utils';

describe('JSON Utilities', () => {
  describe('safeJsonParse', () => {
    it('should parse valid JSON', () => {
      const data = { id: 123, name: 'test' };
      expect(safeJsonParse(JSON.stringify(data))).toEqual(data);
    });

    it('should throw on invalid JSON syntax', () => {
      expect(() => safeJsonParse('invalid json')).toThrow('Invalid JSON syntax');
    });

    it('should parse null, which is valid JSON', () => {
      expect(safeJsonParse('null')).toBeNull();
    });

    it('should parse falsy primitives', () => {
      expect(safeJsonParse('0')).toBe(0);
      expect(safeJsonParse('false')).toBe(false);
      expect(safeJsonParse('""')).toBe('');
    });

    it('should throw on the literal `undefined`, which is not JSON', () => {
      expect(() => safeJsonParse('undefined')).toThrow('Invalid JSON syntax');
    });

    it('should work with custom validator', () => {
      const validator = (data: unknown): data is { id: number } =>
        isPlainObject(data) && typeof data['id'] === 'number';

      expect(safeJsonParse('{"id": 123}', validator)).toEqual({ id: 123 });
    });

    it('should throw when validator fails', () => {
      const validator = (_data: unknown): _data is { id: number } => false;
      expect(() => safeJsonParse('{"id": 123}', validator)).toThrow('JSON validation failed');
    });

    it('should run the validator against null too', () => {
      const validator = (data: unknown): data is { id: number } => data !== null;
      expect(() => safeJsonParse('null', validator)).toThrow('JSON validation failed');
    });
  });

  describe('safeJsonStringify', () => {
    it('should stringify data', () => {
      expect(safeJsonStringify({ id: 123, name: 'test' })).toBe('{"id":123,"name":"test"}');
    });

    it('should stringify null', () => {
      expect(safeJsonStringify(null)).toBe('null');
    });

    it('should handle circular references gracefully', () => {
      const obj: Record<string, unknown> = { a: 1 };
      obj['self'] = obj;
      expect(() => safeJsonStringify(obj)).toThrow('Failed to serialize data');
    });

    it('should reject values JSON cannot represent instead of returning undefined', () => {
      expect(() => safeJsonStringify(undefined)).toThrow('not representable in JSON');
      expect(() => safeJsonStringify(() => 1)).toThrow('not representable in JSON');
      expect(() => safeJsonStringify(Symbol('x'))).toThrow('not representable in JSON');
    });

    it('should always return a string when it does not throw', () => {
      for (const value of [0, '', false, null, [], {}]) {
        expect(typeof safeJsonStringify(value)).toBe('string');
      }
    });
  });

  describe('Type Guards', () => {
    it('isPlainObject should identify plain objects', () => {
      expect(isPlainObject({})).toBe(true);
      expect(isPlainObject({ a: 1 })).toBe(true);
      expect(isPlainObject([])).toBe(false);
      expect(isPlainObject(null)).toBe(false);
      expect(isPlainObject(new Date())).toBe(false);
    });

    it('isString should identify strings', () => {
      expect(isString('test')).toBe(true);
      expect(isString('')).toBe(true);
      expect(isString(123)).toBe(false);
    });

    it('isNumber should identify numbers', () => {
      expect(isNumber(123)).toBe(true);
      expect(isNumber(0)).toBe(true);
      expect(isNumber(NaN)).toBe(false);
      expect(isNumber('123')).toBe(false);
    });

    it('isBoolean should identify booleans', () => {
      expect(isBoolean(true)).toBe(true);
      expect(isBoolean(false)).toBe(true);
      expect(isBoolean(1)).toBe(false);
    });

    it('isArray should identify arrays', () => {
      expect(isArray([])).toBe(true);
      expect(isArray([1, 2])).toBe(true);
      expect(isArray({})).toBe(false);
    });
  });
});
