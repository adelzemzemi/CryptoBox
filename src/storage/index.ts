/**
 * Storage module exports
 * Single entry point for all storage implementations
 */

export { SessionStorage } from './SessionStorage';
export { LocalStorage } from './LocalStorage';
export { MemoryStorage } from './MemoryStorage';

// Legacy exports for backward compatibility
export { SessionStorage as SessionTokenStorage } from './SessionStorage';
export { LocalStorage as LocalTokenStorage } from './LocalStorage';
export { MemoryStorage as MemoryTokenStorage } from './MemoryStorage';

// Re-export interface
export type { IStorage as TokenStorage } from '@core/interfaces';
export type { IStorage } from '@core/interfaces';
