import { SecureStorage, IStorage, IEncryptor, AesGcmEncryptor, MemoryStorage } from '../src';

// Custom storage using Map instead of localStorage
class CustomStorage implements IStorage {
  private cache = new Map<string, string>();

  setItem(key: string, value: string): void {
    this.cache.set(key, value);
  }

  getItem(key: string): string | null {
    return this.cache.get(key) ?? null;
  }

  removeItem(key: string): void {
    this.cache.delete(key);
  }
}

// Encryptor with logging wrapper
class LoggingEncryptor implements IEncryptor {
  private baseEncryptor = new AesGcmEncryptor();

  async encrypt<T>(data: T, password: string): Promise<string> {
    console.log('Encrypting...');
    return await this.baseEncryptor.encrypt(data, password);
  }

  async decrypt<T>(encryptedData: string, password: string): Promise<T> {
    console.log('Decrypting...');
    return await this.baseEncryptor.decrypt<T>(encryptedData, password);
  }
}

async function main() {
  // Inject custom implementations
  const storage = new CustomStorage();
  const encryptor = new LoggingEncryptor();
  const secureStorage = new SecureStorage(storage, encryptor);

  await secureStorage.setSecure('key', { msg: 'Hello!' }, 'password');
  const data = await secureStorage.getSecure('key', 'password');
  console.log('Retrieved:', data);

  // Using MemoryStorage for testing
  const testStorage = new SecureStorage(new MemoryStorage(), new AesGcmEncryptor());
  await testStorage.setSecure('test', { value: 42 }, 'pass');
  const result = await testStorage.getSecure('test', 'pass');
  console.log('Test:', result);
}

main().catch(console.error);