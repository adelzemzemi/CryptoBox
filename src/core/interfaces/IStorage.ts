/**
 * Interface for storage operations
 */
export interface IStorage {
  /**
   * Store a value
   * @param key - Storage key
   * @param value - Value to store (string)
   */
  setItem(key: string, value: string): void;

  /**
   * Retrieve a value
   * @param key - Storage key
   * @returns Stored value or null if not found
   */
  getItem(key: string): string | null;

  /**
   * Remove a value
   * @param key - Storage key
   */
  removeItem(key: string): void;
}
