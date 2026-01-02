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
