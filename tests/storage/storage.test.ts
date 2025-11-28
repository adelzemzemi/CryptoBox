import { describe, it, expect, beforeEach } from 'vitest';
import { LocalStorage } from '@storage/LocalStorage';
import { SessionStorage } from '@storage/SessionStorage';
import { MemoryStorage } from '@storage/MemoryStorage';

describe('Storage Implementations', () => {
  describe('MemoryStorage', () => {
    let storage: MemoryStorage;

    beforeEach(() => {
      storage = new MemoryStorage();
    });

    it('should store and retrieve item', () => {
      storage.setItem('key1', 'value1');
      expect(storage.getItem('key1')).toBe('value1');
    });

    it('should return null for non-existent key', () => {
      expect(storage.getItem('nonexistent')).toBeNull();
    });

    it('should remove item', () => {
      storage.setItem('key1', 'value1');
      storage.removeItem('key1');
      expect(storage.getItem('key1')).toBeNull();
    });

    it('should overwrite existing item', () => {
      storage.setItem('key1', 'value1');
      storage.setItem('key1', 'value2');
      expect(storage.getItem('key1')).toBe('value2');
    });

    it('should clear all items', () => {
      storage.setItem('key1', 'value1');
      storage.setItem('key2', 'value2');
      storage.clear();
      expect(storage.getItem('key1')).toBeNull();
      expect(storage.getItem('key2')).toBeNull();
    });

    it('should return all keys', () => {
      storage.setItem('key1', 'value1');
      storage.setItem('key2', 'value2');
      const keys = storage.keys();
      expect(keys).toContain('key1');
      expect(keys).toContain('key2');
      expect(keys.length).toBe(2);
    });

    it('should handle empty storage', () => {
      expect(storage.keys()).toEqual([]);
    });
  });

  // Note: LocalStorage and SessionStorage require browser environment
  // These tests would need DOM mocking (jsdom) or browser environment
  describe('LocalStorage', () => {
    it('should be instantiable', () => {
      expect(() => new LocalStorage()).not.toThrow();
    });
  });

  describe('SessionStorage', () => {
    it('should be instantiable', () => {
      expect(() => new SessionStorage()).not.toThrow();
    });
  });
});
