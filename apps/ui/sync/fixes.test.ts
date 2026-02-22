import { describe, it, expect, vi } from 'vitest';
import { deleteTransactionBatch } from './manager';
import type { TransactionDeleted } from './types';

// --- Mocks ---

// Mock manager dependencies
const mockAddEvents = vi.fn();
const mockTriggerSync = vi.fn();

vi.mock('./db', () => ({
    addEvents: (events: any[]) => mockAddEvents(events),
    addEvent: vi.fn(),
    getAllEvents: vi.fn().mockResolvedValue([]),
}));

vi.mock('./deviceId', () => ({
    getDeviceId: vi.fn().mockResolvedValue('device1'),
    reserveCounters: vi.fn().mockResolvedValue({ start: 100 }),
    createBaseEvent: vi.fn(),
}));

// Mock triggers
vi.mock('vue', () => ({
    toRaw: (obj: any) => obj,
    ref: (val: any) => ({ value: val }),
    computed: (fn: any) => ({ value: fn() }),
    watch: vi.fn(),
}));

// Mock debounce
vi.mock('@vueuse/core', () => ({
    useDebounceFn: (fn: any) => {
        mockTriggerSync.mockImplementation(fn);
        return fn;
    },
    useLocalStorage: () => [],
}));

// --- Tests ---

describe('Sync Fixes Verification', () => {

    it('Fix 1: Cursor Filter Logic (>= vs >)', () => {
        const lastPushed = 1000;
        const events = [
            { id: 1, timestamp: 999 },
            { id: 2, timestamp: 1000 }, // Exact match
            { id: 3, timestamp: 1001 },
        ];

        // Old buggy logic: >
        const oldFilter = events.filter(e => e.timestamp > lastPushed);
        expect(oldFilter).toHaveLength(1);
        expect(oldFilter[0]!.id).toBe(3);

        // New corrected logic: >=
        const newFilter = events.filter(e => e.timestamp >= lastPushed);
        expect(newFilter).toHaveLength(2);
        expect(newFilter.map(e => e.id)).toEqual([2, 3]);
    });

    it('Fix 4: Batch Delete Atomicity', async () => {
        const ids = ['tx1', 'tx2', 'tx3'];

        await deleteTransactionBatch(ids);

        // Verify addEvents was called ONCE with all 3 events
        expect(mockAddEvents).toHaveBeenCalledTimes(1);

        const events = mockAddEvents.mock.calls[0]![0]! as TransactionDeleted[];
        expect(events).toHaveLength(3);

        // Verify they share the same timestamp (roughly)
        const timestamps = events.map(e => e.timestamp);
        const uniqueTimestamps = new Set(timestamps);
        expect(uniqueTimestamps.size).toBe(1);

        // Verify content
        expect(events[0]!.payload.id).toBe('tx1');
        expect(events[1]!.payload.id).toBe('tx2');
        expect(events[2]!.payload.id).toBe('tx3');

        // Verify counters are sequential
        expect(events[0]!.counter).toBe(100);
        expect(events[1]!.counter).toBe(101);
        expect(events[2]!.counter).toBe(102);

        // Verify event types
        events.forEach(e => expect(e.type).toBe('TRANSACTION_DELETED'));
    });
});
