import { IStorage } from '@core/interfaces';

/**
 * Session storage adapter
 */
export class SessionStorage implements IStorage {
  setItem(key: string, value: string): void {
    sessionStorage.setItem(key, value);
  }

  getItem(key: string): string | null {
    return sessionStorage.getItem(key);
  }

  removeItem(key: string): void {
    sessionStorage.removeItem(key);
  }
}
