import { openDB, type IDBPDatabase } from 'idb';
import { uid } from 'uid';
import type {
  Account,
  AppEvent,
  AppState,
  Assert,
  PersistedCategory,
  PersistedProject,
  Transaction,
} from './types';

const DB_NAME = 'vaulttrack-v2-db';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDB(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('events')) {
          const store = db.createObjectStore('events', { keyPath: 'eventId' });
          store.createIndex('by-timestamp', 'timestamp');
        }
        if (!db.objectStoreNames.contains('meta')) {
          db.createObjectStore('meta', { keyPath: 'key' });
        }
      },
    });
  }
  return dbPromise;
}

export function createEmptyState(): AppState {
  return {
    accounts: {},
    transactions: {},
    categories: {},
    projects: {},
    asserts: {},
  };
}

export function applyEventMutable(state: AppState, event: AppEvent): void {
  const p = event.payload;
  if (!p) return;

  switch (event.type) {
    case 'TRANSACTION_ADDED':
    case 'TRANSACTION_UPDATED':
      if (p.id) state.transactions[p.id] = p;
      break;
    case 'TRANSACTION_DELETED':
      if (p.id) delete state.transactions[p.id];
      break;
    case 'ACCOUNT_CREATED':
    case 'ACCOUNT_UPDATED':
      if (p.id) state.accounts[p.id] = p;
      break;
    case 'ACCOUNT_DELETED':
      if (p.id) delete state.accounts[p.id];
      break;
    case 'ACCOUNT_REORDERED':
      if (Array.isArray(p)) {
        for (const item of p) {
          if (item?.accountId && state.accounts[item.accountId]) {
            state.accounts[item.accountId]!.order = item.order;
          }
        }
      }
      break;
    case 'CATEGORY_CREATED':
    case 'CATEGORY_UPDATED':
      if (p.id) state.categories[p.id] = p;
      break;
    case 'CATEGORY_DELETED':
      if (p.id) delete state.categories[p.id];
      break;
    case 'PROJECT_CREATED':
    case 'PROJECT_UPDATED':
      if (p.id) state.projects[p.id] = p;
      break;
    case 'PROJECT_DELETED':
      if (p.id) delete state.projects[p.id];
      break;
    case 'ASSERT_CREATED':
    case 'ASSERT_UPDATED':
      if (p.id) state.asserts[p.id] = p;
      break;
    case 'ASSERT_DELETED':
      if (p.id) delete state.asserts[p.id];
      break;
  }
}

