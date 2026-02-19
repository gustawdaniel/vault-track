import { uid } from 'uid';
import type { Transaction } from '~/store/transaction.model';
import type { Account } from '~/store/account';
import type { PersistedCategory } from '~/store/category';
import type { PersistedProject } from '~/store/project';
import type { Assert } from '~/store/assert.model';
import { createBaseEvent, reserveCounters, getDeviceId } from './deviceId';
import { addEvent, addEvents, getAllEvents } from './db';
import { sortEvents } from './ordering';
import { replay, reduceEvent } from './reducer';
import type { AppEvent, AppState, TransactionAdded, TransactionUpdated, TransactionDeleted, AccountCreated, AccountUpdated, AccountDeleted, AccountReordered, CategoryCreated, CategoryUpdated, CategoryDeleted, ProjectCreated, ProjectUpdated, ProjectDeleted, AssertCreated, AssertUpdated, AssertDeleted } from './types';
import { useDebounceFn } from '@vueuse/core';
import { hashEntityId } from './crypto';
import { toRaw } from 'vue';

let debouncedSync: (() => void) | null = null;

export function setDebouncedSync(fn: () => void) {
    debouncedSync = useDebounceFn(fn, 500);
}

function triggerSync() {
    if (debouncedSync) debouncedSync();
}

// Cache current state in memory
let latestAppState: AppState | null = null;

// Export for cache invalidation (e.g. from client.ts on merge)
export function invalidateAppState() {
    latestAppState = null;
}

export async function getAppState(): Promise<AppState> {
    if (latestAppState) {
        return latestAppState;
    }

    const events = await getAllEvents();
    const sorted = sortEvents(events);
    latestAppState = replay(sorted);
    return latestAppState;
}

// Helper to apply event incrementally and update cache
async function applyEvent(event: AppEvent): Promise<AppState> {
    await addEvent(event);

    // Incrementally update cache if possible
    if (latestAppState) {
        latestAppState = reduceEvent(latestAppState, event);
    } else {
        // If no cache, built it (lazy)
        await getAppState();
    }

    triggerSync();
    return latestAppState!;
}

// --- Transactions ---

export async function createTransaction(payload: Transaction & { id: string }): Promise<AppState> {
    const base = await createBaseEvent();
    const event: TransactionAdded = {
        ...base,
        type: 'TRANSACTION_ADDED',
        payload: toRaw(payload)
    };
    return applyEvent(event);
}

export async function createTransactionBatch(payloads: (Transaction & { id: string })[]): Promise<AppState> {
    if (payloads.length === 0) return getAppState();

    const deviceId = await getDeviceId();
    const { start } = await reserveCounters(payloads.length);
    const timestamp = Date.now();

    const events: TransactionAdded[] = payloads.map((payload, i) => ({
        eventId: `${deviceId}:${start + i}:${uid(8)}`,
        deviceId,
        counter: start + i,
        timestamp,
        type: 'TRANSACTION_ADDED' as const,
        payload: toRaw(payload),
    }));

    await addEvents(events);

    // Batch apply to cache
    if (latestAppState) {
        for (const event of events) {
            latestAppState = reduceEvent(latestAppState, event);
        }
    } else {
        await getAppState();
    }

    triggerSync();
    return latestAppState!;
}

export async function updateTransaction(payload: Transaction & { id: string }): Promise<AppState> {
    const base = await createBaseEvent();
    const event: TransactionUpdated = {
        ...base,
        type: 'TRANSACTION_UPDATED',
        payload: toRaw(payload)
    };
    return applyEvent(event);
}

export async function deleteTransaction(id: string): Promise<AppState> {
    const base = await createBaseEvent();
    const event: TransactionDeleted = {
        ...base,
        type: 'TRANSACTION_DELETED',
        payload: { id }
    };
    return applyEvent(event);
}

export async function deleteTransactionBatch(ids: string[]): Promise<AppState> {
    if (ids.length === 0) return getAppState();

    const deviceId = await getDeviceId();
    const { start } = await reserveCounters(ids.length);
    const timestamp = Date.now();

    const events: TransactionDeleted[] = ids.map((id, i) => ({
        eventId: `${deviceId}:${start + i}:${uid(8)}`,
        deviceId,
        counter: start + i,
        timestamp,
        type: 'TRANSACTION_DELETED' as const,
        payload: { id },
    }));

    await addEvents(events);

    if (latestAppState) {
        for (const event of events) {
            latestAppState = reduceEvent(latestAppState, event);
        }
    } else {
        await getAppState();
    }

    triggerSync();
    return latestAppState!;
}

// --- Accounts ---

export async function createAccount(payload: Account): Promise<AppState> {
    const base = await createBaseEvent();
    const event: AccountCreated = {
        ...base,
        type: 'ACCOUNT_CREATED',
        payload: toRaw(payload)
    };
    return applyEvent(event);
}

export async function updateAccount(payload: Account): Promise<AppState> {
    const base = await createBaseEvent();
    const event: AccountUpdated = {
        ...base,
        type: 'ACCOUNT_UPDATED',
        payload: toRaw(payload)
    };
    return applyEvent(event);
}

export async function deleteAccount(id: string): Promise<AppState> {
    const base = await createBaseEvent();
    const event: AccountDeleted = {
        ...base,
        type: 'ACCOUNT_DELETED',
        payload: { id }
    };
    return applyEvent(event);
}

