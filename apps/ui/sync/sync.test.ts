import { describe, it, expect } from 'vitest';
import { initialAppState, reduceEvent, replay } from './reducer';
import { sortEvents } from './ordering';
import { mergeRemoteEvents } from './merger';
import type { AppEvent, TransactionAdded } from './types';

// Mock Events helper
function createMockEvent(deviceId: string, counter: number, timestamp: number, id: string): TransactionAdded {
    return {
        eventId: `${deviceId}:${counter}:mock`,
        deviceId,
        counter,
        timestamp,
        type: 'TRANSACTION_ADDED',
        payload: {
            id,
            account: 'Test',
            accountId: 'acc1',
            amount: 100,
            date: '2023-01-01',
        }
    };
}

describe('Offline Sync Simulation', () => {
    it('should deterministically sort events from multiple devices', () => {
        const eventsA = [
            createMockEvent('A', 1, 100, 'tx1'),
            createMockEvent('A', 2, 200, 'tx2'),
        ];
        const eventsB = [
            createMockEvent('B', 1, 150, 'tx3'), // Happened between A1 and A2
        ];

        const all = [...eventsA, ...eventsB];
        const sorted = sortEvents(all);

        expect(sorted.map(e => (e as TransactionAdded).payload.id)).toEqual(['tx1', 'tx3', 'tx2']);
    });

    it('should produce identical state regardless of receive order', () => {
        const event1 = createMockEvent('A', 1, 100, 'tx1');
        const event2 = createMockEvent('B', 1, 150, 'tx2');
        const event3 = createMockEvent('A', 2, 200, 'tx3');

        // Order 1: Received 1, then 2, then 3
        const log1 = [event1, event2, event3];
        const state1 = replay(sortEvents(log1));

        // Order 2: Received 3, then 2, then 1 (e.g. out of order network or sync)
        const log2 = [event3, event2, event1];
        const state2 = replay(sortEvents(log2));

        expect(state1).toEqual(state2);
        expect(Object.keys(state1.transactions)).toHaveLength(3);
    });

    it('should merged remote events correctly', () => {
        const localLog: AppEvent[] = [
            createMockEvent('A', 1, 100, 'tx1'),
        ];

        const remoteLog: AppEvent[] = [
            createMockEvent('A', 1, 100, 'tx1'), // Duplicate
            createMockEvent('B', 1, 150, 'tx2'), // New
        ];

        const merged = mergeRemoteEvents(localLog, remoteLog);

        expect(merged).toHaveLength(2);
        expect(merged.find(e => (e as TransactionAdded).payload.id === 'tx2')).toBeDefined();
    });

    it('should handle Category and Project events', () => {
        const events: AppEvent[] = [
            {
                eventId: 'A:1:cat',
                deviceId: 'A',
                counter: 1,
                timestamp: 100,
                type: 'CATEGORY_CREATED',
                payload: { id: 'cat1', category: 'Food', order: 0, color: 'red' }
            },
            {
                eventId: 'A:2:proj',
                deviceId: 'A',
                counter: 2,
                timestamp: 200,
                type: 'PROJECT_CREATED',
                payload: { id: 'proj1', project: 'Renovation' }
            }
        ];

        const state = replay(events);

        expect(Object.keys(state.categories)).toHaveLength(1);
        expect(state.categories['cat1']?.category).toBe('Food');
        expect(Object.keys(state.projects)).toHaveLength(1);
        expect(state.projects['proj1']?.project).toBe('Renovation');
    });
});
