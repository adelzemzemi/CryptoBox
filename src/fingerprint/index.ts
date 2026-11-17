/**
 * Browser device fingerprinting, published as `@azemzemi/cryptobox/fingerprint`.
 *
 * It lives behind its own entry point because it only runs in a browser and
 * because collecting device characteristics carries privacy obligations that the
 * rest of the package does not impose on its consumers.
 */
export { getDeviceFingerprint, isDeviceFingerprintAvailable } from './device-fingerprint.js';

export { CryptoBoxError, isCryptoBoxError } from '../core/errors.js';
export type { CryptoBoxErrorCode } from '../core/errors.js';
