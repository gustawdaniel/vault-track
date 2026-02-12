import { deriveKey, encryptEvent, decryptEvent } from './crypto';
import { generateMnemonic } from 'bip39';
import type { AppEvent, TransportEvent } from './types';
import type { AppState } from './types';
import { getCursor, updateCursor } from './cursor';
import { getAllEvents, addEvent } from './db';
import { mergeRemoteEvents } from './merger';
import { sortEvents } from './ordering';
import { replay } from './reducer';

// Configuration
const SYNC_API_URL = '/api/sync';
const PEER_ID_SERVER = 'server';

export interface SyncResponse {
    events: TransportEvent[];
    lastEventId?: string;
    timestamp: number;
}
export interface SyncOptions {
    wait?: boolean;
}

// Initialize Group ID (simplified: get from localStorage or default)
// In a real app, this would be injected or managed by a store.
async function getGroupIdAsync(): Promise<string | null> {
    if (typeof localStorage === 'undefined') return null;

    let gid = localStorage.getItem('ocm-sync-group-id');

    // Migration: If group ID is missing but mnemonic exists, derive it
    if (!gid) {
        const mnemonic = localStorage.getItem('ocm-mnemonic');
        if (mnemonic) {
            console.log('[Sync] Migrating: Deriving group ID from mnemonic');
            const { deriveGroupId } = await import('./crypto');
            gid = await deriveGroupId(mnemonic);
            localStorage.setItem('ocm-sync-group-id', gid);
            console.log(`[Sync] Group ID derived and saved: ${gid.substring(0, 16)}...`);
        }
    }

    return gid;
}

// Sync version for backwards compatibility
function getGroupId(): string | null {
    if (typeof localStorage !== 'undefined') {
        return localStorage.getItem('ocm-sync-group-id');
    }
    return null;
}

// Key management
// In a real app, this should be in a secure store.
// We'll read the mnemonic from localStorage as per plan.
async function getEncryptionKey(): Promise<CryptoKey | null> {
    if (typeof localStorage === 'undefined') return null;

    // Check for existing mnemonic
    const mnemonic = localStorage.getItem('ocm-mnemonic');

    if (!mnemonic) {
        // Warning: This auto-generation is for convenience in this dev phase.
        // In prod, UI should prompt user. But as per "Delete All Data" cycle,
        // we can generate one if missing?
        // Let's assume the UI (Settings) handles generation.
        // If no mnemonic, we can't sync encrypted.
        // Ideally we throw or return null to stop sync.
        console.warn('No encryption key (mnemonic) found. Sync disabled.');
        return null;
    }

    return deriveKey(mnemonic);
}


export async function fetchRemoteEvents(sinceTimestamp: number, options?: SyncOptions): Promise<AppEvent[]> {
    try {
        const groupId = await getGroupIdAsync();
        if (!groupId) return [];

        const key = await getEncryptionKey();
        if (!key) return []; // Cannot decrypt without key

        const waitParam = options?.wait ? '&wait=true' : '';
        const response = await fetch(`${SYNC_API_URL}/pull?since=${sinceTimestamp}${waitParam}`, {
            headers: {
                'X-Sync-Group-ID': groupId
            }
        });
        if (!response.ok) {
            console.error('Sync pull failed', response.statusText);
            return [];
        }
        const data: SyncResponse = await response.json();

        // Decrypt events
        const plainEvents: AppEvent[] = [];

        for (const remoteEvent of data.events) {
            // remoteEvent is TransportEvent. payload is ciphertext.
            try {
                // Decrypt the blob -> Full AppEvent object
                const decryptedEvent = await decryptEvent<AppEvent>(remoteEvent.payload, key);

                // Verification: ensuring the ID matches the wrapper (optional but good sanity check)
                if (decryptedEvent.eventId !== remoteEvent.eventId) {
                    console.warn('Event ID mismatch during decryption', remoteEvent.eventId);
                }

                plainEvents.push(decryptedEvent);
            } catch (e) {
                console.error('Decryption failed for event', remoteEvent.eventId, e);
                // Skip corrupt events
            }
        }

        return plainEvents;
    } catch (e) {
        console.error('Sync pull error', e);
        return [];
    }
}