export async function deriveGroupId(mnemonic: string): Promise<string> {
  const enc = new TextEncoder();
  const data = enc.encode(mnemonic.trim());
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function hashEntityId(entityId: string): Promise<string> {
  const enc = new TextEncoder();
  const data = enc.encode(String(entityId));
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('').substring(0, 16);
}

export async function getDeviceId(): Promise<string> {
  const db = await getDB();
  const existing = await db.get('meta', 'deviceId');
  if (existing?.value) return existing.value as string;
  const newId = `web-${uid(8)}`;
  await db.put('meta', { key: 'deviceId', value: newId });
  return newId;
}

async function reserveCounters(count: number): Promise<number> {
  const db = await getDB();
  const existing = await db.get('meta', 'counter');
  const start = (existing?.value ? Number(existing.value) : 0) + 1;
  await db.put('meta', { key: 'counter', value: start + count - 1 });
  return start;
}

export async function saveSnapshotCache(state: AppState): Promise<void> {
  const db = await getDB();
  // Strip any proxy wrapper
  const raw = JSON.parse(JSON.stringify(state));
  await db.put('meta', { key: 'snapshot', value: raw });
}

export async function loadInitialState(): Promise<{ state: AppState; eventCount: number }> {
  const db = await getDB();
  const cached = await db.get('meta', 'snapshot');
  const eventCount = await db.count('events');

  if (cached?.value && Object.keys(cached.value.accounts || {}).length > 0) {
    return { state: cached.value as AppState, eventCount };
  }

  if (eventCount > 0) {
    const allEvents = (await db.getAll('events')) as AppEvent[];
    allEvents.sort((a, b) => a.timestamp - b.timestamp || a.counter - b.counter);
    const state = createEmptyState();
    for (const ev of allEvents) {
      applyEventMutable(state, ev);
    }
    await saveSnapshotCache(state);
    return { state, eventCount };
  }

  return { state: createEmptyState(), eventCount: 0 };
}

export async function recordEvents(
  currentState: AppState,
  items: Array<{ type: AppEvent['type']; payload: any }>,
): Promise<{ nextState: AppState; events: AppEvent[] }> {
  if (items.length === 0) return { nextState: currentState, events: [] };

  const deviceId = await getDeviceId();
  const startCounter = await reserveCounters(items.length);
  const timestamp = Date.now();

  const events: AppEvent[] = items.map((item, idx) => ({
    eventId: `${deviceId}:${startCounter + idx}:${uid(6)}`,
    deviceId,
    counter: startCounter + idx,
    timestamp,
    type: item.type,
    payload: JSON.parse(JSON.stringify(item.payload)),
  }));

  const db = await getDB();
  const tx = db.transaction('events', 'readwrite');
  for (const ev of events) {
    tx.store.put(ev);
  }
  await tx.done;

  for (const ev of events) {
    applyEventMutable(currentState, ev);
  }

  await saveSnapshotCache(currentState);
  return { nextState: currentState, events };
}

export async function importBackupIntoLocalDB(backup: {
  accounts?: Account[];
  transactions?: Transaction[];
  categories?: PersistedCategory[];
  projects?: PersistedProject[];
  asserts?: Assert[];
}): Promise<{ state: AppState; eventCount: number }> {
  const deviceId = await getDeviceId();
  const accounts = backup.accounts || [];
  const transactions = backup.transactions || [];
  const categories = backup.categories || [];
  const projects = backup.projects || [];
  const asserts = backup.asserts || [];

  // Extract projects from transaction categories if projects array is empty
  const projectSet = new Set<string>(projects.map((p) => p.project));
  for (const t of transactions) {
    if (t.category && t.category.includes('/')) {
      const proj = t.category.split('/')[1];
      if (proj) projectSet.add(proj);
    }
  }
  const mergedProjects: PersistedProject[] =
    projects.length > 0
      ? projects
      : Array.from(projectSet).map((p) => ({ id: uid(11), project: p }));

  const total =
    accounts.length +
    transactions.length +
    categories.length +
    mergedProjects.length +
    asserts.length;

  const startCounter = await reserveCounters(total);
  let counter = startCounter;
  const timestamp = Date.now();
  const events: AppEvent[] = [];

  for (const item of accounts) {
    const h = await hashEntityId(item.id);
    events.push({
      eventId: `${deviceId}:migration:acc:${h}`,
      deviceId,
      counter: counter++,
      timestamp,
      type: 'ACCOUNT_CREATED',
      payload: item,
    });
  }

  for (const item of transactions) {
    const h = await hashEntityId(item.id);
    events.push({
      eventId: `${deviceId}:migration:tx:${h}`,
      deviceId,
      counter: counter++,
      timestamp,
      type: 'TRANSACTION_ADDED',
      payload: item,
    });
  }

  for (const item of categories) {
    const h = await hashEntityId(item.id);
    events.push({
      eventId: `${deviceId}:migration:cat:${h}`,
      deviceId,
      counter: counter++,
      timestamp,
      type: 'CATEGORY_CREATED',
      payload: item,
    });
  }

  for (const item of mergedProjects) {
    const h = await hashEntityId(item.id);
    events.push({
      eventId: `${deviceId}:migration:proj:${h}`,
      deviceId,
      counter: counter++,
      timestamp,
      type: 'PROJECT_CREATED',
      payload: item,
    });
  }

  for (const item of asserts) {
    const h = await hashEntityId(item.id);
    events.push({
      eventId: `${deviceId}:migration:assert:${h}`,
      deviceId,
      counter: counter++,
      timestamp,
      type: 'ASSERT_CREATED',
      payload: item,
    });
  }

  const db = await getDB();
  const tx = db.transaction('events', 'readwrite');
  for (const ev of events) {
    tx.store.put(ev);
  }
  await tx.done;

  const state = createEmptyState();
  for (const ev of events) {
    applyEventMutable(state, ev);
  }
  await saveSnapshotCache(state);

  const count = await db.count('events');
  return { state, eventCount: count };
}

export async function clearAllLocalData(): Promise<AppState> {
  const db = await getDB();
  await db.clear('events');
  await db.delete('meta', 'snapshot');
  await db.delete('meta', 'lastPushedTimestamp');
  await db.delete('meta', 'lastServerTimestamp');
  return createEmptyState();
}

/**
 * Fast first sync: the backend materializes every transaction into SQL tables,
 * so a fresh browser can load the whole state in one request instead of pulling
 * the entire event log page by page.
 */
export async function bootstrapFromSnapshot(
  backendUrl: string,
  groupId: string,
): Promise<{ state: AppState; timestamp: number } | null> {
  const db = await getDB();
  const response = await fetch(`${backendUrl}/sync/snapshot`, {
    headers: { 'X-Sync-Group-ID': groupId },
  });
  if (!response.ok) return null;

  const snapshot = await response.json();
  const state: AppState = {
    accounts: Object.fromEntries(
      ((snapshot.accounts || []) as Account[]).map((item) => [item.id, item]),
    ),
    transactions: Object.fromEntries(
      ((snapshot.transactions || []) as Transaction[]).map((item) => [item.id, item]),
    ),
    categories: Object.fromEntries(
      ((snapshot.categories || []) as PersistedCategory[]).map((item) => [item.id, item]),
    ),
    projects: Object.fromEntries(
      ((snapshot.projects || []) as PersistedProject[]).map((item) => [item.id, item]),
    ),
    asserts: Object.fromEntries(
      ((snapshot.asserts || []) as Assert[]).map((item) => [item.id, item]),
    ),
  };

  const timestamp = Number(snapshot.timestamp || Date.now());
  await saveSnapshotCache(state);
  await db.put('meta', { key: 'lastServerTimestamp', value: timestamp });
  return { state, timestamp };
}

/** Page size of `/sync/pull` on the backend. */
const PULL_PAGE = 2000;

function parseRemoteEvent(raw: any): AppEvent | null {
  if (typeof raw.payload !== 'string' || !raw.payload.trim().startsWith('{')) return null;
  try {
    const parsed = JSON.parse(raw.payload);
    if (!parsed || !parsed.type || parsed.payload === undefined) return null;
    return {
      eventId: raw.eventId,
      deviceId: raw.deviceId || parsed.deviceId,
      counter: Number(raw.counter ?? parsed.counter ?? 0),
      timestamp: Number(raw.timestamp ?? parsed.timestamp ?? Date.now()),
      type: parsed.type,
      payload: parsed.payload,
    };
  } catch {
    return null; // malformed
  }
}

export async function syncWithBackend(
  backendUrl: string,
  groupId: string,
  currentState: AppState,
  wait = false,
): Promise<{ state: AppState; pushed: number; pulled: number; eventCount: number }> {
  const db = await getDB();
  const lastPushedMeta = await db.get('meta', 'lastPushedTimestamp');
  const lastServerMeta = await db.get('meta', 'lastServerTimestamp');

  const lastPushed = Number(lastPushedMeta?.value || 0);
  let lastServer = Number(lastServerMeta?.value || 0);
  let pulled = 0;

  const allLocalEvents = (await db.getAll('events')) as AppEvent[];
  const toPush = allLocalEvents.filter((e) => e.timestamp > lastPushed);

  // Fresh device: bootstrap from the materialized SQL snapshot in one request
  // instead of paging through the entire event log.
  if (lastServer === 0 && allLocalEvents.length === 0) {
    const boot = await bootstrapFromSnapshot(backendUrl, groupId);
    if (boot) {
      currentState = boot.state;
      lastServer = boot.timestamp;
      pulled += Object.keys(boot.state.transactions).length;
    }
  }

  let pushed = 0;
  if (toPush.length > 0) {
    // Push in chunks of 1000 events
    const CHUNK = 1000;
    let allOk = true;
    for (let i = 0; i < toPush.length; i += CHUNK) {
      const slice = toPush.slice(i, i + CHUNK).map((e) => ({
        eventId: e.eventId,
        deviceId: e.deviceId,
        counter: e.counter,
        timestamp: e.timestamp,
        type: e.type,
        payload: JSON.stringify(e),
      }));

      const res = await fetch(`${backendUrl}/sync/push`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Sync-Group-ID': groupId,
        },
        body: JSON.stringify({ events: slice }),
      });

      if (!res.ok) {
        allOk = false;
        throw new Error(`Sync push failed: ${res.status} ${res.statusText}`);
      }
      pushed += slice.length;
    }

    if (allOk) {
      const maxPushedTs = Math.max(...toPush.map((e) => e.timestamp));
      await db.put('meta', { key: 'lastPushedTimestamp', value: maxPushedTs });
    }
  }

  // Pull new events from backend. The server returns at most PULL_PAGE events per request, so keep pulling until
  // a page comes back short; `since` is inclusive, so events already seen are skipped by id.
  const localIds = new Set(allLocalEvents.map((e) => e.eventId));
  const newRemoteEvents: AppEvent[] = [];
  let maxRemoteTs = lastServer;

  for (let page = 0; ; page++) {
    const since = maxRemoteTs;
    const waitParam = wait && page === 0 ? '&wait=true' : '';
    const pullRes = await fetch(`${backendUrl}/sync/pull?since=${since}${waitParam}`, {
      headers: { 'X-Sync-Group-ID': groupId },
    });

    if (!pullRes.ok) {
      throw new Error(`Sync pull failed: ${pullRes.status} ${pullRes.statusText}`);
    }

    const pullData = (await pullRes.json()) as { events: any[] };
    const events = pullData.events || [];
    for (const raw of events) {
      if (typeof raw.timestamp === 'number' && raw.timestamp > maxRemoteTs) {
        maxRemoteTs = raw.timestamp;
      }
      const ev = parseRemoteEvent(raw);
      if (!ev || localIds.has(ev.eventId)) continue;
      localIds.add(ev.eventId);
      newRemoteEvents.push(ev);
    }

    // A short page is the last one; a full page that did not move the timestamp (more than a page of events with
    // one timestamp) cannot be paged by `since`, so stop instead of asking for the same page forever.
    if (events.length < PULL_PAGE || maxRemoteTs === since) break;
  }

  if (newRemoteEvents.length > 0) {
    const tx = db.transaction('events', 'readwrite');
    for (const ev of newRemoteEvents) {
      tx.store.put(ev);
      applyEventMutable(currentState, ev);
    }
    await tx.done;
    await saveSnapshotCache(currentState);
  }

  if (maxRemoteTs > lastServer) {
    await db.put('meta', { key: 'lastServerTimestamp', value: maxRemoteTs });
  }

  pulled += newRemoteEvents.length;
  const totalEvents = await db.count('events');
  return {
    state: currentState,
    pushed,
    pulled,
    eventCount: totalEvents,
  };
}
