import type { AppEvent, AppState } from './types';

export const initialAppState: AppState = {
    transactions: {},
    accounts: {},
    categories: {},
    projects: {},
};

export function reduceEvent(state: AppState, event: AppEvent): AppState {
    // Create shallow copy of state for immutability (in a real Redux app we'd be more careful / use Immer)
    // For now, spread operators are fine for this scale
    const nextState: AppState = {
        transactions: { ...state.transactions },
        accounts: { ...state.accounts },
        categories: { ...state.categories },
        projects: { ...state.projects },
    };

    switch (event.type) {
        case 'TRANSACTION_ADDED':
        case 'TRANSACTION_UPDATED':
            nextState.transactions[event.payload.id] = event.payload;
            break;

        case 'TRANSACTION_DELETED':
            delete nextState.transactions[event.payload.id];
            break;

        case 'ACCOUNT_CREATED':
        case 'ACCOUNT_UPDATED':
            nextState.accounts[event.payload.id] = event.payload;
            break;

        case 'ACCOUNT_DELETED':
            delete nextState.accounts[event.payload.id];
            break;

        case 'ACCOUNT_REORDERED':
            // Update order field for each account in payload
            event.payload.forEach(({ accountId, order }) => {
                if (nextState.accounts[accountId]) {
                    nextState.accounts[accountId] = {
                        ...nextState.accounts[accountId],
                        order
                    };
                }
            });
            break;

        case 'CATEGORY_CREATED':
        case 'CATEGORY_UPDATED':
            nextState.categories[event.payload.id] = event.payload;
            break;

        case 'CATEGORY_DELETED':
            delete nextState.categories[event.payload.id];
            break;

        case 'PROJECT_CREATED':
        case 'PROJECT_UPDATED':
            nextState.projects[event.payload.id] = event.payload;
            break;

        case 'PROJECT_DELETED':
            delete nextState.projects[event.payload.id];
            break;

        default:
            // Unknown event type, ignore safely
            break;
    }

    return nextState;
}


export function replay(events: AppEvent[]): AppState {
    return events.reduce(reduceEvent, initialAppState);
}
