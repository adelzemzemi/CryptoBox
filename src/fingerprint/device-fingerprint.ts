import { CryptoBoxError } from '../core/errors.js';

interface FingerprintGlobals {
  document: Document;
  navigator: Navigator;
  screen: Screen;
  window: Window;
}

/** @returns True if {@link getDeviceFingerprint} can run in this runtime. */
export function isDeviceFingerprintAvailable(): boolean {
  return (
    typeof document !== 'undefined' &&
    typeof navigator !== 'undefined' &&
    typeof screen !== 'undefined' &&
    typeof window !== 'undefined'
  );
}

function requireBrowserGlobals(): FingerprintGlobals {
  if (!isDeviceFingerprintAvailable()) {
    throw new CryptoBoxError(
      'UNSUPPORTED_ENVIRONMENT',
      'getDeviceFingerprint() requires a browser environment (document, navigator, screen, window). ' +
        'Guard the call with isDeviceFingerprintAvailable() when running in Node.js, Deno, Bun, or during SSR.'
    );
  }

  return { document, navigator, screen, window };
}

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/** @returns Truncated hash of the rendered canvas, or an empty string if unavailable. */
async function getCanvasFingerprint(document: Document): Promise<string> {
  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

    canvas.width = 200;
    canvas.height = 50;
    ctx.textBaseline = 'top';
    ctx.font = '14px "Arial"';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#f60';
    ctx.fillRect(125, 1, 62, 20);
    ctx.fillStyle = '#069';
    ctx.fillText('CryptoBox 🔒', 2, 15);
    ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
    ctx.fillText('CryptoBox 🔒', 4, 17);

    return (await sha256Hex(canvas.toDataURL())).substring(0, 16);
  } catch {
    return '';
  }
}

/** @returns `vendor|renderer`, or an empty string if unavailable. */
function getWebGLFingerprint(document: Document): string {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') ?? canvas.getContext('experimental-webgl');
    if (!gl) return '';

    const webgl = gl as WebGLRenderingContext;
    const debugInfo = webgl.getExtension('WEBGL_debug_renderer_info');
    if (!debugInfo) return '';

    const vendor: unknown = webgl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL);
    const renderer: unknown = webgl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);

    return `${String(vendor)}|${String(renderer)}`;
  } catch {
    return '';
  }
}

/**
 * Hash the device characteristics available to the page.
 *
 * The result is not stable: browser updates, hardware changes, timezone changes and
 * privacy settings all change it. Use it as a signal (for example, to force
 * re-authentication when a session appears on another device), never as key material:
 * data encrypted under an old fingerprint is unrecoverable once it changes.
 *
 * The component list is frozen, including the deprecated `navigator.platform`, so
 * fingerprints stay comparable across releases.
 *
 * @returns Hex-encoded SHA-256 hash of the collected characteristics
 * @throws CryptoBoxError `UNSUPPORTED_ENVIRONMENT` if called outside a browser
 */
export async function getDeviceFingerprint(): Promise<string> {
  const { document, navigator, screen, window } = requireBrowserGlobals();

  const components = [
    navigator.userAgent,
    navigator.language,
    navigator.languages?.join(',') || '',
    navigator.platform,
    navigator.hardwareConcurrency || 0,
    (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 0,
    screen.colorDepth,
    screen.width + 'x' + screen.height,
    screen.availWidth + 'x' + screen.availHeight,
    window.devicePixelRatio || 1,
    new Date().getTimezoneOffset(),
    Intl.DateTimeFormat().resolvedOptions().timeZone,
    !!window.sessionStorage,
    !!window.localStorage,
    !!window.indexedDB,
    !!(window as Window & { openDatabase?: unknown }).openDatabase,
    getWebGLFingerprint(document),
    await getCanvasFingerprint(document),
  ];

  return sha256Hex(components.join('|'));
}
