<script lang="ts">
  // Everything stored about one transaction, folded away at the bottom of its drawer: ids, dates, sources,
  // linked rows, the raw bank data and the event history from the server. For looking, not for editing.
  import { SOURCE_LABEL, sourcesOf } from './sources';
  import type { Transaction } from './types';

  let {
    tx,
    transactions,
    backendUrl,
    groupId,
    onOpen,
  }: {
    tx: Transaction;
    transactions: Transaction[];
    backendUrl: string;
    groupId: string;
    onOpen: (tx: Transaction) => void;
  } = $props();

  type HistoryEvent = { eventId: string; deviceId: string; timestamp: number; type: string; payload: any };

  let open = $state(false);
  let history = $state<HistoryEvent[] | null>(null);
  let historyError = $state('');
  let historyFor = '';
  let copied = $state('');

  const splitSiblings = $derived(tx.splitId ? transactions.filter((t) => t.splitId === tx.splitId && t.id !== tx.id) : []);
  const transferPair = $derived(tx.transferHash ? transactions.filter((t) => t.transferHash === tx.transferHash && t.id !== tx.id) : []);
  const fields = $derived<Array<[string, unknown]>>([
    ['id', tx.id],
    ['externalId', tx.externalId],
    ['accountId', tx.accountId],
    ['date', tx.date],
    ['executedAt', tx.executedAt],
    ['executedAtPrecision', tx.executedAtPrecision],
    ['executedAtSource', tx.executedAtSource],
    ['bookingDate', tx.bookingDate === null ? 'null (not booked)' : tx.bookingDate],
    ['clearedStatus', tx.clearedStatus],
    ['category', tx.category],
    ['splitId', tx.splitId],
    ['transferHash', tx.transferHash],
    ['hash', tx.hash],
  ]);

  $effect(() => {
    if (!open || historyFor === tx.id) return;
    historyFor = tx.id;
    history = null;
    historyError = '';
    if (!groupId) {
      historyError = 'no sync group';
      return;
    }
    fetch(`${backendUrl}/sync/history?id=${encodeURIComponent(tx.id)}`, { headers: { 'X-Sync-Group-ID': groupId } })
      .then(async (response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        history = (await response.json()).events;
      })
      .catch((error) => (historyError = String(error?.message ?? error)));
  });

  async function copy(label: string, value: unknown) {
    try {
      await navigator.clipboard.writeText(typeof value === 'string' ? value : JSON.stringify(value, null, 2));
      copied = label;
      setTimeout(() => (copied === label ? (copied = '') : null), 1200);
    } catch {
      copied = '';
    }
  }

  const time = (ms: number) => new Date(ms).toLocaleString('sv-SE').slice(0, 19);
  // what an update changed compared with the event before it
  function changes(index: number): string {
    const events = history ?? [];
    const event = events[index];
    if (!event || event.type !== 'TRANSACTION_UPDATED') return '';
    const before = events.slice(0, index).reverse().find((e) => e.payload && e.type !== 'TRANSACTION_DELETED')?.payload;
    if (!before || !event.payload) return '';
    const keys = new Set([...Object.keys(before), ...Object.keys(event.payload)]);
    return [...keys]
      .filter((k) => JSON.stringify(before[k]) !== JSON.stringify(event.payload[k]))
      .map((k) => (typeof event.payload[k] === 'object' && event.payload[k] !== null ? k : `${k}: ${JSON.stringify(before[k] ?? null)} → ${JSON.stringify(event.payload[k] ?? null)}`))
      .join(', ');
  }
</script>

