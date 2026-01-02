import type { AppEvent } from './types';
import type { AppState } from './types';
import { getCursor, updateCursor } from './cursor';
import { getAllEvents } from './db';
import { mergeRemoteEvents } from './merger';
import { sortEvents } from './ordering';
import { replay } from './reducer';

// Configuration
const SYNC_API_URL = '/api/sync';
const PEER_ID_SERVER = 'server';

// Initialize Group ID (simplified: get from localStorage or default)
// In a real app, this would be injected or managed by a store.
function getGroupId(): string {
    if (typeof localStorage !== 'undefined') {
        let gid = localStorage.getItem('ocm-sync-group-id');
        if (!gid) {
            gid = 'default'; // Default group if not set
            // Or don't set default and fail? For ease of use, 'default' is fine for single user.
        }
        return gid;
    }
    return 'default';
}

export interface SyncResponse {
    events: AppEvent[];
    lastEventId?: string;
    timestamp: number;
}
export interface SyncOptions {
    wait?: boolean;
}

export async function fetchRemoteEvents(sinceTimestamp: number, options?: SyncOptions): Promise<AppEvent[]> {
    try {
        const waitParam = options?.wait ? '&wait=true' : '';
        const response = await fetch(`${SYNC_API_URL}/pull?since=${sinceTimestamp}${waitParam}`, {
            headers: {
                'X-Sync-Group-ID': getGroupId()
            }
        });
        if (!response.ok) {
            console.error('Sync pull failed', response.statusText);
            return [];
        }
        const data: SyncResponse = await response.json();
        return data.events;
    } catch (e) {
        console.error('Sync pull error', e);
        return [];
    }
}

export async function pushLocalEvents(events: AppEvent[]): Promise<boolean> {
    if (events.length === 0) return true;
    try {
        const response = await fetch(`${SYNC_API_URL}/push`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Sync-Group-ID': getGroupId()
            },
            body: JSON.stringify({ events }),
        });
        return response.ok;
    } catch (e) {
        console.error('Sync push error', e);
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
    // 0. Get current server cursor
    const cursor = await getCursor(PEER_ID_SERVER);
    const lastTimestamp = cursor?.timestamp || 0;

    // 1. Push implementation
    // Ideally we track what we have successfully pushed. 
    // For MVP, we can just try to push recent events or all events (deduplicated by server).
    // Let's assume a "dumb server" that accepts duplicates safely.
    // Optimization: Track "lastPushedTimestamp" in a separate cursor.
    const allLocalEvents = await getAllEvents();
    // Simple optimization: only push events newer than last successful sync? 
    // Risk: if push failed but sync succeeded, we might miss events.
    // Better: keep a "pushed_cursor".
    // For now, push all (inefficient but safe for MVP).
    const pushSuccess = await pushLocalEvents(allLocalEvents);
    if (!pushSuccess) {
        console.warn('Push failed, continuing to pull...');
    }

    // 2. Pull
    const remoteEvents = await fetchRemoteEvents(lastTimestamp, options);

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
    const newEvents = remoteEvents.filter(re => !allLocalEvents.find(le => le.eventId === re.eventId));

    // Import `addEvent` dynamically or from module to avoid circular dependency issues? No, `client` depends on `db`, that's fine.
    // However, since we are using vite, we can just use top level import if we remove circular deps, or keep this.
    // The previous error suggests syntax issues.
    const dbModule = await import('./db');
    const addEvent = dbModule.addEvent;
    for (const event of newEvents) {
        await addEvent(event);
    }

    return replay(sortEvents(mergedEvents));
}
