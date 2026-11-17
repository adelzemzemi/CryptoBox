import { describe, it, expect } from 'vitest';
import {
  buildHeader,
  buildAad,
  envelopeAad,
  envelopeCandidates,
  parseHeadered,
  parseHeaderless,
  readVersion,
  assertValidIterations,
  HEADERED_MINIMUM,
  HEADERLESS_MINIMUM,
} from '@crypto/envelope';
import { ENVELOPE_VERSION, PBKDF2_ITERATIONS_LEGACY, PBKDF2_ITERATIONS_MAX } from '@core/constants';

/** Unwrap a parse result the test knows must have succeeded. */
function parsed(envelope: ReturnType<typeof parseHeadered>) {
  if (envelope === null) throw new Error('expected the buffer to parse as a headered envelope');
  return envelope;
}

/** A syntactically valid headered envelope of the smallest possible size. */
function headeredBytes(version: number, iterations: number, length = HEADERED_MINIMUM) {
  const bytes = new Uint8Array(length);
  bytes.set(buildHeader(iterations), 0);
  bytes[0] = version;
  return bytes;
}

describe('buildHeader', () => {
  it('should encode the version and the iteration count big-endian', () => {
    const header = buildHeader(1000);

    expect(header).toHaveLength(5);
    expect(header[0]).toBe(ENVELOPE_VERSION);
    expect(new DataView(header.buffer).getUint32(1, false)).toBe(1000);
  });
});

describe('buildAad', () => {
  it('should concatenate the header and the context', () => {
    const header = buildHeader(1000);
    const aad = buildAad(header, 'abc');

    expect(aad).toHaveLength(header.length + 3);
    expect(aad.slice(0, header.length)).toEqual(header);
    expect(new TextDecoder().decode(aad.slice(header.length))).toBe('abc');
  });

  it('should reduce to the header alone for an empty context', () => {
    expect(buildAad(buildHeader(1000), '')).toEqual(buildHeader(1000));
  });
});

describe('parseHeadered', () => {
  it('should accept version 2', () => {
    expect(parseHeadered(headeredBytes(ENVELOPE_VERSION, 1000))?.version).toBe(ENVELOPE_VERSION);
  });

  it('should not recognise version 1, which no release ever wrote', () => {
    expect(parseHeadered(headeredBytes(1, 1000))).toBeNull();
  });

  it('should reject a buffer shorter than a header plus salt and iv', () => {
    expect(parseHeadered(headeredBytes(ENVELOPE_VERSION, 1000, HEADERED_MINIMUM - 1))).toBeNull();
  });

  it('should reject an unknown version byte', () => {
    expect(parseHeadered(headeredBytes(7, 1000))).toBeNull();
  });

  it('should reject an iteration count outside the accepted range', () => {
    expect(parseHeadered(headeredBytes(ENVELOPE_VERSION, 0))).toBeNull();
    expect(parseHeadered(headeredBytes(ENVELOPE_VERSION, PBKDF2_ITERATIONS_MAX + 1))).toBeNull();
  });

  it('should split the buffer into header, salt, iv and body', () => {
    const envelope = parseHeadered(headeredBytes(ENVELOPE_VERSION, 1000, HEADERED_MINIMUM + 8));

    expect(envelope?.header).toHaveLength(5);
    expect(envelope?.salt).toHaveLength(16);
    expect(envelope?.iv).toHaveLength(12);
    expect(envelope?.body).toHaveLength(8);
    expect(envelope?.iterations).toBe(1000);
  });
});

describe('parseHeaderless', () => {
  it('should read any sufficiently long buffer as version 0', () => {
    const envelope = parseHeaderless(new Uint8Array(HEADERLESS_MINIMUM + 4));

    expect(envelope.version).toBe(0);
    expect(envelope.iterations).toBe(PBKDF2_ITERATIONS_LEGACY);
    expect(envelope.header).toHaveLength(0);
    expect(envelope.body).toHaveLength(4);
  });
});

describe('envelopeCandidates', () => {
  it('should offer both readings of a headered buffer', () => {
    const candidates = envelopeCandidates(headeredBytes(ENVELOPE_VERSION, 1000), true);
    expect(candidates.map(candidate => candidate.version)).toEqual([ENVELOPE_VERSION, 0]);
  });

  it('should offer only version 0 when the header is unrecognisable', () => {
    const candidates = envelopeCandidates(headeredBytes(7, 1000), true);
    expect(candidates.map(candidate => candidate.version)).toEqual([0]);
  });

  it('should offer nothing legacy when legacy reads are disabled', () => {
    expect(envelopeCandidates(headeredBytes(7, 1000), false)).toEqual([]);
  });

  it('should keep version 2 when legacy reads are disabled', () => {
    const candidates = envelopeCandidates(headeredBytes(ENVELOPE_VERSION, 1000), false);
    expect(candidates.map(candidate => candidate.version)).toEqual([ENVELOPE_VERSION]);
  });

  it('should offer nothing for a buffer too short to be any envelope', () => {
    expect(envelopeCandidates(new Uint8Array(HEADERLESS_MINIMUM - 1), true)).toEqual([]);
  });
});

describe('envelopeAad', () => {
  it('should bind the header and context for version 2', () => {
    const envelope = parsed(parseHeadered(headeredBytes(ENVELOPE_VERSION, 1000)));
    expect(envelopeAad(envelope, 'ctx')).toEqual(buildAad(envelope.header, 'ctx'));
  });

  it('should return nothing for version 0, which predates binding', () => {
    expect(envelopeAad(parseHeaderless(new Uint8Array(HEADERLESS_MINIMUM)), 'ctx')).toBeUndefined();
  });
});

describe('readVersion', () => {
  it('should return the first byte', () => {
    expect(readVersion(headeredBytes(ENVELOPE_VERSION, 1000))).toBe(ENVELOPE_VERSION);
  });
});

describe('assertValidIterations', () => {
  it('should accept the bounds and reject everything outside them', () => {
    expect(() => assertValidIterations(1)).not.toThrow();
    expect(() => assertValidIterations(PBKDF2_ITERATIONS_MAX)).not.toThrow();

    for (const iterations of [0, PBKDF2_ITERATIONS_MAX + 1, 1.5, Number.NaN]) {
      expect(() => assertValidIterations(iterations)).toThrow(
        expect.objectContaining({ code: 'INVALID_ITERATIONS' })
      );
    }
  });
});
