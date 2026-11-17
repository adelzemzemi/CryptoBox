/**
 * Compare two strings without an input-dependent early exit.
 *
 * Input length is not hidden, only content.
 *
 * @param a - First string
 * @param b - Second string
 * @returns True if the strings are equal
 */
export function timingSafeEqual(a: string, b: string): boolean {
  const aLength = a.length;
  const bLength = b.length;
  const maxLength = Math.max(aLength, bLength);
  let result = aLength === bLength ? 0 : 1;

  for (let i = 0; i < maxLength; i++) {
    const aChar = i < aLength ? a.charCodeAt(i) : 0;
    const bChar = i < bLength ? b.charCodeAt(i) : 0;
    result |= aChar ^ bChar;
  }

  return result === 0;
}

/**
 * Compare two byte arrays without an input-dependent early exit.
 *
 * Input length is not hidden, only content.
 *
 * @param a - First buffer
 * @param b - Second buffer
 * @returns True if the buffers are equal
 */
export function timingSafeEqualBuffer(a: Uint8Array, b: Uint8Array): boolean {
  const aLength = a.length;
  const bLength = b.length;
  const maxLength = Math.max(aLength, bLength);
  let result = aLength === bLength ? 0 : 1;

  for (let i = 0; i < maxLength; i++) {
    const aByte = a[i] ?? 0;
    const bByte = b[i] ?? 0;
    result |= aByte ^ bByte;
  }

  return result === 0;
}

/**
 * Sleep for a random duration.
 *
 * Note that jitter is not a defence against timing attacks; the noise averages out
 * over enough samples. Use {@link timingSafeEqual} to remove the data-dependent
 * branch instead. Useful for rate-limiting and smoothing response times.
 *
 * @param minMs - Minimum delay in milliseconds
 * @param maxMs - Maximum delay in milliseconds
 */
export async function randomDelay(minMs = 10, maxMs = 50): Promise<void> {
  const delay = Math.random() * (maxMs - minMs) + minMs;
  return new Promise(resolve => setTimeout(resolve, delay));
}
