import { openDB, type IDBPDatabase } from 'idb';
import type { AppEvent } from './types';

const DB_NAME = 'ocm-sync-events';
const STORE_NAME = 'events';

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDB() {
    if (!dbPromise) {
        dbPromise = openDB(DB_NAME, 1, {
            upgrade(db) {
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    const store = db.createObjectStore(STORE_NAME, {
                        keyPath: 'eventId',
                    });
                    // Index for retrieving events in roughly insertion order (or by timestamp)
                    // Though typically we just get all and sort in memory for the reducer
                    store.createIndex('timestamp', 'timestamp');
                }
            },
        });
    }
    return dbPromise;
}

import { toRaw } from 'vue';

export async function addEvent(event: AppEvent): Promise<void> {
    const db = await getDB();
    await db.put(STORE_NAME, toRaw(event));
}

export async function addEvents(events: AppEvent[]): Promise<void> {
    const db = await getDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    await Promise.all(events.map(event => tx.store.put(toRaw(event))));
    await tx.done;
}

export async function getAllEvents(): Promise<AppEvent[]> {
    const db = await getDB();
    return db.getAll(STORE_NAME);
}

// For reset/debug
export async function clearEvents(): Promise<void> {
    const db = await getDB();
    await db.clear(STORE_NAME);
}
