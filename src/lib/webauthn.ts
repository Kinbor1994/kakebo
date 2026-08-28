/**
 * WebAuthn (Touch ID, Face ID, Windows Hello) local biometric authentication
 */

function bufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

function base64ToBuffer(base64: string): Uint8Array<ArrayBuffer> {
  const binary = window.atob(base64);
  const buffer = new ArrayBuffer(binary.length);
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export async function isBiometricAvailable(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  if (!window.PublicKeyCredential) return false;
  try {
    return await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

export async function registerBiometric(username: string = 'Kakeibo User'): Promise<string | null> {
  try {
    const challenge = new Uint8Array(32);
    window.crypto.getRandomValues(challenge);

    const userId = new Uint8Array(16);
    window.crypto.getRandomValues(userId);

    const credential = (await navigator.credentials.create({
      publicKey: {
        challenge: challenge.buffer,
        rp: {
          name: 'Kakeibo Finances',
        },
        user: {
          id: userId.buffer,
          name: username,
          displayName: username,
        },
        pubKeyCredParams: [
          { alg: -7, type: 'public-key' }, // ES256
          { alg: -257, type: 'public-key' }, // RS256
        ],
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          userVerification: 'required',
          residentKey: 'preferred',
        },
        timeout: 60000,
      },
    })) as PublicKeyCredential | null;

    if (credential) {
      return bufferToBase64(credential.rawId);
    }
    return null;
  } catch (error) {
    console.error('Biometric registration error:', error);
    return null;
  }
}

export async function verifyBiometric(credentialIdBase64: string): Promise<boolean> {
  try {
    const challenge = new Uint8Array(32);
    window.crypto.getRandomValues(challenge);

    const credentialIdBuffer = base64ToBuffer(credentialIdBase64);

    const assertion = await navigator.credentials.get({
      publicKey: {
        challenge: challenge.buffer,
        allowCredentials: [
          {
            id: credentialIdBuffer.buffer,
            type: 'public-key',
            transports: ['internal'],
          },
        ],
        userVerification: 'required',
        timeout: 60000,
      },
    });

    return Boolean(assertion);
  } catch (error) {
    console.error('Biometric verification error:', error);
    return false;
  }
}
