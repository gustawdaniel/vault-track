
import { defineStore } from 'pinia';
import { type RemovableRef, useLocalStorage } from '@vueuse/core';
import { uid } from 'uid';
import { AssertModel, type Assert } from '~/store/assert.model';
import { createAssert as syncCreateAssert, updateAssert as syncUpdateAssert, deleteAssert as syncDeleteAssert } from '~/sync/manager';

interface State {
    asserts: RemovableRef<Assert[]>;
}

export const useAssertStore = defineStore('assert', {
    state: (): State => ({
        asserts: useLocalStorage<Assert[]>('assert', []),
    }),
    actions: {
        create(assert: Omit<Assert, 'id'>) {
            const id = uid();
            const newAssert = { ...assert, id };
            this.asserts.push(newAssert);
            syncCreateAssert(newAssert);
        },
        update(id: string, assert: Partial<Assert>) {
            const index = this.asserts.findIndex((a) => a.id === id);
            if (index !== -1) {
                const updated = { ...this.asserts[index], ...assert } as Assert;
                this.asserts.splice(index, 1, updated);
                syncUpdateAssert(updated);
            }
        },
        delete(id: string) {
            const index = this.asserts.findIndex((a) => a.id === id);
            if (index !== -1) {
                this.asserts.splice(index, 1);
                syncDeleteAssert(id);
            }
        },
        getByAccountId(accountId: string) {
            return this.asserts.filter((a) => a.accountId === accountId);
        },
        getById(id: string) {
            return this.asserts.find((a) => a.id === id);
        }
    },
});
