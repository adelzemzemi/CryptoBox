// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  getDeviceFingerprint,
  isDeviceFingerprintAvailable,
} from '@fingerprint/device-fingerprint';

const HEX_SHA256 = /^[0-9a-f]{64}$/;

const fake2dContext = {
  textBaseline: '',
  font: '',
  fillStyle: '',
  fillRect: () => undefined,
  fillText: () => undefined,
};

const fakeWebGLContext = {
  getExtension: (name: string) =>
    name === 'WEBGL_debug_renderer_info'
      ? { UNMASKED_VENDOR_WEBGL: 0x9245, UNMASKED_RENDERER_WEBGL: 0x9246 }
      : null,
  getParameter: (param: number) => (param === 0x9245 ? 'Test Vendor' : 'Test Renderer'),
};

/** jsdom implements neither canvas nor WebGL, so both contexts are mocked. */
function mockCanvas(options: { twoD?: boolean; webgl?: boolean } = {}) {
  const { twoD = true, webgl = true } = options;

  vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue(
    'data:image/png;base64,AAAABBBB'
  );

  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(((type: string) => {
    if (type === '2d') return twoD ? fake2dContext : null;
    if (type === 'webgl' || type === 'experimental-webgl') return webgl ? fakeWebGLContext : null;
    return null;
  }) as typeof HTMLCanvasElement.prototype.getContext);
}

describe('getDeviceFingerprint', () => {
  beforeEach(() => {
    mockCanvas();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('should report availability in a browser-like environment', () => {
    expect(isDeviceFingerprintAvailable()).toBe(true);
  });

  it('should produce a hex-encoded SHA-256 hash', async () => {
    expect(await getDeviceFingerprint()).toMatch(HEX_SHA256);
  });

  it('should be stable across calls within the same environment', async () => {
    expect(await getDeviceFingerprint()).toBe(await getDeviceFingerprint());
  });

  it('should change when a device characteristic changes', async () => {
    const before = await getDeviceFingerprint();

    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue('a-completely-different-agent');

    expect(await getDeviceFingerprint()).not.toBe(before);
  });

  it('should change when the canvas rendering changes', async () => {
    const before = await getDeviceFingerprint();

    vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue(
      'data:image/png;base64,ZZZZ'
    );

    expect(await getDeviceFingerprint()).not.toBe(before);
  });

  it('should incorporate the WebGL vendor and renderer', async () => {
    const withWebGL = await getDeviceFingerprint();

    vi.restoreAllMocks();
    mockCanvas({ webgl: false });

    expect(await getDeviceFingerprint()).not.toBe(withWebGL);
  });

  it('should tolerate a canvas context being unavailable', async () => {
    vi.restoreAllMocks();
    mockCanvas({ twoD: false, webgl: false });

    expect(await getDeviceFingerprint()).toMatch(HEX_SHA256);
  });

  it('should tolerate a throwing canvas', async () => {
    vi.restoreAllMocks();
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => {
      throw new Error('blocked by privacy setting');
    });

    expect(await getDeviceFingerprint()).toMatch(HEX_SHA256);
  });

  it('should tolerate WebGL without the debug renderer extension', async () => {
    vi.restoreAllMocks();
    vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue('data:image/png;base64,AA');
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(((type: string) =>
      type === '2d'
        ? fake2dContext
        : {
            getExtension: () => null,
          }) as unknown as typeof HTMLCanvasElement.prototype.getContext);

    expect(await getDeviceFingerprint()).toMatch(HEX_SHA256);
  });
});

describe('getDeviceFingerprint outside a browser', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('should report unavailability when document is missing', () => {
    vi.stubGlobal('document', undefined);
    expect(isDeviceFingerprintAvailable()).toBe(false);
  });

  it('should throw an actionable error instead of a ReferenceError', async () => {
    vi.stubGlobal('document', undefined);

    await expect(getDeviceFingerprint()).rejects.toThrow(/requires a browser environment/);
    await expect(getDeviceFingerprint()).rejects.toThrow(/isDeviceFingerprintAvailable/);
  });
});