export async function pushLocalEvents(events: AppEvent[]): Promise<boolean> {
    // Check group ID first
    const groupId = await getGroupIdAsync();
    if (!groupId) return false;

    if (events.length === 0) {
        console.log('[Sync] No local events to push');
        return true;
    }

    console.log(`[Sync] Pushing ${events.length} local events to server...`);

    try {
        console.log(`[Sync] Group ID: ${groupId.substring(0, 16)}...`);

        const key = await getEncryptionKey();
        if (!key) {
            console.error('[Sync] Push failed: No encryption key found');
            return false;
        }
        console.log('[Sync] Encryption key obtained');

        // Filter out any events with invalid structure (legacy format)
        const validEvents = events.filter(e => {
            // Check if event has proper structure
            if (!e.type || !e.payload || !e.eventId) {
                console.warn('[Sync] Skipping invalid event:', e.eventId);
                return false;
            }
            // Check if payload is already a string (broken legacy event)
            if (typeof e.payload === 'string') {
                console.warn('[Sync] Skipping legacy event with string payload:', e.eventId);
                return false;
            }
            return true;
        });

        if (validEvents.length < events.length) {
            console.warn(`[Sync] Filtered out ${events.length - validEvents.length} invalid/legacy events`);
        }

        // Encrypt events before sending
        // We encrypt the ENTIRE event object now.
        const encryptedEvents = await Promise.all(validEvents.map(async (e) => {
            // Encrypt the full AppEvent
            const ciphertext = await encryptEvent(e, key);

            // Validation: ensure ciphertext is a string
            if (typeof ciphertext !== 'string' || !ciphertext.includes(':')) {
                console.error('[Sync] Encryption failed for event:', e.eventId, 'ciphertext:', ciphertext);
                throw new Error(`Invalid ciphertext for event ${e.eventId}`);
            }

            // Construct TransportEvent
            // We duplicate the metadata for the server's columns/indexing
            return {
                eventId: e.eventId,
                deviceId: e.deviceId,
                counter: e.counter,
                timestamp: e.timestamp,
                payload: ciphertext // The encrypted blob of everything
            };
        }));

        // Log first event payload sample for debugging
        if (encryptedEvents.length > 0) {
            const sample = encryptedEvents[0]!.payload;
            console.log(`[Sync] Sample encrypted payload: ${sample.substring(0, 50)}...`);
        }

        const response = await fetch(`${SYNC_API_URL}/push`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Sync-Group-ID': groupId
            },
            body: JSON.stringify({ events: encryptedEvents }),
        });

        if (response.ok) {
            console.log(`[Sync] Successfully pushed ${events.length} events to server`);
        } else {
            const errorText = await response.text();
            console.error(`[Sync] Push failed with status ${response.status}: ${errorText}`);
        }

        return response.ok;
    } catch (e) {
        console.error('[Sync] Push error:', e);
        return false;
    }
}

/**
 * Orchestrates the full synchronization process.
 * 1. Push local unsynced events (simplified: currently pushes ALL or optimistically tracks synced cursor)
 * 2. Pull remote events
 * 3. Merge and Replay
 */
export async function syncWithServer(options?: SyncOptions): Promise<AppState | null> {
    // Check group ID first to stay silent if not configured
    const groupId = await getGroupIdAsync();
    if (!groupId) return null;

    console.log('[Sync] syncWithServer called');

    // 0. Get current server cursor
    const cursor = await getCursor(PEER_ID_SERVER);
    const lastTimestamp = cursor?.timestamp || 0;
    console.log(`[Sync] Last server timestamp: ${lastTimestamp}`);

    // 1. Push implementation - only push events newer than last successful push
    const { getLastPushedTimestamp, updatePushCursor } = await import('./cursor');
    const lastPushed = await getLastPushedTimestamp();

    const allLocalEvents = await getAllEvents();
    const newEvents = allLocalEvents.filter(e => e.timestamp > lastPushed);

    console.log(`[Sync] Found ${allLocalEvents.length} local events, ${newEvents.length} new since last push`);

    if (newEvents.length > 0) {
        const pushSuccess = await pushLocalEvents(newEvents);
        if (pushSuccess) {
            // Update push cursor to the latest event timestamp
            const latestTimestamp = Math.max(...newEvents.map(e => e.timestamp));
            await updatePushCursor(latestTimestamp);
            console.log(`[Sync] Push cursor updated to ${latestTimestamp}`);
        } else {
            console.warn('[Sync] Push failed, will retry on next sync');
        }
    }

    // 2. Pull
    const remoteEvents = await fetchRemoteEvents(lastTimestamp, options);
    console.log(`[Sync] Fetched ${remoteEvents.length} remote events`);

    if (remoteEvents.length === 0) {
        return null; // No changes
    }

    // 3. Merge
    const mergedEvents = mergeRemoteEvents(allLocalEvents, remoteEvents);

    // 4. Update Cursor
    // Find the max timestamp in remote events
    let maxTimestamp = lastTimestamp;
    remoteEvents.forEach(e => {
        if (e.timestamp > maxTimestamp) maxTimestamp = e.timestamp;
    });

    await updateCursor(PEER_ID_SERVER, {
        timestamp: maxTimestamp,
        lastEventId: remoteEvents[remoteEvents.length - 1]?.eventId
    });

    // 5. Replay
    // Note: We might want to persist the merged events to DB first!
    // addEvent() adds one by one. mergeRemoteEvents gives us the sorted list.
    // We should store the NEW remote events.

    // Check which ones are new
    const remoteNewEvents = remoteEvents.filter(re => !allLocalEvents.find(le => le.eventId === re.eventId));

    // Import `addEvent` dynamically or from module to avoid circular dependency issues? No, `client` depends on `db`, that's fine.
    // However, since we are using vite, we can just use top level import if we remove circular deps, or keep this.
    // The previous error suggests syntax issues.
    for (const event of remoteNewEvents) {
        await addEvent(event);
    }

    return replay(sortEvents(mergedEvents));
}
