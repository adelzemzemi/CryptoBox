import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { LocalStorage } from '@storage/LocalStorage';
import { SessionStorage } from '@storage/SessionStorage';
import { MemoryStorage } from '@storage/MemoryStorage';
import { resolveWebStorage } from '@storage/web-storage';

/** Web Storage stand-in, so these tests do not depend on runtime globals. */
function createFakeWebStorage() {
  const data = new Map<string, string>();
  return {
    setItem: (k: string, v: string) => void data.set(k, v),
    getItem: (k: string) => data.get(k) ?? null,
    removeItem: (k: string) => void data.delete(k),
  };
}

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

    it('should distinguish a stored empty string from an absent key', () => {
      storage.setItem('empty', '');
      expect(storage.getItem('empty')).toBe('');
      expect(storage.getItem('missing')).toBeNull();
      expect(storage.keys()).toContain('empty');
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
      expect(storage.keys().sort()).toEqual(['key1', 'key2']);
    });

    it('should handle empty storage', () => {
      expect(storage.keys()).toEqual([]);
    });
  });

  describe('resolveWebStorage', () => {
    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it('should return the global when present', () => {
      const fake = createFakeWebStorage();
      vi.stubGlobal('localStorage', fake);
      expect(resolveWebStorage('localStorage')).toBe(fake);
    });

    it('should throw an actionable error when absent', () => {
      vi.stubGlobal('sessionStorage', undefined);
      expect(() => resolveWebStorage('sessionStorage')).toThrow(
        /sessionStorage is not available in this environment/
      );
      expect(() => resolveWebStorage('sessionStorage')).toThrow(/MemoryStorage/);
    });

    it('should report a getter that throws as unavailable storage', () => {
      // Browsers throw from the property access itself when storage is blocked.
      const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
      Object.defineProperty(globalThis, 'localStorage', {
        configurable: true,
        get() {
          throw new Error('SecurityError: access is denied for this document');
        },
      });

      try {
        expect(() => resolveWebStorage('localStorage')).toThrow(
          expect.objectContaining({ code: 'STORAGE_UNAVAILABLE' })
        );
      } finally {
        if (original) Object.defineProperty(globalThis, 'localStorage', original);
        else Reflect.deleteProperty(globalThis, 'localStorage');
      }
    });
  });

  describe.each([
    ['LocalStorage', 'localStorage', () => new LocalStorage()] as const,
    ['SessionStorage', 'sessionStorage', () => new SessionStorage()] as const,
  ])('%s', (_name, globalName, construct) => {
    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it('should delegate to the corresponding global', () => {
      vi.stubGlobal(globalName, createFakeWebStorage());
      const storage = construct();

      storage.setItem('k', 'v');
      expect(storage.getItem('k')).toBe('v');

      storage.removeItem('k');
      expect(storage.getItem('k')).toBeNull();
    });

    it('should construct safely when the global is missing, for SSR', () => {
      vi.stubGlobal(globalName, undefined);
      expect(construct).not.toThrow();
    });

    it('should throw an actionable error on use when the global is missing', () => {
      vi.stubGlobal(globalName, undefined);
      const storage = construct();
      const expected = new RegExp(`${globalName} is not available`);

      expect(() => storage.getItem('k')).toThrow(expected);
      expect(() => storage.setItem('k', 'v')).toThrow(expected);
      expect(() => storage.removeItem('k')).toThrow(expected);
    });

    it('should pick up a global that only appears after construction', () => {
      vi.stubGlobal(globalName, undefined);
      const storage = construct();

      vi.stubGlobal(globalName, createFakeWebStorage());
      storage.setItem('k', 'v');

      expect(storage.getItem('k')).toBe('v');
    });
  });
});
