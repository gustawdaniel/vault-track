import type { Transaction } from '~/store/transaction';
import type { Account } from '~/store/account';
import type { PersistedCategory } from '~/store/category';
import type { PersistedProject } from '~/store/project';

export interface BaseEvent {
    eventId: string;
    deviceId: string;
    counter: number; // Monotonic per-device counter
    timestamp: number;
}

// --- Transaction Events ---

export interface TransactionAdded extends BaseEvent {
    type: 'TRANSACTION_ADDED';
    payload: Transaction & { id: string };
}

export interface TransactionUpdated extends BaseEvent {
    type: 'TRANSACTION_UPDATED';
    payload: Transaction & { id: string };
}

export interface TransactionDeleted extends BaseEvent {
    type: 'TRANSACTION_DELETED';
    payload: { id: string };
}

// --- Account Events ---

export interface AccountCreated extends BaseEvent {
    type: 'ACCOUNT_CREATED';
    payload: Account;
}

export interface AccountUpdated extends BaseEvent {
    type: 'ACCOUNT_UPDATED';
    payload: Account;
}

export interface AccountDeleted extends BaseEvent {
    type: 'ACCOUNT_DELETED';
    payload: { id: string };
}

export interface AccountReordered extends BaseEvent {
    type: 'ACCOUNT_REORDERED';
    payload: { accountId: string; order: number }[];
}

// --- Category Events ---

export interface CategoryCreated extends BaseEvent {
    type: 'CATEGORY_CREATED';
    payload: PersistedCategory;
}

export interface CategoryUpdated extends BaseEvent {
    type: 'CATEGORY_UPDATED';
    payload: PersistedCategory;
}

export interface CategoryDeleted extends BaseEvent {
    type: 'CATEGORY_DELETED';
    payload: { id: string };
}

// --- Project Events ---

export interface ProjectCreated extends BaseEvent {
    type: 'PROJECT_CREATED';
    payload: PersistedProject;
}

export interface ProjectUpdated extends BaseEvent {
    type: 'PROJECT_UPDATED';
    payload: PersistedProject;
}

export interface ProjectDeleted extends BaseEvent {
    type: 'PROJECT_DELETED';
    payload: { id: string };
}


export type AppEvent =
    | TransactionAdded
    | TransactionUpdated
    | TransactionDeleted
    | AccountCreated
    | AccountUpdated
    | AccountDeleted
    | AccountDeleted
    | AccountReordered
    | CategoryCreated
    | CategoryUpdated
    | CategoryDeleted
    | ProjectCreated
    | ProjectUpdated
    | ProjectDeleted;

export interface AppState {
    transactions: Record<string, Transaction & { id: string }>;
    accounts: Record<string, Account>;
    categories: Record<string, PersistedCategory>;
    projects: Record<string, PersistedProject>;
}
