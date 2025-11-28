/**
 * Encode binary data to base64 string
 * @param data - Binary data as Uint8Array
 * @returns Base64-encoded string
 */
export function encodeBase64(data: Uint8Array): string {
  // Use browser's btoa but safely handle all bytes
  let binary = '';
  const len = data.length;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(data[i]);
  }
  return btoa(binary);
}

/**
 * Decode base64 string to binary data
 * @param base64 - Base64-encoded string
 * @returns Binary data as Uint8Array
 */
export function decodeBase64(base64: string): Uint8Array {
  const binary = atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Encode using Buffer API (Node.js/Bun compatibility)
 * @param data - Binary data as Uint8Array
 * @returns Base64-encoded string
 */
export function encodeBase64Buffer(data: Uint8Array): string {
  if (typeof globalThis !== 'undefined' && 'Buffer' in globalThis) {
    const BufferImpl = (globalThis as any).Buffer;
    return BufferImpl.from(data).toString('base64');
  }
  return encodeBase64(data);
}

/**
 * Decode using Buffer API (Node.js/Bun compatibility)
 * @param base64 - Base64-encoded string
 * @returns Binary data as Uint8Array
 */
export function decodeBase64Buffer(base64: string): Uint8Array {
  if (typeof globalThis !== 'undefined' && 'Buffer' in globalThis) {
    const BufferImpl = (globalThis as any).Buffer;
    return new Uint8Array(BufferImpl.from(base64, 'base64'));
  }
  return decodeBase64(base64);
}
