import { IStorage } from '@core/interfaces';

/**
 * Local storage adapter
 */
export class LocalStorage implements IStorage {
  setItem(key: string, value: string): void {
    localStorage.setItem(key, value);
  }

  getItem(key: string): string | null {
    return localStorage.getItem(key);
  }

  removeItem(key: string): void {
    localStorage.removeItem(key);
  }
}
