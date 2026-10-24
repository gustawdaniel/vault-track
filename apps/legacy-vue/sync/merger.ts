import type { AppEvent } from './types';
import { sortEvents } from './ordering';

/**
 * Merges remote events into the local event log.
 * 
 * Guarantees:
 * - Deduplication by eventId
 * - Deterministic ordering
 * - Append-only semantics (conceptually, though we re-sort here for the reducer)
 */
export function mergeRemoteEvents(
    localEvents: AppEvent[],
    remoteEvents: AppEvent[]
): AppEvent[] {
    // 1. Create a Map of existing events by ID for O(1) lookups
    const eventMap = new Map<string, AppEvent>();

    for (const event of localEvents) {
        eventMap.set(event.eventId, event);
    }

    // 2. Add remote events if they don't exist
    let hasNewEvents = false;
    for (const event of remoteEvents) {
        if (!eventMap.has(event.eventId)) {
            // Validate metadata structure if needed? 
            // For now assume type safety was handled at boundary.
            eventMap.set(event.eventId, event);
            hasNewEvents = true;
        }
    }

    // If no new events, return original array to save processing
    if (!hasNewEvents) return localEvents;

    // 3. Convert back to array
    const allEvents = Array.from(eventMap.values());

    // 4. Sort deterministically
    return sortEvents(allEvents);
}
