/**
 * Get canvas fingerprint
 * @returns Canvas fingerprint hash or empty string
 */
async function getCanvasFingerprint(): Promise<string> {
  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

    // Draw text with specific styling
    canvas.width = 200;
    canvas.height = 50;
    ctx.textBaseline = 'top';
    ctx.font = '14px "Arial"';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#f60';
    ctx.fillRect(125, 1, 62, 20);
    ctx.fillStyle = '#069';
    ctx.fillText('CryptoVault 🔒', 2, 15);
    ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
    ctx.fillText('CryptoVault 🔒', 4, 17);

    // Get canvas data
    const dataUrl = canvas.toDataURL();
    
    // Hash it
    const encoder = new TextEncoder();
    const data = encoder.encode(dataUrl);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 16);
  } catch {
    return '';
  }
}

/**
 * Get WebGL fingerprint
 * @returns WebGL fingerprint or empty string
 */
function getWebGLFingerprint(): string {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!gl) return '';

    // Cast to WebGLRenderingContext
    const webgl = gl as WebGLRenderingContext;
    const debugInfo = webgl.getExtension('WEBGL_debug_renderer_info');
    if (!debugInfo) return '';

    const vendor = webgl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL);
    const renderer = webgl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
    
    return `${vendor}|${renderer}`;
  } catch {
    return '';
  }
}

/**
 * Generate device-specific fingerprint
 * @returns SHA-256 hash of device characteristics
 */
export async function getDeviceFingerprint(): Promise<string> {
  const components = [
    navigator.userAgent,
    navigator.language,
    navigator.languages?.join(',') || '',
    navigator.platform,
    navigator.hardwareConcurrency || 0,
    (navigator as any).deviceMemory || 0,
    screen.colorDepth,
    screen.width + 'x' + screen.height,
    screen.availWidth + 'x' + screen.availHeight,
    window.devicePixelRatio || 1,
    new Date().getTimezoneOffset(),
    Intl.DateTimeFormat().resolvedOptions().timeZone,
    !!window.sessionStorage,
    !!window.localStorage,
    !!window.indexedDB,
    !!(window as any).openDatabase,
    getWebGLFingerprint(),
    await getCanvasFingerprint(),
  ];

  const fingerprint = components.join('|');
  
  const encoder = new TextEncoder();
  const data = encoder.encode(fingerprint);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
