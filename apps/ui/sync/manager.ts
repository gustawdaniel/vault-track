import { uid } from 'uid';
import type { Transaction } from '~/store/transaction.model';
import type { Account } from '~/store/account';
import type { PersistedCategory } from '~/store/category';
import type { PersistedProject } from '~/store/project';
import { createBaseEvent, reserveCounters, getDeviceId } from './deviceId';
import { addEvent, addEvents, getAllEvents } from './db';
import { sortEvents } from './ordering';
import { replay } from './reducer';
import type { AppEvent, AppState, TransactionAdded, TransactionUpdated, TransactionDeleted, AccountCreated, AccountUpdated, AccountDeleted, AccountReordered, CategoryCreated, CategoryUpdated, CategoryDeleted, ProjectCreated, ProjectUpdated, ProjectDeleted } from './types';
import { useDebounceFn } from '@vueuse/core';

let debouncedSync: (() => void) | null = null;

export function setDebouncedSync(fn: () => void) {
    debouncedSync = useDebounceFn(fn, 500);
}

function triggerSync() {
    if (debouncedSync) debouncedSync();
}

// Cache current state in memory? 
// For now, to be strictly correct per prompt "replays reducer", we will replay.
// In production, we would cache the state and only apply the new event if we are sure we are at the head,
// but for "Offline Sync" robustness, replaying is safer initially.

export async function getAppState(): Promise<AppState> {
    const events = await getAllEvents();
    const sorted = sortEvents(events);
    return replay(sorted);
}

// --- Transactions ---

export async function createTransaction(payload: Transaction & { id: string }): Promise<AppState> {
    const base = await createBaseEvent();
    const event: TransactionAdded = {
        ...base,
        type: 'TRANSACTION_ADDED',
        payload
    };
    await addEvent(event);
    triggerSync();
    return getAppState();
}

export async function updateTransaction(payload: Transaction & { id: string }): Promise<AppState> {
    const base = await createBaseEvent();
    const event: TransactionUpdated = {
        ...base,
        type: 'TRANSACTION_UPDATED',
        payload
    };
    await addEvent(event);
    triggerSync();
    return getAppState();
}

export async function deleteTransaction(id: string): Promise<AppState> {
    const base = await createBaseEvent();
    const event: TransactionDeleted = {
        ...base,
        type: 'TRANSACTION_DELETED',
        payload: { id }
    };
    await addEvent(event);
    triggerSync();
    return getAppState();
}

// --- Accounts ---

export async function createAccount(payload: Account): Promise<AppState> {
    const base = await createBaseEvent();
    const event: AccountCreated = {
        ...base,
        type: 'ACCOUNT_CREATED',
        payload
    };
    await addEvent(event);
    triggerSync();
    return getAppState();
}

export async function updateAccount(payload: Account): Promise<AppState> {
    const base = await createBaseEvent();
    const event: AccountUpdated = {
        ...base,
        type: 'ACCOUNT_UPDATED',
        payload
    };
    await addEvent(event);
    triggerSync();
    return getAppState();
}

export async function deleteAccount(id: string): Promise<AppState> {
    const base = await createBaseEvent();
    const event: AccountDeleted = {
        ...base,
        type: 'ACCOUNT_DELETED',
        payload: { id }
    };
    await addEvent(event);
    triggerSync();
    return getAppState();
}

export async function reorderAccounts(payload: { accountId: string; order: number }[]): Promise<AppState> {
    const base = await createBaseEvent();
    const event: AccountReordered = {
        ...base,
        type: 'ACCOUNT_REORDERED',
        payload
    };
    await addEvent(event);
    triggerSync();
    return getAppState();
}

// --- Categories ---

export async function createCategory(payload: PersistedCategory): Promise<AppState> {
    const base = await createBaseEvent();
    const event: CategoryCreated = {
        ...base,
        type: 'CATEGORY_CREATED',
        payload
    };
    await addEvent(event);
    triggerSync();
    return getAppState();
}

export async function updateCategory(payload: PersistedCategory): Promise<AppState> {
    const base = await createBaseEvent();
    const event: CategoryUpdated = {
        ...base,
        type: 'CATEGORY_UPDATED',
        payload
    };
    await addEvent(event);
    triggerSync();
    return getAppState();
}

export async function deleteCategory(id: string): Promise<AppState> {
    const base = await createBaseEvent();
    const event: CategoryDeleted = {
        ...base,
        type: 'CATEGORY_DELETED',
        payload: { id }
    };
    await addEvent(event);
    triggerSync();
    return getAppState();
}

// --- Projects ---

export async function createProject(payload: PersistedProject): Promise<AppState> {
    const base = await createBaseEvent();
    const event: ProjectCreated = {
        ...base,
        type: 'PROJECT_CREATED',
        payload
    };
    await addEvent(event);
    triggerSync();
    return getAppState();
}

export async function updateProject(payload: PersistedProject): Promise<AppState> {
    const base = await createBaseEvent();
    const event: ProjectUpdated = {
        ...base,
        type: 'PROJECT_UPDATED',
        payload
    };
    await addEvent(event);
    triggerSync();
    return getAppState();
}

export async function deleteProject(id: string): Promise<AppState> {
    const base = await createBaseEvent();
    const event: ProjectDeleted = {
        ...base,
        type: 'PROJECT_DELETED',
        payload: { id }
    };
    await addEvent(event);
    triggerSync();
    return getAppState();
}

export async function importLocalData(data: {
    accounts: Account[],
    transactions: (Transaction & { id: string })[],
    categories: PersistedCategory[],
    projects: PersistedProject[]
}): Promise<AppState> {
    const totalEvents = data.accounts.length + data.transactions.length + data.categories.length + data.projects.length;
    if (totalEvents === 0) return getAppState();

    const deviceId = await getDeviceId();
    const { start } = await reserveCounters(totalEvents);
    let counter = start;

    const events: AppEvent[] = [];
    const timestamp = Date.now();

    // Accounts
    for (const item of data.accounts) {
        events.push({
            eventId: `${deviceId}:${counter}:${uid(8)}`,
            deviceId,
            counter: counter++,
            timestamp,
            type: 'ACCOUNT_CREATED',
            payload: item
        });
    }

    // Transactions
    for (const item of data.transactions) {
        events.push({
            eventId: `${deviceId}:${counter}:${uid(8)}`,
            deviceId,
            counter: counter++,
            timestamp,
            type: 'TRANSACTION_ADDED',
            payload: item
        });
    }

    // Categories
    for (const item of data.categories) {
        events.push({
            eventId: `${deviceId}:${counter}:${uid(8)}`,
            deviceId,
            counter: counter++,
            timestamp,
            type: 'CATEGORY_CREATED',
            payload: item
        });
    }

    // Projects
    for (const item of data.projects) {
        events.push({
            eventId: `${deviceId}:${counter}:${uid(8)}`,
            deviceId,
            counter: counter++,
            timestamp,
            type: 'PROJECT_CREATED',
            payload: item
        });
    }

    await addEvents(events);
    triggerSync(); // Trigger sync after import too
    return getAppState();
}
