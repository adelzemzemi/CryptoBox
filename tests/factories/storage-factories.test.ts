import { describe, it, expect } from 'vitest';
import {
  createSecureSessionStorage,
  createSecureLocalStorage,
  createSecureMemoryStorage,
  SecureSessionStorage,
  SecureLocalStorage,
  SecureMemoryStorage
} from '@factories/storage-factories';

describe('Storage Factories', () => {
  describe('Factory Functions', () => {
    it('should create secure memory storage', () => {
      const storage = createSecureMemoryStorage();
      expect(storage).toBeDefined();
      expect(storage.setSecure).toBeDefined();
      expect(storage.getSecure).toBeDefined();
      expect(storage.remove).toBeDefined();
      expect(storage.has).toBeDefined();
    });

    it('should create secure local storage', () => {
      const storage = createSecureLocalStorage();
      expect(storage).toBeDefined();
    });

    it('should create secure session storage', () => {
      const storage = createSecureSessionStorage();
      expect(storage).toBeDefined();
    });

    it('should work with memory storage', async () => {
      const storage = createSecureMemoryStorage();
      const password = 'test-pass';
      const data = { id: 123, name: 'test' };
      
      await storage.setSecure('key1', data, password);
      const retrieved = await storage.getSecure<typeof data>('key1', password);
      expect(retrieved).toEqual(data);
    });
  });

  describe('Legacy Classes', () => {
    it('should instantiate SecureMemoryStorage', () => {
      const storage = new SecureMemoryStorage();
      expect(storage).toBeDefined();
    });

    it('should instantiate SecureLocalStorage', () => {
      const storage = new SecureLocalStorage();
      expect(storage).toBeDefined();
    });

    it('should instantiate SecureSessionStorage', () => {
      const storage = new SecureSessionStorage();
      expect(storage).toBeDefined();
    });

    it('should work with legacy class', async () => {
      const storage = new SecureMemoryStorage();
      const password = 'test-pass';
      const data = { value: 'test' };
      
      await storage.setSecure('key', data, password);
      const retrieved = await storage.getSecure<typeof data>('key', password);
      expect(retrieved).toEqual(data);
    });
  });
});
