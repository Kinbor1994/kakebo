/**
 * Local-First Web Crypto API implementation for PIN authentication & hashing
 * Uses PBKDF2 with SHA-256 and 100,000 iterations for robust offline security.
 */

function bufferToHex(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function hexToBuffer(hex: string): Uint8Array<ArrayBuffer> {
  const match = hex.match(/.{1,2}/g);
  if (!match) return new Uint8Array(0);
  const buffer = new ArrayBuffer(match.length);
  const view = new Uint8Array(buffer);
  for (let i = 0; i < match.length; i++) {
    view[i] = parseInt(match[i], 16);
  }
  return view;
}

export function generateSalt(byteLength: number = 16): string {
  const buffer = new ArrayBuffer(byteLength);
  const salt = new Uint8Array(buffer);
  window.crypto.getRandomValues(salt);
  return bufferToHex(buffer);
}

export async function hashPin(pin: string, saltHex: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    encoder.encode(pin),
    { name: 'PBKDF2' },
    false,
    ['deriveBits', 'deriveKey']
  );

  const salt = hexToBuffer(saltHex);

  const derivedKey = await window.crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: salt.buffer,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    256 // 256 bits = 32 bytes
  );

  return bufferToHex(derivedKey);
}

export async function verifyPin(
  pin: string,
  saltHex: string,
  expectedHashHex: string
): Promise<boolean> {
  try {
    const computedHash = await hashPin(pin, saltHex);
    // Constant-time length and byte comparison to prevent timing attacks
    if (computedHash.length !== expectedHashHex.length) {
      return false;
    }
    let diff = 0;
    for (let i = 0; i < computedHash.length; i++) {
      diff |= computedHash.charCodeAt(i) ^ expectedHashHex.charCodeAt(i);
    }
    return diff === 0;
  } catch (error) {
    console.error('Error verifying PIN:', error);
    return false;
  }
}
