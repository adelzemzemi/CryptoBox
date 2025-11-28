import { describe, it, expect } from 'vitest';
import {
  safeJsonParse,
  safeJsonStringify,
  isPlainObject,
  isString,
  isNumber,
  isBoolean,
  isArray
} from '@utils/json-utils';

describe('JSON Utilities', () => {
  describe('safeJsonParse', () => {
    it('should parse valid JSON', () => {
      const data = { id: 123, name: 'test' };
      const json = JSON.stringify(data);
      const parsed = safeJsonParse(json);
      expect(parsed).toEqual(data);
    });

    it('should throw on invalid JSON syntax', () => {
      expect(() => safeJsonParse('invalid json')).toThrow('Invalid JSON syntax');
    });

    it('should throw on null value', () => {
      expect(() => safeJsonParse('null')).toThrow('Invalid JSON: null or undefined value');
    });

    it('should throw on undefined value', () => {
      expect(() => safeJsonParse('undefined')).toThrow();
    });

    it('should work with custom validator', () => {
      const validator = (data: unknown): data is { id: number } => {
        return isPlainObject(data) && typeof data.id === 'number';
      };
      const json = '{"id": 123}';
      const parsed = safeJsonParse(json, validator);
      expect(parsed).toEqual({ id: 123 });
    });

    it('should throw when validator fails', () => {
      const validator = (data: unknown): data is { id: number } => false;
      expect(() => safeJsonParse('{"id": 123}', validator)).toThrow('JSON validation failed');
    });
  });

  describe('safeJsonStringify', () => {
    it('should stringify data', () => {
      const data = { id: 123, name: 'test' };
      const json = safeJsonStringify(data);
      expect(json).toBe('{"id":123,"name":"test"}');
    });

    it('should handle circular references gracefully', () => {
      const obj: any = { a: 1 };
      obj.self = obj;
      expect(() => safeJsonStringify(obj)).toThrow('Failed to serialize data');
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
