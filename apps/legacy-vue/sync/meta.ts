import { openDB, type IDBPDatabase } from 'idb';

export const DB_NAME = 'ocm-sync-meta-v2';
export const META_STORE = 'meta';
export const CURSOR_STORE = 'cursors';

let dbPromise: Promise<IDBPDatabase> | null = null;

export function getMetaDB() {
    if (!dbPromise) {
        // Version 2 to trigger upgrade if v1 exists
        dbPromise = openDB(DB_NAME, 2, {
            upgrade(db) {
                if (!db.objectStoreNames.contains(META_STORE)) {
                    db.createObjectStore(META_STORE);
                }
                if (!db.objectStoreNames.contains(CURSOR_STORE)) {
                    db.createObjectStore(CURSOR_STORE, { keyPath: 'peerId' });
                }
            },
        });
    }
    return dbPromise;
}

export async function clearMeta() {
    const db = await getMetaDB();
    await Promise.all([
        db.clear(META_STORE),
        db.clear(CURSOR_STORE),
    ]);
}
