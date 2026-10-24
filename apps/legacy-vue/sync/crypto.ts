/**
 * Derives a public Group ID from the mnemonic (12-word pairing phrase).
 * Uses SHA-256 to hash the mnemonic into a deterministic workspace identifier.
 */
export async function deriveGroupId(mnemonic: string): Promise<string> {
    const enc = new TextEncoder();
    const data = enc.encode(mnemonic.trim());
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);

    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Hashes an entity ID to create a deterministic identifier for migration events.
 */
export async function hashEntityId(entityId: string): Promise<string> {
    const enc = new TextEncoder();
    const data = enc.encode(entityId);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);

    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 16);
}

