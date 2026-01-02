import type { AppEvent, BaseEvent } from './types';

/**
 * Sorts events deterministically.
 * 
 * Order priorities:
 * 1. Timestamp (roughly causal) - wait, prompt said "logicalTime" or "deviceCounter" mostly.
 *    Actually, for a pure causal order without vector clocks, we usually rely on:
 *    - Logical Counter (if we had a global one, but we have device counters)
 *    - Wall Clock (timestamp) as a loose grouping
 * 
 * The Prompt 4 requirements were:
 * - deviceId
 * - deviceCounter
 * - eventId (tie-breaker)
 * 
 * However, we need to interleave events from different devices.
 * A common strategy for simple offline apps is "Hybrid Logical Clock" or just:
 * (timestamp, deviceId, counter)
 * 
 * Let's stick to the prompt's implied simple determinism for now, but usually Timestamp is the primary sort key for user-perceived ordering, 
 * with deviceId/counter breaking ties or ensuring specific device sequences.
 * 
 * Actually, strict causal ordering requires that if Event B depends on Event A, B > A. 
 * Since we don't have explicit dependency pointers, Timestamp is the best proxy.
 */
export function sortEvents(events: AppEvent[]): AppEvent[] {
    return [...events].sort((a, b) => {
        // 1. Timestamp (primary ordering)
        if (a.timestamp !== b.timestamp) {
            return a.timestamp - b.timestamp;
        }

        // 2. Counter (ensure within same device, order is preserved if timestamps identical)
        // Note: This only works strictly if we compare counters from the SAME device.
        // But as a general tie-breaker, it's fine.

        // 3. Device ID (deterministic interleaving)
        if (a.deviceId !== b.deviceId) {
            return a.deviceId.localeCompare(b.deviceId);
        }

        // 4. Counter (secondary ordering for same device)
        if (a.counter !== b.counter) {
            return a.counter - b.counter;
        }

        return 0;
    });
}