export async function reorderAccounts(payload: { accountId: string; order: number }[]): Promise<AppState> {
    const base = await createBaseEvent();
    const event: AccountReordered = {
        ...base,
        type: 'ACCOUNT_REORDERED',
        payload
    };
    return applyEvent(event);
}

// --- Categories ---

export async function createCategory(payload: PersistedCategory): Promise<AppState> {
    const base = await createBaseEvent();
    const event: CategoryCreated = {
        ...base,
        type: 'CATEGORY_CREATED',
        payload: toRaw(payload)
    };
    return applyEvent(event);
}

export async function updateCategory(payload: PersistedCategory): Promise<AppState> {
    const base = await createBaseEvent();
    const event: CategoryUpdated = {
        ...base,
        type: 'CATEGORY_UPDATED',
        payload: toRaw(payload)
    };
    return applyEvent(event);
}

export async function deleteCategory(id: string): Promise<AppState> {
    const base = await createBaseEvent();
    const event: CategoryDeleted = {
        ...base,
        type: 'CATEGORY_DELETED',
        payload: { id }
    };
    return applyEvent(event);
}

// --- Projects ---

export async function createProject(payload: PersistedProject): Promise<AppState> {
    const base = await createBaseEvent();
    const event: ProjectCreated = {
        ...base,
        type: 'PROJECT_CREATED',
        payload: toRaw(payload)
    };
    return applyEvent(event);
}

export async function updateProject(payload: PersistedProject): Promise<AppState> {
    const base = await createBaseEvent();
    const event: ProjectUpdated = {
        ...base,
        type: 'PROJECT_UPDATED',
        payload: toRaw(payload)
    };
    return applyEvent(event);
}

export async function deleteProject(id: string): Promise<AppState> {
    const base = await createBaseEvent();
    const event: ProjectDeleted = {
        ...base,
        type: 'PROJECT_DELETED',
        payload: { id }
    };
    return applyEvent(event);
}

// --- Asserts ---

export async function createAssert(payload: Assert): Promise<AppState> {
    const base = await createBaseEvent();
    const event: AssertCreated = {
        ...base,
        type: 'ASSERT_CREATED',
        payload: toRaw(payload)
    };
    return applyEvent(event);
}

export async function updateAssert(payload: Assert): Promise<AppState> {
    const base = await createBaseEvent();
    const event: AssertUpdated = {
        ...base,
        type: 'ASSERT_UPDATED',
        payload: toRaw(payload)
    };
    return applyEvent(event);
}

export async function deleteAssert(id: string): Promise<AppState> {
    const base = await createBaseEvent();
    const event: AssertDeleted = {
        ...base,
        type: 'ASSERT_DELETED',
        payload: { id }
    };
    return applyEvent(event);
}

export async function importLocalData(data: {
    accounts: Account[],
    transactions: (Transaction & { id: string })[],
    categories: PersistedCategory[],
    projects: PersistedProject[],
    asserts?: Assert[]
}): Promise<AppState> {
    const totalEvents = data.accounts.length + data.transactions.length + data.categories.length + data.projects.length + (data.asserts?.length ?? 0);
    if (totalEvents === 0) return getAppState();

    const deviceId = await getDeviceId();
    const { start } = await reserveCounters(totalEvents);
    let counter = start;

    const events: AppEvent[] = [];
    const timestamp = Date.now();

    // Accounts
    for (const item of data.accounts) {
        const hashedId = await hashEntityId(item.id);
        const eventId = `${deviceId}:migration:${hashedId}`;
        console.log(`[Migration] Creating account event: ${eventId}`);
        events.push({
            eventId,
            deviceId,
            counter: counter++,
            timestamp,
            type: 'ACCOUNT_CREATED',
            payload: item
        });
    }

    // Transactions
    for (const item of data.transactions) {
        const hashedId = await hashEntityId(item.id);
        const eventId = `${deviceId}:migration:${hashedId}`;
        console.log(`[Migration] Creating transaction event: ${eventId}`);
        events.push({
            eventId,
            deviceId,
            counter: counter++,
            timestamp,
            type: 'TRANSACTION_ADDED',
            payload: item
        });
    }

    // Categories
    for (const item of data.categories) {
        const hashedId = await hashEntityId(item.id);
        const eventId = `${deviceId}:migration:${hashedId}`;
        console.log(`[Migration] Creating category event: ${eventId}`);
        events.push({
            eventId,
            deviceId,
            counter: counter++,
            timestamp,
            type: 'CATEGORY_CREATED',
            payload: item
        });
    }

    // Projects
    for (const item of data.projects) {
        const hashedId = await hashEntityId(item.id);
        const eventId = `${deviceId}:migration:${hashedId}`;
        console.log(`[Migration] Creating project event: ${eventId}`);
        events.push({
            eventId,
            deviceId,
            counter: counter++,
            timestamp,
            type: 'PROJECT_CREATED',
            payload: item
        });
    }

    // Asserts
    if (data.asserts) {
        for (const item of data.asserts) {
            const hashedId = await hashEntityId(item.id);
            const eventId = `${deviceId}:migration:${hashedId}`;
            console.log(`[Migration] Creating assert event: ${eventId}`);
            events.push({
                eventId,
                deviceId,
                counter: counter++,
                timestamp,
                type: 'ASSERT_CREATED',
                payload: item
            });
        }
    }

    console.log(`[Migration] Generated ${events.length} events, attempting to add to local DB...`);

    await addEvents(events);
    console.log(`[Migration] Successfully added ${events.length} events to local DB`);
    // triggerSync(); // Don't auto-trigger - migration caller will handle sync explicitly
    return getAppState();
}
