import { describe, it, expect, beforeEach, vi } from 'vitest';
import { clearLocalStorage } from '~/components/backup/clearLocalStorage';
import { useLocalStorage } from '@vueuse/core';
import { nextTick } from 'vue';

// Mock dependencies
vi.mock('~/sync/db', () => ({
    clearEvents: vi.fn(),
}));

vi.mock('~/sync/meta', () => ({
    clearMeta: vi.fn(),
}));

describe('clearLocalStorage', () => {
    beforeEach(() => {
        // Clear mocks and localStorage before each test
        vi.clearAllMocks();
        localStorage.clear();
    });

    it('should remove sync keys from localStorage', async () => {
        // Setup initial state
        localStorage.setItem('ocm-sync-group-id', 'test-group-id');
        localStorage.setItem('ocm-mnemonic', 'test-mnemonic-phrase');

        // Also set some pinia/vueuse related data
        const accountState = useLocalStorage('account', []);
        accountState.value = [{ id: '1', name: 'Test' }];
        await nextTick();

        expect(localStorage.getItem('ocm-sync-group-id')).toBe('test-group-id');
        expect(localStorage.getItem('ocm-mnemonic')).toBe('test-mnemonic-phrase');
        expect(localStorage.getItem('account')).toBeDefined();

        // Execution
        await clearLocalStorage();

        // Verification
        expect(localStorage.getItem('ocm-sync-group-id')).toBeNull();
        expect(localStorage.getItem('ocm-mnemonic')).toBeNull();

        // Check that pinia stores are cleared (set to empty array)
        // Note: useLocalStorage with [] defaults puts "[]" in localStorage
        const accountRaw = localStorage.getItem('account');
        expect(accountRaw).toBe('[]');
    });
});
