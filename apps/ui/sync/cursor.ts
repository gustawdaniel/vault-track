import { getMetaDB, CURSOR_STORE } from './meta';

export interface SyncCursor {
    peerId: string;
    lastEventId?: string;
    timestamp: number; // Time of the last synced event
}

export async function getCursor(peerId: string): Promise<SyncCursor | undefined> {
    const db = await getMetaDB();
    return db.get(CURSOR_STORE, peerId);
}

export async function updateCursor(peerId: string, cursor: Omit<SyncCursor, 'peerId'>): Promise<void> {
    const db = await getMetaDB();
    await db.put(CURSOR_STORE, { ...cursor, peerId });
}

// Special peer ID for tracking what we've pushed to server
export const PEER_ID_PUSH_CURSOR = 'push-cursor';

/**
 * Get the last successfully pushed event timestamp
 */
export async function getLastPushedTimestamp(): Promise<number> {
    const cursor = await getCursor(PEER_ID_PUSH_CURSOR);
    return cursor?.timestamp || 0;
}

/**
 * Update the push cursor after successful push
 */
export async function updatePushCursor(timestamp: number): Promise<void> {
    await updateCursor(PEER_ID_PUSH_CURSOR, { timestamp });
}
