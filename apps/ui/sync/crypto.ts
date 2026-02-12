// import type { EventPayload } from './types'; // No longer needed


// Constants for encryption
const PBKDF2_ITERATIONS = 100000;
const SALT = 'vaulttrack-salt-v1'; // Fixed salt for determinstic key derivation from mnemonic
const AES_ALGO = 'AES-GCM';
const KEY_LENGTH = 256;

/**
 * Derives an AES-GCM key from a BIP39 mnemonic using PBKDF2.
 */
export async function deriveKey(mnemonic: string): Promise<CryptoKey> {
    const enc = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
        'raw',
        enc.encode(mnemonic.trim()),
        { name: 'PBKDF2' },
        false,
        ['deriveKey']
    );

    return crypto.subtle.deriveKey(
        {
            name: 'PBKDF2',
            salt: enc.encode(SALT),
            iterations: PBKDF2_ITERATIONS,
            hash: 'SHA-256'
        },
        keyMaterial,
        { name: AES_ALGO, length: KEY_LENGTH },
        false, // Key not exportable
        ['encrypt', 'decrypt']
    );
}

/**
 * Derives a public Group ID from the mnemonic.
 * This allows the server to group devices without knowing the private key.
 * Uses SHA-256 to hash the mnemonic.
 */
export async function deriveGroupId(mnemonic: string): Promise<string> {
    const enc = new TextEncoder();
    const data = enc.encode(mnemonic.trim());
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);

    // Convert to hex string
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Hashes an entity ID to create a deterministic but opaque identifier.
 * Used for migration event IDs to prevent exposing resource types.
 */
export async function hashEntityId(entityId: string): Promise<string> {
    const enc = new TextEncoder();
    const data = enc.encode(entityId);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);

    // Convert to hex string (first 16 chars for brevity)
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 16);
}

/**
 * Encrypts any payload.
 * Returns a string in format: "iv:ciphertext" (base64 encoded)
 */
export async function encryptEvent<T = any>(data: T, key: CryptoKey): Promise<string> {
    const enc = new TextEncoder();
    const iv = crypto.getRandomValues(new Uint8Array(12)); // 96-bit IV for GCM
    const json = JSON.stringify(data);

    const ciphertext = await crypto.subtle.encrypt(
        {
            name: AES_ALGO,
            iv: iv
        },
        key,
        enc.encode(json)
    );

    // Combine IV and Ciphertext for storage
    // Format: base64(iv) + ":" + base64(ciphertext)
    return `${arrayBufferToBase64(iv)}:${arrayBufferToBase64(ciphertext)}`;
}

/**
 * Decrypts an encrypted payload string into an object.
 */
export async function decryptEvent<T = any>(payload: string, key: CryptoKey): Promise<T> {
    const parts = payload.split(':');
    if (parts.length !== 2) {
        throw new Error('Invalid encrypted payload format');
    }

    const iv = base64ToArrayBuffer(parts[0]!);
    const ciphertext = base64ToArrayBuffer(parts[1]!);

    const decrypted = await crypto.subtle.decrypt(
        {
            name: AES_ALGO,
            iv: iv
        },
        key,
        ciphertext
    );

    const dec = new TextDecoder();
    return JSON.parse(dec.decode(decrypted));
}

// Helpers
function arrayBufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
    let binary = '';
    const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]!); // Assert non-null
    }
    return btoa(binary);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary_string = atob(base64);
    const len = binary_string.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binary_string.charCodeAt(i);
    }
    return bytes.buffer;
}
