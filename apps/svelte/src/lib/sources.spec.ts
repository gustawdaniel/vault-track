import { describe, expect, it } from 'vitest';
import { sourcesOf } from './sources';

describe('transaction sources', () => {
  it('reads them from the row, or derives them from its external id', () => {
    const base = { id: 'a', account: 'A', accountId: 'a', amount: -1, date: '2026-10-29' };
    expect(sourcesOf(base)[0]!.kind).toBe('manual');
    expect(sourcesOf({ ...base, externalId: 'enablebanking:bank-millennium:id:X' })[0]).toMatchObject({ kind: 'bank-api', source: 'enablebanking:bank-millennium' });
    expect(sourcesOf({ ...base, externalId: 'revolut-csv:fp:1' })[0]!.kind).toBe('csv');
    const both = [{ kind: 'manual' as const, at: 't' }, { kind: 'bank-api' as const, id: 'enablebanking:x:id:1', at: 't2' }];
    expect(sourcesOf({ ...base, sources: both })).toEqual(both);
  });
});