<details class="tx-details" bind:open>
  <summary>Szczegóły techniczne</summary>

  <table class="kv">
    <tbody>
      {#each fields as [key, value] (key)}
        {#if value !== undefined && value !== ''}
          <tr>
            <th>{key}</th>
            <td><button type="button" class="val" title="Kopiuj" onclick={() => copy(key, value)}>{String(value)}</button>{#if copied === key}<span class="ok">skopiowano</span>{/if}</td>
          </tr>
        {/if}
      {/each}
    </tbody>
  </table>

  <h4>Źródła</h4>
  <ul class="list">
    {#each sourcesOf(tx) as src, i (i)}
      <li>
        <b>{SOURCE_LABEL[src.kind]}</b> <span class="mono">{src.kind}</span>
        {#if src.at}<span class="muted">{time(Date.parse(src.at))}</span>{/if}
        {#if src.id}<div class="mono small">{src.id}</div>{/if}
        {#if src.amount !== undefined || src.payee}<div class="muted small">{[src.date, src.amount, src.payee].filter((v) => v !== undefined && v !== '').join(' · ')}</div>{/if}
        {#if !tx.sources?.length}<div class="muted small">wyliczone z externalId (wiersz sprzed listy źródeł)</div>{/if}
        {#if src.raw}
          <details class="raw"><summary class="small">dane źródła</summary><pre>{JSON.stringify(src.raw, null, 2)}</pre></details>
        {/if}
      </li>
    {/each}
  </ul>

  {#if splitSiblings.length || transferPair.length}
    <h4>Powiązane</h4>
    <ul class="list">
      {#each splitSiblings as t (t.id)}
        <li><button type="button" class="link" onclick={() => onOpen(t)}>podział · {t.payee || '—'} · {t.amount}</button> <span class="mono small">{t.id}</span></li>
      {/each}
      {#each transferPair as t (t.id)}
        <li><button type="button" class="link" onclick={() => onOpen(t)}>transfer · {t.account} · {t.amount}</button> <span class="mono small">{t.id}</span></li>
      {/each}
    </ul>
  {/if}

  {#if tx.rawSource}
    <h4>Dane źródłowe (rawSource) <button type="button" class="link" onclick={() => copy('raw', tx.rawSource)}>kopiuj</button>{#if copied === 'raw'}<span class="ok">skopiowano</span>{/if}</h4>
    <pre>{JSON.stringify(tx.rawSource, null, 2)}</pre>
  {/if}

  <h4>Historia zdarzeń</h4>
  {#if historyError}
    <p class="muted small">Nie udało się pobrać: {historyError}</p>
  {:else if !history}
    <p class="muted small">Ładowanie…</p>
  {:else if !history.length}
    <p class="muted small">Brak zdarzeń na serwerze.</p>
  {:else}
    <ul class="list">
      {#each history as event, i (event.eventId)}
        <li>
          <span class="mono small">{time(event.timestamp)}</span> <b>{event.type.replace('TRANSACTION_', '').toLowerCase()}</b>
          <span class="mono small muted">{event.deviceId}</span>
          {#if changes(i)}<div class="small">{changes(i)}</div>{/if}
        </li>
      {/each}
    </ul>
  {/if}

  <h4>Cały rekord (JSON) <button type="button" class="link" onclick={() => copy('json', tx)}>kopiuj</button>{#if copied === 'json'}<span class="ok">skopiowano</span>{/if}</h4>
  <pre>{JSON.stringify(tx, null, 2)}</pre>
</details>

<style>
  .tx-details {
    margin-top: 12px;
    border-top: 1px solid var(--border-subtle);
    padding-top: 8px;
    font-size: 12px;
    color: var(--text-secondary);
  }
  summary {
    cursor: pointer;
    color: var(--text-muted);
    user-select: none;
  }
  h4 {
    margin: 12px 0 4px;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--text-muted);
  }
  .kv {
    width: 100%;
    margin-top: 8px;
    border-collapse: collapse;
  }
  .kv th {
    width: 1%;
    padding: 2px 10px 2px 0;
    text-align: left;
    font-weight: 500;
    white-space: nowrap;
    color: var(--text-muted);
  }
  .kv td {
    padding: 2px 0;
    word-break: break-all;
  }
  .val {
    all: unset;
    cursor: copy;
    font-family: var(--font-mono);
    color: var(--text-primary);
  }
  .val:hover {
    color: var(--accent-primary);
  }
  .list {
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .list li {
    padding: 3px 0;
    border-bottom: 1px solid var(--border-subtle);
  }
  .mono {
    font-family: var(--font-mono);
    word-break: break-all;
  }
  .small {
    font-size: 11px;
  }
  .muted {
    color: var(--text-muted);
  }
  .ok {
    margin-left: 6px;
    color: var(--income);
  }
  .link {
    all: unset;
    cursor: pointer;
    color: var(--accent-primary);
    text-transform: none;
    letter-spacing: normal;
  }
  .raw summary {
    color: var(--accent-primary);
  }
  pre {
    max-height: 260px;
    overflow: auto;
    margin: 0;
    padding: 8px;
    border-radius: 6px;
    background: var(--bg-elevated);
    font-family: var(--font-mono);
    font-size: 11px;
    color: var(--text-primary);
    white-space: pre-wrap;
    word-break: break-all;
  }
</style>
