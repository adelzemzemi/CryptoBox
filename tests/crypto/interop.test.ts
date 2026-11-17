import { createCipheriv, createDecipheriv, pbkdf2Sync, randomBytes } from 'node:crypto';
import { describe, it, expect } from 'vitest';
import { encrypt, decrypt } from '@crypto/algorithms/aes-gcm';
import { decodeBase64, encodeBase64 } from '@crypto/encoding/base64';

/**
 * The same format, written and read by an implementation that shares no code with
 * this package: Node's OpenSSL bindings instead of Web Crypto.
 *
 * The frozen vectors prove the format does not drift over time. These prove it is
 * the format the README documents, since a second implementation built from that
 * description alone agrees with this one byte for byte.
 */
const PASSWORD = 'correct horse battery staple';
const PLAINTEXT = '{"user":"alice","note":"héllo \u{1F510}"}';
const ITERATIONS = 1000;
const TAG_SIZE = 16;

function referenceKey(salt: Uint8Array, iterations: number): Buffer {
  return pbkdf2Sync(Buffer.from(PASSWORD, 'utf8'), salt, iterations, 32, 'sha256');
}

function referenceHeader(iterations: number): Buffer {
  const header = Buffer.alloc(5);
  header.writeUInt8(2, 0);
  header.writeUInt32BE(iterations, 1);
  return header;
}

/** Write a version 2 envelope with OpenSSL. */
function referenceEncryptV2(context: string): string {
  const header = referenceHeader(ITERATIONS);
  const salt = randomBytes(16);
  const iv = randomBytes(12);

  const cipher = createCipheriv('aes-256-gcm', referenceKey(salt, ITERATIONS), iv);
  cipher.setAAD(Buffer.concat([header, Buffer.from(context, 'utf8')]));
  const body = Buffer.concat([
    cipher.update(PLAINTEXT, 'utf8'),
    cipher.final(),
    cipher.getAuthTag(),
  ]);

  return encodeBase64(new Uint8Array(Buffer.concat([header, salt, iv, body])));
}

/** Write a version 0 envelope with OpenSSL, as 1.x did with Web Crypto. */
function referenceEncryptV0(): string {
  const salt = randomBytes(16);
  // Keeps the salt from reading as a version 2 header.
  salt[0] = 0xa0;
  const iv = randomBytes(12);

  const cipher = createCipheriv('aes-256-gcm', referenceKey(salt, 100_000), iv);
  const body = Buffer.concat([
    cipher.update(PLAINTEXT, 'utf8'),
    cipher.final(),
    cipher.getAuthTag(),
  ]);

  return encodeBase64(new Uint8Array(Buffer.concat([salt, iv, body])));
}

/** Read a version 2 envelope with OpenSSL. */
function referenceDecryptV2(ciphertext: string, context: string): string {
  const bytes = Buffer.from(decodeBase64(ciphertext));
  const header = bytes.subarray(0, 5);
  const salt = bytes.subarray(5, 21);
  const iv = bytes.subarray(21, 33);
  const body = bytes.subarray(33, bytes.length - TAG_SIZE);
  const tag = bytes.subarray(bytes.length - TAG_SIZE);

  const decipher = createDecipheriv('aes-256-gcm', referenceKey(salt, header.readUInt32BE(1)), iv);
  decipher.setAAD(Buffer.concat([header, Buffer.from(context, 'utf8')]));
  decipher.setAuthTag(tag);

  return Buffer.concat([decipher.update(body), decipher.final()]).toString('utf8');
}

describe('interoperability with an independent implementation', () => {
  it('should read a version 2 envelope written by OpenSSL', async () => {
    expect(await decrypt(referenceEncryptV2(''), PASSWORD, { allowLegacy: false })).toBe(PLAINTEXT);
  });

  it('should read a context-bound envelope written by OpenSSL', async () => {
    const ciphertext = referenceEncryptV2('user:42');

    expect(await decrypt(ciphertext, PASSWORD, { context: 'user:42' })).toBe(PLAINTEXT);
    await expect(decrypt(ciphertext, PASSWORD, { context: 'user:43' })).rejects.toMatchObject({
      code: 'DECRYPTION_FAILED',
    });
  });

  it('should read a version 0 envelope written by OpenSSL', async () => {
    expect(await decrypt(referenceEncryptV0(), PASSWORD)).toBe(PLAINTEXT);
  });

  it('should write envelopes OpenSSL can read', async () => {
    const options = { iterations: ITERATIONS, allowWeakIterations: true };

    const unbound = await encrypt(PLAINTEXT, PASSWORD, options);
    const bound = await encrypt(PLAINTEXT, PASSWORD, { ...options, context: 'user:42' });

    expect(referenceDecryptV2(unbound, '')).toBe(PLAINTEXT);
    expect(referenceDecryptV2(bound, 'user:42')).toBe(PLAINTEXT);
    expect(() => referenceDecryptV2(bound, 'user:43')).toThrow();
  });
});
