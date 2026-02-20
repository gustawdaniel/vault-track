import type { AppEvent, AppState } from './types';

export const initialAppState: AppState = {
    transactions: {},
    accounts: {},
    categories: {},
    projects: {},
    asserts: {},
};

export function reduceEvent(state: AppState, event: AppEvent): AppState {
    // Backward compatibility wrapper using mutable reducer
    // Clone state first (expensive O(N), but preserves immutability contract for legacy callers)
    const nextState: AppState = {
        transactions: { ...state.transactions },
        accounts: { ...state.accounts },
        categories: { ...state.categories },
        projects: { ...state.projects },
        asserts: { ...state.asserts },
    };
    reduceEventMutable(nextState, event);
    return nextState;
}

export function reduceEventMutable(state: AppState, event: AppEvent): void {
    switch (event.type) {
        case 'TRANSACTION_ADDED':
        case 'TRANSACTION_UPDATED':
            state.transactions[event.payload.id] = event.payload;
            break;

        case 'TRANSACTION_DELETED':
            delete state.transactions[event.payload.id];
            break;

        case 'ACCOUNT_CREATED':
        case 'ACCOUNT_UPDATED':
            state.accounts[event.payload.id] = event.payload;
            break;

        case 'ACCOUNT_DELETED':
            delete state.accounts[event.payload.id];
            break;

        case 'ACCOUNT_REORDERED':
            // Update order field for each account in payload
            event.payload.forEach(({ accountId, order }) => {
                if (state.accounts[accountId]) {
                    state.accounts[accountId].order = order;
                }
            });
            break;

        case 'CATEGORY_CREATED':
        case 'CATEGORY_UPDATED':
            state.categories[event.payload.id] = event.payload;
            break;

        case 'CATEGORY_DELETED':
            delete state.categories[event.payload.id];
            break;

        case 'PROJECT_CREATED':
        case 'PROJECT_UPDATED':
            state.projects[event.payload.id] = event.payload;
            break;

        case 'PROJECT_DELETED':
            delete state.projects[event.payload.id];
            break;

        case 'ASSERT_CREATED':
        case 'ASSERT_UPDATED':
            state.asserts[event.payload.id] = event.payload;
            break;

        case 'ASSERT_DELETED':
            delete state.asserts[event.payload.id];
            break;

        default:
            // Unknown event type, ignore safely
            break;
    }
}

export function replay(events: AppEvent[]): AppState {
    const state = JSON.parse(JSON.stringify(initialAppState));
    for (const event of events) {
        reduceEventMutable(state, event);
    }
    return state;
}

export async function replayAsync(events: AppEvent[]): Promise<AppState> {
    const state: AppState = JSON.parse(JSON.stringify(initialAppState));
    const CHUNK_SIZE = 500; // Process 500 events per tick

    for (let i = 0; i < events.length; i++) {
        const event = events[i];
        if (!event) continue;
        reduceEventMutable(state, event);

        // Yield to main thread every CHUNK_SIZE events
        if (i > 0 && i % CHUNK_SIZE === 0) {
            await new Promise(resolve => setTimeout(resolve, 0));
        }
    }

    return state;
}
