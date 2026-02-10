import { describe, it, expect, vi, beforeEach } from 'vitest';
import { updateCategory } from '~/sync/manager';
import { reactive, toRaw } from 'vue';
import { PersistedCategory } from '~/store/category';

// Mock dependencies
vi.mock('~/sync/deviceId', () => ({
    createBaseEvent: () => Promise.resolve({
        eventId: 'test-event-id',
        deviceId: 'test-device',
        counter: 1,
        timestamp: 1234567890
    }),
    reserveCounters: () => Promise.resolve({ start: 1, end: 1 }),
    getDeviceId: () => Promise.resolve('test-device'),
}));

vi.mock('~/sync/ordering', () => ({
    sortEvents: (events: any[]) => events,
}));

vi.mock('~/sync/reducer', () => ({
    replay: (events: any[]) => ({
        accounts: [], transactions: [], categories: [], projects: []
    }),
}));

// We want to SPY on addEvent to see what it receives
const addEventMock = vi.fn();
vi.mock('~/sync/db', () => ({
    addEvent: (event: any) => addEventMock(event),
    getAllEvents: () => Promise.resolve([]),
}));

vi.mock('@vueuse/core', () => ({
    useDebounceFn: (fn: any) => fn,
}));

vi.mock('~/sync/crypto', () => ({
    hashEntityId: (id: string) => Promise.resolve(`hashed-${id}`),
}));

describe('manager.ts DataCloneError protection', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should unwrap reactive proxies before passing to addEvent in updateCategory', async () => {
        console.log('Starting test...');
        const category: PersistedCategory = {
            id: 'cat-123',
            category: 'Food',
            color: '#ffffff',
            order: 1
        };

        // Create a reactive proxy (like Pinia state)
        const proxyCategory = reactive(category);

        // Ensure it IS a proxy
        expect(proxyCategory).not.toBe(toRaw(proxyCategory));

        // Use the manager function
        await updateCategory(proxyCategory);

        // Verify addEvent was called
        expect(addEventMock).toHaveBeenCalledTimes(1);
        const event = addEventMock.mock.calls[0][0];

        // The key assertion: The payload in the event should NOT be a proxy
        // It should match the raw object
        expect(event.payload).toEqual(category);

        // This check confirms strict equality with the raw object, meaning it was unwrapped
        // OR a copy was made. toRaw returns the original object. 
        // If we used JSON.parse(JSON.stringify), it would be a NEW object.
        // My implementation uses toRaw.
        // Let's check if it is NOT a proxy.
        const isProxy = (obj: any) => {
            // A rudimentary check if we can't use isProxy from vue in test env easily without more setup?
            // Actually, strictly comparing to the raw object is best if toRaw was used.
            // But if we used copy, it won't be strictly equal.
            // Let's just check if it is "DataClone-safe" - i.e. simple object.
            return obj !== toRaw(obj);
        };

        // If the code works with toRaw, event.payload should be the raw object.
        // If I passed the proxy, event.payload WOULD be the proxy.
        // So checking strict inequality with proxy is good.
        expect(event.payload).not.toBe(proxyCategory);
    });
});
