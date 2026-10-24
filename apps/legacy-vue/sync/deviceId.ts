import { uid } from 'uid';
import type { BaseEvent } from './types';
import { getMetaDB, META_STORE } from './meta';

const DEVICE_ID_KEY = 'device_id';
const COUNTER_KEY = 'device_counter';

export async function getDeviceId(): Promise<string> {
    const db = await getMetaDB();
    let deviceId = await db.get(META_STORE, DEVICE_ID_KEY) as string | undefined;
    if (!deviceId) {
        deviceId = uid(16);
        await db.put(META_STORE, deviceId, DEVICE_ID_KEY);
    }

    return deviceId;
}

export async function getNextCounter(): Promise<number> {
    const db = await getMetaDB();
    const tx = db.transaction(META_STORE, 'readwrite');
    const store = tx.objectStore(META_STORE);

    let counter = (await store.get(COUNTER_KEY)) as number | undefined;
    if (typeof counter !== 'number') {
        counter = 0;
    }

    const next = counter + 1;
    await store.put(next, COUNTER_KEY);
    await tx.done;

    return next;
}

export async function reserveCounters(count: number): Promise<{ start: number; end: number }> {
    const db = await getMetaDB();
    const tx = db.transaction(META_STORE, 'readwrite');
    const store = tx.objectStore(META_STORE);

    let current = (await store.get(COUNTER_KEY)) as number | undefined;
    if (typeof current !== 'number') {
        current = 0;
    }

    const start = current + 1;
    const end = current + count;

    await store.put(end, COUNTER_KEY);
    await tx.done;

    return { start, end };
}



export async function createBaseEvent(): Promise<Omit<BaseEvent, 'type'>> {
    const deviceId = await getDeviceId();
    const counter = await getNextCounter();

    return {
        eventId: `${deviceId}:${counter}:${uid(8)}`, // Collision-resistant globally unique ID
        deviceId,
        counter,
        timestamp: Date.now(),
    };
}
