<script lang="ts">
  import { onMount } from 'svelte';
  import { uid } from 'uid';
  import QRCode from 'qrcode';
  import {
    ALL_CURRENCIES,
    type Account,
    type AccountType,
    type AppState,
    type Assert,
    type Currency,
    type FailingAssert,
    type LedgerFilter,
    type PersistedCategory,
    type PersistedProject,
    type Transaction,
  } from './lib/types';
  import {
    buildLedgerTimeline,
    computeAccountsAndReconciliation,
    formatMoney,
    getCurrencyDigits,
    parseCategoryAndProject,
    roundCurrency,
  } from './lib/engine';
  import {
    clearAllLocalData,
    createEmptyState,
    deriveGroupId,
    getDeviceId,
    importBackupIntoLocalDB,
    loadInitialState,
    recordEvents,
    syncWithBackend,
  } from './lib/sync';

  // --- Core Reactive State (Svelte 5 Runes) ---
  let appState = $state<AppState>(createEmptyState());
  let eventCount = $state(0);
  let loading = $state(true);
  let statusNotice = $state<string | null>(null);

  // Navigation: 'ledger' | 'analytics' | 'sync'
  let activeTab = $state<'ledger' | 'analytics' | 'sync'>('ledger');
  let theme = $state<'light' | 'dark'>('light');
  let urlReady = $state(false);

  function toggleTheme() {
    theme = theme === 'light' ? 'dark' : 'light';
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', theme);
    }
    localStorage.setItem('ocm-theme', theme);
  }

  // --- Deep links: /?tab=sync&account=...&currency=BTC ---
  function readUrlState() {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);

    const tab = params.get('tab');
    activeTab = tab === 'ledger' || tab === 'analytics' || tab === 'sync'
      ? tab
      : 'ledger';

    const currency = params.get('currency');
    baseCurrency = currency && (ALL_CURRENCIES as readonly string[]).includes(currency)
      ? (currency as Currency)
      : 'PLN';

    filter.accountId = params.get('account') || '';
    filter.search = params.get('q') || '';
    filter.category = params.get('category') || '';
    filter.project = params.get('project') || '';
    filter.dateFrom = params.get('from') || '';
    filter.dateTo = params.get('to') || '';

    const type = params.get('type');
    filter.type =
      type === 'expense' ||
      type === 'income' ||
      type === 'transfer' ||
      type === 'uncategorized'
        ? type
        : 'all';
  }

  function writeUrlState() {
    if (typeof window === 'undefined' || !urlReady) return;
    const params = new URLSearchParams(window.location.search);
    params.set('tab', activeTab);
    if (filter.accountId) params.set('account', filter.accountId); else params.delete('account');
    if (baseCurrency !== 'PLN') params.set('currency', baseCurrency); else params.delete('currency');
    if (filter.search) params.set('q', filter.search); else params.delete('q');
    if (filter.category) params.set('category', filter.category); else params.delete('category');
    if (filter.project) params.set('project', filter.project); else params.delete('project');
    if (filter.type !== 'all') params.set('type', filter.type); else params.delete('type');
    if (filter.dateFrom) params.set('from', filter.dateFrom); else params.delete('from');
    if (filter.dateTo) params.set('to', filter.dateTo); else params.delete('to');

    const next = `${window.location.pathname}?${params.toString()}`;
    const current = `${window.location.pathname}${window.location.search}`;
    if (next !== current) {
      history.replaceState({}, '', next);
    }
  }

  function setActiveTab(tab: 'ledger' | 'analytics' | 'sync') {
    activeTab = tab;
    if (typeof window === 'undefined' || !urlReady) return;
    const params = new URLSearchParams(window.location.search);
    params.set('tab', tab);
    history.pushState({}, '', `${window.location.pathname}?${params.toString()}`);
  }

  // Base currency & exchange rates (1 USD = X Currency)
  let baseCurrency = $state<Currency>('PLN');
  let usdRates = $state<Record<string, number>>({
    USD: 1,
    PLN: 3.98,
    EUR: 0.92,
    GBP: 0.79,
    GEL: 2.72,
    THB: 34.5,
    JPY: 152.0,
    SGD: 1.34,
    MYR: 4.42,
    PHP: 57.8,
    TND: 3.11,
    TWD: 32.1,
    BTC: 0.0000145,
    ETH: 0.00038,
    SOL: 0.0058,
    DOGE: 6.5,
  });

  // Ledger Filters
  let filter = $state<LedgerFilter>({
    accountId: '',
    search: '',
    category: '',
    project: '',
    type: 'all',
    dateFrom: '',
    dateTo: '',
  });
  let visibleRowLimit = $state(250);
  let showHiddenAccounts = $state(false);
  let showAllReconciliationAlerts = $state(false);

  $effect(() => {
    // Track every value that belongs in the URL.
    void activeTab;
    void filter.accountId;
    void filter.search;
    void filter.category;
    void filter.project;
    void filter.type;
    void filter.dateFrom;
    void filter.dateTo;
    void baseCurrency;
    writeUrlState();
  });

  // Slide-over Drawer State: null | 'tx' | 'account' | 'assert'
  let activeDrawer = $state<null | 'tx' | 'account' | 'assert'>(null);

  // Transaction Form State
  let editingTxId = $state<string | null>(null);
  let txFormMode = $state<'expense' | 'income' | 'transfer'>('expense');
  let txFormAccountId = $state('');
  let txFormTargetAccountId = $state('');
  let txFormAmount = $state<number>(0);
  let txFormTargetAmount = $state<number>(0);
  let txFormDate = $state(new Date().toISOString().split('T')[0]!);
  let txFormPayee = $state('');
  let txFormCategory = $state('');
  let txFormProject = $state('');
  let txFormMemo = $state('');
  let txFormCreateCounterpart = $state(true);

  // Account Form State
  let editingAccountId = $state<string | null>(null);
  let accFormName = $state('');
  let accFormType = $state<AccountType>('Bank');
  let accFormCurrency = $state<Currency>('PLN');
  let accFormDescription = $state('');
  let accFormHidden = $state(false);

  // Assert Form State
  let editingAssertId = $state<string | null>(null);
  let assertFormAccountId = $state('');
  let assertFormDate = $state(new Date().toISOString().split('T')[0]!);
  let assertFormValue = $state<number>(0);

  // Bulk Categorization State (in Analytics tab)
  let bulkSearch = $state('');
  let bulkTargetCategory = $state('');
  let bulkTargetProject = $state('');
  let bulkOnlyUncategorized = $state(false);

  // Sync & Pairing State
  let backendUrl = $state(
    typeof window !== 'undefined' && window.location.hostname === 'localhost'
      ? 'http://localhost:4500/api'
      : 'https://api.vaulttrack.org/api'
  );
  let mnemonicInput = $state('');
  let savedMnemonic = $state('');
  let derivedGroupId = $state('');
  let deviceId = $state('');
  let qrDataUrl = $state('');
  let isSyncing = $state(false);
  let lastSyncText = $state<string | null>(null);
  let syncLogs = $state<string[]>([]);
  let connectorStatus = $state<Array<{
    source: string;
    status: string;
    imported: number;
    skipped: number;
    startedAt: number;
    finishedAt: number | null;
    error: string | null;
  }>>([]);
  let connectorStatusError = $state<string | null>(null);

  // --- Derived Computations ---
  let accountsList = $derived(Object.values(appState.accounts));
  let transactionsList = $derived(Object.values(appState.transactions));
  let categoriesList = $derived(
    Object.values(appState.categories).sort(
      (a, b) => (a.order ?? 0) - (b.order ?? 0) || a.category.localeCompare(b.category)
    )
  );
  let projectsList = $derived(
    Object.values(appState.projects).sort((a, b) => a.project.localeCompare(b.project))
  );
  let assertsList = $derived(Object.values(appState.asserts));

  let reconciliation = $derived(
    computeAccountsAndReconciliation(accountsList, transactionsList, assertsList)
  );

  let visibleAccounts = $derived(
    reconciliation.accountsWithMeta.filter((a) => showHiddenAccounts || !a.hidden)
  );

  const CRYPTO_CURRENCIES = new Set(['BTC', 'ETH', 'SOL', 'DOGE']);

  let accountsByType = $derived.by(() => {
    const groups: Record<AccountType, typeof visibleAccounts> = {
      Bank: [],
      Cash: [],
      Invst: [],
      CCard: [],
    };
    for (const acc of visibleAccounts) {
      // Crypto accounts belong to investments even if an old backup says CCard.
      const t: AccountType = CRYPTO_CURRENCIES.has(acc.currency)
        ? 'Invst'
        : (groups[acc.type] ? acc.type : 'Bank');
      groups[t].push(acc);
    }
    return groups;
  });

  function convertCurrency(amount: number, from: string, to: string): number {
    if (from === to) return amount;
    const fromRate = usdRates[from];
    const toRate = usdRates[to];
    if (!fromRate || !toRate) return amount;
    return (amount / fromRate) * toRate;
  }

  let totalNetWorth = $derived.by(() => {
    let sum = 0;
    for (const acc of visibleAccounts) {
      sum += convertCurrency(acc.balance, acc.currency, baseCurrency);
    }
    return roundCurrency(sum, baseCurrency);
  });

  let totalNetWorthPln = $derived.by(() => {
    let sum = 0;
    for (const acc of visibleAccounts) {
      sum += convertCurrency(acc.balance, acc.currency, 'PLN');
    }
    return roundCurrency(sum, 'PLN');
  });

  let timelineItems = $derived(
    buildLedgerTimeline(
      transactionsList,
      assertsList,
      accountsList,
      categoriesList,
      filter,
      reconciliation.runningBalanceByTxId,
      reconciliation.assertStatusById
    )
  );

  let visibleTimeline = $derived(timelineItems.slice(0, visibleRowLimit));

  let filteredSummary = $derived.by(() => {
    let income = 0;
    let expense = 0;
    let txCount = 0;
    const selectedAcc = filter.accountId ? appState.accounts[filter.accountId] : null;
    const summaryCurrency: Currency = selectedAcc ? selectedAcc.currency : baseCurrency;

    for (const item of timelineItems) {
      if (item.kind !== 'transaction') continue;
      txCount++;
      const t = item.tx;
      const val = selectedAcc
        ? t.amount
        : convertCurrency(t.amount, t.currency, summaryCurrency);
      if (!t.isTransfer) {
        if (val > 0) income += val;
        else expense += val;
      }
    }
    return {
      txCount,
      currency: summaryCurrency,
      income: roundCurrency(income, summaryCurrency),
      expense: roundCurrency(expense, summaryCurrency),
      net: roundCurrency(income + expense, summaryCurrency),
    };
  });

  // Analytics Breakdown
  let categoryBreakdown = $derived.by(() => {
    const stats = new Map<
      string,
      { category: string; expense: number; income: number; count: number; color: string }
    >();
    let totalExpense = 0;

    for (const item of timelineItems) {
      if (item.kind !== 'transaction') continue;
      const t = item.tx;
      if (t.isTransfer) continue;
      const catKey = t.categoryName || '(Bez kategorii)';
      const rootCat = catKey.split(':')[0] || catKey;
      const valInBase = convertCurrency(t.amount, t.currency, baseCurrency);

      let entry = stats.get(rootCat);
      if (!entry) {
        entry = {
          category: rootCat,
          expense: 0,
          income: 0,
          count: 0,
          color: t.categoryColor || '#38bdf8',
        };
        stats.set(rootCat, entry);
      }
      entry.count++;
      if (valInBase < 0) {
        entry.expense += Math.abs(valInBase);
        totalExpense += Math.abs(valInBase);
      } else {
        entry.income += valInBase;
      }
    }

    return Array.from(stats.values())
      .map((s) => ({
        ...s,
        share: totalExpense > 0 ? (s.expense / totalExpense) * 100 : 0,
      }))
      .sort((a, b) => b.expense - a.expense || b.income - a.income);
  });

  let bulkMatchingTransactions = $derived.by(() => {
    const q = bulkSearch.trim().toLowerCase();
    if (!q && !bulkOnlyUncategorized) return [];
    return transactionsList.filter((t) => {
      const { categoryName } = parseCategoryAndProject(t.category);
      if (bulkOnlyUncategorized && categoryName !== '') return false;
      if (q) {
        const hay = `${t.payee || ''} ${t.memo || ''} ${t.category || ''} ${t.account}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  });

  // --- Lifecycle & Helpers ---
  function notify(msg: string) {
    statusNotice = msg;
    setTimeout(() => {
      if (statusNotice === msg) statusNotice = null;
    }, 3800);
  }

  function addSyncLog(msg: string) {
    const ts = new Date().toLocaleTimeString('pl-PL');
    syncLogs = [`[${ts}] ${msg}`, ...syncLogs.slice(0, 49)];
  }

  async function refreshConnectorStatus() {
    if (!derivedGroupId) return;
    try {
      const response = await fetch(`${backendUrl}/connectors/status`, {
        headers: { 'x-sync-group-id': derivedGroupId },
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      connectorStatus = data.connectors || [];
      connectorStatusError = null;
    } catch (e: any) {
      connectorStatusError = e.message;
    }
  }

  async function refreshQr(text: string) {
    if (!text) {
      qrDataUrl = '';
      return;
    }
    try {
      qrDataUrl = await QRCode.toDataURL(text, { margin: 1, width: 180 });
    } catch {
      qrDataUrl = '';
    }
  }

  async function fetchLiveExchangeRates() {
    try {
      const res = await fetch(`${backendUrl}/currency/rates?base=USD`, {
        signal: AbortSignal.timeout(3500),
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.rates) {
          usdRates = { ...usdRates, ...data.rates };
        }
      }
    } catch {
      // Keep fallback rates silently
    }
  }

  async function loadLatestBundledBackup() {
    loading = true;
    try {
      const res = await fetch('/backup-latest.json');
      if (!res.ok) throw new Error('Nie znaleziono /backup-latest.json');
      const data = await res.json();
      const imported = await importBackupIntoLocalDB(data);
      appState = imported.state;
      eventCount = imported.eventCount;
      addSyncLog(
        `Załadowano backup-1792270083.json: ${Object.keys(appState.accounts).length} kont, ${Object.keys(appState.transactions).length} transakcji, ${Object.keys(appState.asserts).length} assertów.`
      );
      notify(`Załadowano ${Object.keys(appState.transactions).length} transakcji z backupu`);
    } catch (e: any) {
      notify(`Błąd ładowania backupu: ${e.message}`);
    } finally {
      loading = false;
    }
  }

  onMount(async () => {
    const savedTheme = localStorage.getItem('ocm-theme');
    theme = savedTheme === 'dark' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', theme);

    deviceId = await getDeviceId();
    const storedMnemonic = localStorage.getItem('ocm-mnemonic') || '';
    if (storedMnemonic) {
      mnemonicInput = storedMnemonic;
      savedMnemonic = storedMnemonic;
      derivedGroupId = await deriveGroupId(storedMnemonic);
      localStorage.setItem('ocm-sync-group-id', derivedGroupId);
      await refreshQr(storedMnemonic);
      await refreshConnectorStatus();
    }

    const initial = await loadInitialState();
    appState = initial.state;
    eventCount = initial.eventCount;
    loading = false;

    readUrlState();
    urlReady = true;
    window.addEventListener('popstate', readUrlState);

    fetchLiveExchangeRates();
  });

  // --- Actions: Transactions ---
  function openNewTransactionDrawer() {
    editingTxId = null;
    txFormMode = 'expense';
    const defaultAccId = filter.accountId || visibleAccounts[0]?.id || '';
    txFormAccountId = defaultAccId;
    txFormTargetAccountId =
      visibleAccounts.find((a) => a.id !== defaultAccId)?.id || defaultAccId;
    txFormAmount = 0;
    txFormTargetAmount = 0;
    txFormDate = new Date().toISOString().split('T')[0]!;
    txFormPayee = '';
    txFormCategory = '';
    txFormProject = '';
    txFormMemo = '';
    txFormCreateCounterpart = true;
    activeDrawer = 'tx';
  }

  function openEditTransactionDrawer(tx: Transaction) {
    editingTxId = tx.id;
    txFormAccountId = tx.accountId;
    txFormDate = (tx.date || '').split('T')[0] || '';
    txFormPayee = tx.payee || '';
    txFormMemo = tx.memo || '';

    if (tx.category && tx.category.startsWith('[') && tx.category.includes(']')) {
      txFormMode = 'transfer';
      const match = tx.category.match(/^\[(.*?)\]/);
      const targetName = match ? match[1] : '';
      const targetAcc = accountsList.find((a) => a.name === targetName);
      txFormTargetAccountId = targetAcc?.id || '';
      txFormAmount = Math.abs(tx.amount);
      txFormTargetAmount = Math.abs(tx.amount);
      const [, proj] = tx.category.split('/');
      txFormProject = proj || '';
      txFormCategory = '';
      txFormCreateCounterpart = false;
    } else {
      txFormMode = tx.amount >= 0 ? 'income' : 'expense';
      txFormAmount = Math.abs(tx.amount);
      const { categoryName, projectName } = parseCategoryAndProject(tx.category);
      txFormCategory = categoryName;
      txFormProject = projectName;
    }
    activeDrawer = 'tx';
  }

  async function saveTransactionForm(e: Event) {
    e.preventDefault();
    const sourceAcc = appState.accounts[txFormAccountId];
    if (!sourceAcc) {
      notify('Wybierz konto źródłowe');
      return;
    }

    const absAmount = Math.abs(Number(txFormAmount) || 0);
    const signedAmount =
      txFormMode === 'income' ? absAmount : -absAmount;

    let composedCategory = txFormCategory.trim();
    if (txFormMode === 'transfer') {
      const targetAcc = appState.accounts[txFormTargetAccountId];
      if (!targetAcc) {
        notify('Wybierz konto docelowe transferu');
        return;
      }
      composedCategory = `[${targetAcc.name}]`;
    }
    if (txFormProject.trim()) {
      composedCategory = `${composedCategory}/${txFormProject.trim()}`;
    }

    const txId = editingTxId || uid(11);
    const mainTx: Transaction = {
      id: txId,
      account: sourceAcc.name,
      accountId: sourceAcc.id,
      amount: roundCurrency(signedAmount, sourceAcc.currency),
      date: txFormDate,
      payee: txFormPayee.trim() || undefined,
      category: composedCategory || undefined,
      memo: txFormMemo.trim() || undefined,
    };

    const eventsToEmit: Array<{ type: any; payload: any }> = [
      {
        type: editingTxId ? 'TRANSACTION_UPDATED' : 'TRANSACTION_ADDED',
        payload: mainTx,
      },
    ];

    // If creating a new transfer and counterpart creation is enabled, add the positive inflow on target account
    if (!editingTxId && txFormMode === 'transfer' && txFormCreateCounterpart) {
      const targetAcc = appState.accounts[txFormTargetAccountId];
      if (targetAcc && targetAcc.id !== sourceAcc.id) {
        const inflowAmount =
          txFormTargetAmount > 0 ? Number(txFormTargetAmount) : absAmount;
        let counterCategory = `[${sourceAcc.name}]`;
        if (txFormProject.trim()) {
          counterCategory = `${counterCategory}/${txFormProject.trim()}`;
        }
        const counterTx: Transaction = {
          id: uid(11),
          account: targetAcc.name,
          accountId: targetAcc.id,
          amount: roundCurrency(Math.abs(inflowAmount), targetAcc.currency),
          date: txFormDate,
          payee: txFormPayee.trim() || undefined,
          category: counterCategory,
          memo: txFormMemo.trim() || undefined,
        };
        eventsToEmit.push({
          type: 'TRANSACTION_ADDED',
          payload: counterTx,
        });
      }
    }

    const res = await recordEvents(appState, eventsToEmit);
    appState = { ...res.nextState };
    eventCount += res.events.length;
    activeDrawer = null;
    notify(editingTxId ? 'Zaktualizowano transakcję' : 'Dodano transakcję');
    triggerBackgroundSync();
  }

  async function deleteCurrentTransaction() {
    if (!editingTxId) return;
    const res = await recordEvents(appState, [
      { type: 'TRANSACTION_DELETED', payload: { id: editingTxId } },
    ]);
    appState = { ...res.nextState };
    eventCount += res.events.length;
    activeDrawer = null;
    notify('Usunięto transakcję');
    triggerBackgroundSync();
  }

  // --- Actions: Accounts ---
  function openNewAccountDrawer() {
    editingAccountId = null;
    accFormName = '';
    accFormType = 'Bank';
    accFormCurrency = 'PLN';
    accFormDescription = '';
    accFormHidden = false;
    activeDrawer = 'account';
  }

  function openEditAccountDrawer(acc: Account) {
    editingAccountId = acc.id;
    accFormName = acc.name;
    accFormType = acc.type;
    accFormCurrency = acc.currency;
    accFormDescription = acc.description || '';
    accFormHidden = Boolean(acc.hidden);
    activeDrawer = 'account';
  }

  async function saveAccountForm(e: Event) {
    e.preventDefault();
    if (!accFormName.trim()) return;
    const id = editingAccountId || uid(11);
    const existing = editingAccountId ? appState.accounts[editingAccountId] : undefined;
    const accPayload: Account = {
      id,
      name: accFormName.trim(),
      type: accFormType,
      currency: accFormCurrency,
      description: accFormDescription.trim() || undefined,
      hidden: accFormHidden,
      order: existing?.order ?? accountsList.length,
    };

    const res = await recordEvents(appState, [
      {
        type: editingAccountId ? 'ACCOUNT_UPDATED' : 'ACCOUNT_CREATED',
        payload: accPayload,
      },
    ]);
    appState = { ...res.nextState };
    eventCount += res.events.length;
    activeDrawer = null;
    notify(editingAccountId ? 'Zaktualizowano konto' : 'Utworzono konto');
    triggerBackgroundSync();
  }

  // --- Actions: Balance Asserts & Reconciliation ---
  function openNewAssertDrawer(accountId?: string) {
    editingAssertId = null;
    const targetAccId = accountId || filter.accountId || visibleAccounts[0]?.id || '';
    assertFormAccountId = targetAccId;
    assertFormDate = new Date().toISOString().split('T')[0]!;
    const accMeta = reconciliation.accountsWithMeta.find((a) => a.id === targetAccId);
    assertFormValue = accMeta ? accMeta.balance : 0;
    activeDrawer = 'assert';
  }

  function openEditAssertDrawer(a: Assert) {
    editingAssertId = a.id;
    assertFormAccountId = a.accountId;
    assertFormDate = a.date;
    assertFormValue = a.value;
    activeDrawer = 'assert';
  }

  async function saveAssertForm(e: Event) {
    e.preventDefault();
    if (!assertFormAccountId) return;
    const id = editingAssertId || uid(11);
    const payload: Assert = {
      id,
      accountId: assertFormAccountId,
      date: assertFormDate,
      value: Number(assertFormValue),
      updatedAt: new Date().toISOString(),
    };
    const res = await recordEvents(appState, [
      {
        type: editingAssertId ? 'ASSERT_UPDATED' : 'ASSERT_CREATED',
        payload,
      },
    ]);
    appState = { ...res.nextState };
    eventCount += res.events.length;
    activeDrawer = null;
    notify('Zapisano checkpoint salda (Assert)');
    triggerBackgroundSync();
  }

  async function deleteCurrentAssert() {
    if (!editingAssertId) return;
    const res = await recordEvents(appState, [
      { type: 'ASSERT_DELETED', payload: { id: editingAssertId } },
    ]);
    appState = { ...res.nextState };
    eventCount += res.events.length;
    activeDrawer = null;
    notify('Usunięto Assert');
    triggerBackgroundSync();
  }

  async function autoFixFailingAssert(fail: FailingAssert) {
    const acc = appState.accounts[fail.accountId];
    if (!acc) return;
    const adjustment = roundCurrency(-fail.diff, acc.currency);
    if (Math.abs(adjustment) < 0.005) return;

    const adjTx: Transaction = {
      id: uid(11),
      account: acc.name,
      accountId: acc.id,
      amount: adjustment,
      date: fail.date,
      payee: 'Korekta Salda (Reconciliation)',
      category: 'Korekta',
      memo: `Wyrównanie do assertu ${formatMoney(fail.expected, acc.currency)} (było ${formatMoney(fail.actual, acc.currency)})`,
    };

    const res = await recordEvents(appState, [
      { type: 'TRANSACTION_ADDED', payload: adjTx },
    ]);
    appState = { ...res.nextState };
    eventCount += res.events.length;
    notify(`Dodano korektę ${formatMoney(adjustment, acc.currency)} na koncie ${acc.name}`);
    triggerBackgroundSync();
  }

  // --- Actions: Bulk Categorization ---
  async function applyBulkCategorization() {
    const matches = bulkMatchingTransactions;
    if (matches.length === 0) return;
    if (!bulkTargetCategory.trim() && !bulkTargetProject.trim()) {
      notify('Podaj docelową kategorię lub projekt');
      return;
    }

    const items = matches.map((t) => {
      const existing = parseCategoryAndProject(t.category);
      const nextCat = bulkTargetCategory.trim() || existing.categoryName;
      const nextProj = bulkTargetProject.trim() || existing.projectName;
      const composed = nextProj ? `${nextCat}/${nextProj}` : nextCat;
      return {
        type: 'TRANSACTION_UPDATED' as const,
        payload: {
          ...t,
          category: composed,
        },
      };
    });

    const res = await recordEvents(appState, items);
    appState = { ...res.nextState };
    eventCount += res.events.length;
    notify(`Zaktualizowano kategorię dla ${items.length} transakcji`);
    triggerBackgroundSync();
  }

  // --- Actions: Sync & Backup ---
  async function generateNewMnemonic() {
    const { generateMnemonic } = await import('bip39');
    mnemonicInput = generateMnemonic();
    await refreshQr(mnemonicInput);
  }

  async function savePairingMnemonic() {
    const phrase = mnemonicInput.trim();
    if (!phrase) return;
    localStorage.setItem('ocm-mnemonic', phrase);
    savedMnemonic = phrase;
    derivedGroupId = await deriveGroupId(phrase);
    localStorage.setItem('ocm-sync-group-id', derivedGroupId);
    await refreshQr(phrase);
    addSyncLog(`Zapisano klucz synchronizacji. Group ID: ${derivedGroupId.substring(0, 16)}...`);
    notify('Klucz synchronizacji aktywny');
    await handleManualSync();
  }

  function disconnectSync() {
    localStorage.removeItem('ocm-mnemonic');
    localStorage.removeItem('ocm-sync-group-id');
    savedMnemonic = '';
    derivedGroupId = '';
    mnemonicInput = '';
    qrDataUrl = '';
    connectorStatus = [];
    connectorStatusError = null;
    addSyncLog('Rozłączono synchronizację.');
    notify('Rozłączono synchronizację');
  }

  async function handleManualSync() {
    if (!derivedGroupId || isSyncing) return;
    isSyncing = true;
    try {
      addSyncLog(`Synchronizacja z ${backendUrl}...`);
      const res = await syncWithBackend(backendUrl, derivedGroupId, appState, false);
      appState = { ...res.state };
      eventCount = res.eventCount;
      lastSyncText = new Date().toLocaleTimeString('pl-PL');
      addSyncLog(`Sync OK: wysłano ${res.pushed}, pobrano ${res.pulled} zdarzeń.`);
      notify(`Zsynchronizowano (↑${res.pushed} ↓${res.pulled})`);
      await refreshConnectorStatus();
    } catch (e: any) {
      addSyncLog(`Błąd syncu: ${e.message}`);
      notify(`Błąd syncu: ${e.message}`);
    } finally {
      isSyncing = false;
    }
  }

  let syncTimeout: ReturnType<typeof setTimeout> | null = null;
  function triggerBackgroundSync() {
    if (!derivedGroupId) return;
    if (syncTimeout) clearTimeout(syncTimeout);
    syncTimeout = setTimeout(() => {
      handleManualSync();
    }, 800);
  }

  async function handleBackupFileUpload(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const json = JSON.parse(text);
      const imported = await importBackupIntoLocalDB(json);
      appState = imported.state;
      eventCount = imported.eventCount;
      addSyncLog(`Zaimportowano plik ${file.name} (${eventCount} zdarzeń).`);
      notify(`Zaimportowano ${Object.keys(appState.transactions).length} transakcji`);
      triggerBackgroundSync();
    } catch (e: any) {
      notify(`Błąd importu JSON: ${e.message}`);
    }
  }

  function exportBackupJson() {
    const dump = {
      transactions: Object.values(appState.transactions),
      accounts: Object.values(appState.accounts),
      categories: Object.values(appState.categories),
      projects: Object.values(appState.projects),
      asserts: Object.values(appState.asserts),
    };
    const blob = new Blob([JSON.stringify(dump, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup-${Math.floor(Date.now() / 1000)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    notify('Pobrano plik backupu JSON');
  }

  async function copyText(text: string, label: string) {
    try {
      await navigator.clipboard.writeText(text);
      notify(`Skopiowano ${label}`);
    } catch {
      notify('Nie udało się skopiować');
    }
  }
</script>

<div class="app-shell">
  <!-- LEFT SIDEBAR: ACCOUNTS & NET WORTH -->
  <aside class="sidebar">
    <div class="brand-bar">
      <div class="brand-title">
        <span class="brand-dot"></span>
        <span>VAULT<strong>TRACK</strong></span>
        <span class="version-pill mono">v2 Svelte5</span>
      </div>
      <button class="icon-btn" title="Dodaj konto" onclick={openNewAccountDrawer}>
        + Konto
      </button>
    </div>

    <!-- Net Worth Box -->
    <div class="net-worth-panel">
      <div class="nw-header">
        <span class="nw-label">WARTOŚĆ NETTO</span>
        <select class="currency-select mono" bind:value={baseCurrency}>
          {#each ALL_CURRENCIES as cur}
            <option value={cur}>{cur}</option>
          {/each}
        </select>
      </div>
      <div class="nw-value mono {totalNetWorth >= 0 ? 'pos' : 'neg'}">
        {formatMoney(totalNetWorth, baseCurrency)}
      </div>
      {#if baseCurrency !== 'PLN'}
        <div class="nw-subvalue mono">≈ {formatMoney(totalNetWorthPln, 'PLN')}</div>
      {/if}
      <div class="nw-meta">
        <span>{visibleAccounts.length} kont</span>
        <span>·</span>
        <span>{transactionsList.length.toLocaleString('pl-PL')} operacji</span>
      </div>
    </div>

    <!-- All Accounts Item -->
    <div class="account-list">
      <button
        class="account-row all-accounts {filter.accountId === '' ? 'selected' : ''}"
        onclick={() => {
          filter.accountId = '';
          visibleRowLimit = 250;
        }}
      >
        <div class="acc-main">
          <span class="acc-name">Wszystkie konta</span>
          <span class="acc-sub">{transactionsList.length} tx</span>
        </div>
        {#if reconciliation.failingAsserts.length > 0}
          <span class="assert-badge fail mono" title="Niezgodne asserty">
            ! {reconciliation.failingAsserts.length}
          </span>
        {:else}
          <span class="assert-badge ok mono">✓ OK</span>
        {/if}
      </button>

      {#each [
        { key: 'Bank', label: 'KONTA BANKOWE' },
        { key: 'Cash', label: 'GOTÓWKA' },
        { key: 'Invst', label: 'KRYPTO & INWESTYCJE' },
        { key: 'CCard', label: 'KARTY & POŻYCZKI' }
      ] as group}
        {@const list = accountsByType[group.key as AccountType] || []}
        {#if list.length > 0}
          <div class="acc-group-header">{group.label}</div>
          {#each list as acc (acc.id)}
            <div
              class="account-row {filter.accountId === acc.id ? 'selected' : ''}"
              role="button"
              tabindex="0"
              onclick={() => {
                filter.accountId = acc.id;
                activeTab = 'ledger';
                visibleRowLimit = 250;
              }}
              onkeydown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  filter.accountId = acc.id;
                  activeTab = 'ledger';
                }
              }}
            >
              <div class="acc-main">
                <div class="acc-title-line">
                  <span class="acc-name">{acc.name}</span>
                  {#if acc.failedAssertsCount > 0}
                    <span
                      class="acc-dot fail"
                      title="{acc.failedAssertsCount} niezgodnych assertów"
                    ></span>
                  {/if}
                </div>
                <div class="acc-sub">
                  <span>{acc.txCount} tx</span>
                  {#if acc.lastAssertDate}
                    <span>· assert {acc.lastAssertDate}</span>
                  {/if}
                </div>
              </div>
              <div class="acc-right">
                <span class="acc-bal mono {acc.balance < 0 ? 'neg' : 'pos'}">
                  {formatMoney(acc.balance, acc.currency)}
                </span>
                <button
                  class="acc-edit-btn"
                  title="Edytuj konto"
                  onclick={(e) => {
                    e.stopPropagation();
                    openEditAccountDrawer(acc);
                  }}
                >
                  ✎
                </button>
              </div>
            </div>
          {/each}
        {/if}
      {/each}
    </div>

    <div class="sidebar-footer">
      <label class="toggle-hidden">
        <input type="checkbox" bind:checked={showHiddenAccounts} />
        <span>Pokaż ukryte konta</span>
      </label>
    </div>
  </aside>

  <!-- MAIN WORKSPACE -->
  <div class="main-area">
    <!-- TOP BAR -->
    <header class="topbar">
      <nav class="nav-tabs">
        <button
          class="nav-tab {activeTab === 'ledger' ? 'active' : ''}"
          onclick={() => setActiveTab('ledger')}
        >
          Księga główna
        </button>
        <button
          class="nav-tab {activeTab === 'analytics' ? 'active' : ''}"
          onclick={() => setActiveTab('analytics')}
        >
          Analityka
        </button>
        <button
          class="nav-tab {activeTab === 'sync' ? 'active' : ''}"
          onclick={() => setActiveTab('sync')}
        >
          Sync & MCP
          {#if derivedGroupId}
            <span class="sync-pill">ONLINE</span>
          {/if}
        </button>
      </nav>

      <div class="topbar-actions">
        {#if statusNotice}
          <span class="status-toast">{statusNotice}</span>
        {/if}

        {#if derivedGroupId}
          <button
            class="btn btn-ghost mono"
            disabled={isSyncing}
            onclick={handleManualSync}
            title="Synchronizuj teraz z api.vaulttrack.org"
          >
            {isSyncing ? 'Sync...' : '↻ Sync'}
          </button>
        {/if}

        <button
          class="btn btn-secondary"
          onclick={toggleTheme}
          title="Przełącz motyw jasny / ciemny"
        >
          {theme === 'light' ? '🌙 Ciemny' : '☀️ Jasny'}
        </button>

        <button class="btn btn-secondary" onclick={() => openNewAssertDrawer()}>
          + Assert Salda
        </button>
        <button class="btn btn-primary" onclick={openNewTransactionDrawer}>
          + Transakcja
        </button>
      </div>
    </header>

    {#if loading}
      <div class="empty-state">
        <p class="mono">Ładowanie bazy IndexedDB...</p>
      </div>
    {:else if activeTab === 'ledger'}
      <!-- RECONCILIATION DISCREPANCY BANNER -->
      {@const relevantFailures = filter.accountId
        ? reconciliation.failingAsserts.filter((f) => f.accountId === filter.accountId)
        : reconciliation.failingAsserts}
      {#if relevantFailures.length > 0}
        <section class="reconcile-banner">
          <div class="reconcile-header">
            <div>
              <strong>Niezgodność Sald (Balance Assertions): {relevantFailures.length}</strong>
              <span class="reconcile-sub">
                Wyliczone saldo z transakcji różni się od zadeklarowanego stanu konta z wyciągu.
              </span>
            </div>
            {#if relevantFailures.length > 4}
              <button
                class="btn-link"
                onclick={() => (showAllReconciliationAlerts = !showAllReconciliationAlerts)}
              >
                {showAllReconciliationAlerts
                  ? 'Zwiń listę'
                  : `Pokaż wszystkie (${relevantFailures.length})`}
              </button>
            {/if}
          </div>
          <div class="reconcile-list">
            {#each showAllReconciliationAlerts ? relevantFailures : relevantFailures.slice(0, 4) as fail (fail.id)}
              <div class="reconcile-item">
                <div class="reconcile-info">
                  <span class="reconcile-acc">{fail.accountName}</span>
                  <span class="mono reconcile-date">{fail.date}</span>
                  <span class="mono">
                    Oczekiwano: <strong>{formatMoney(fail.expected, fail.currency)}</strong>
                  </span>
                  <span class="mono">
                    Wyliczono: <strong>{formatMoney(fail.actual, fail.currency)}</strong>
                  </span>
                  <span class="mono diff-pill">
                    Δ {formatMoney(fail.diff, fail.currency, true)}
                  </span>
                </div>
                <div class="reconcile-actions">
                  <button
                    class="btn-xs"
                    onclick={() => {
                      filter.accountId = fail.accountId;
                    }}
                  >
                    Filtruj konto
                  </button>
                  <button class="btn-xs fix" onclick={() => autoFixFailingAssert(fail)}>
                    Wyrównaj saldo (Auto-Fix)
                  </button>
                </div>
              </div>
            {/each}
          </div>
        </section>
      {/if}

      <!-- FILTER & SUMMARY BAR -->
      <section class="filter-bar">
        <div class="filter-inputs">
          <input
            type="search"
            class="input search-input"
            placeholder="Szukaj odbiorcy, kategorii, notatki, kwoty..."
            bind:value={filter.search}
          />

          <select class="input" bind:value={filter.type}>
            <option value="all">Wszystkie typy</option>
            <option value="expense">Tylko wydatki (−)</option>
            <option value="income">Tylko przychody (+)</option>
            <option value="transfer">Tylko transfery [Konto]</option>
            <option value="uncategorized">Bez kategorii</option>
          </select>

          <select class="input" bind:value={filter.category}>
            <option value="">Wszystkie kategorie</option>
            {#each categoriesList as cat (cat.id)}
              <option value={cat.category}>{cat.category}</option>
            {/each}
          </select>

          <select class="input" bind:value={filter.project}>
            <option value="">Wszystkie projekty</option>
            {#each projectsList as proj (proj.id)}
              <option value={proj.project}>{proj.project}</option>
            {/each}
          </select>

          <input type="date" class="input date-input" bind:value={filter.dateFrom} title="Od daty" />
          <input type="date" class="input date-input" bind:value={filter.dateTo} title="Do daty" />

          {#if filter.search || filter.category || filter.project || filter.type !== 'all' || filter.dateFrom || filter.dateTo || filter.accountId}
            <button
              class="btn btn-ghost"
              onclick={() => {
                filter.accountId = '';
                filter.search = '';
                filter.category = '';
                filter.project = '';
                filter.type = 'all';
                filter.dateFrom = '';
                filter.dateTo = '';
              }}
            >
              Wyczyść filtry
            </button>
          {/if}
        </div>

        <div class="summary-strip mono">
          <span>Operacji: <strong>{filteredSummary.txCount}</strong></span>
          <span class="pos">
            Przychody: <strong>+{formatMoney(filteredSummary.income, filteredSummary.currency)}</strong>
          </span>
          <span class="neg">
            Wydatki: <strong>{formatMoney(filteredSummary.expense, filteredSummary.currency)}</strong>
          </span>
          <span>
            Bilans:
            <strong class={filteredSummary.net >= 0 ? 'pos' : 'neg'}>
              {formatMoney(filteredSummary.net, filteredSummary.currency, true)}
            </strong>
          </span>
        </div>
      </section>

      <!-- LEDGER TABLE -->
      <div class="ledger-container">
        <table class="ledger-table">
          <thead>
            <tr>
              <th class="col-date">Data</th>
              <th class="col-account">Konto</th>
              <th class="col-payee">Odbiorca / Opis</th>
              <th class="col-category">Kategoria / Projekt</th>
              <th class="col-amount">Kwota</th>
              <th class="col-balance">Saldo po operacji</th>
            </tr>
          </thead>
          <tbody>
            {#each visibleTimeline as item (item.kind === 'transaction' ? item.tx.id : `assert-${item.assertion.id}`)}
              {#if item.kind === 'assert'}
                {@const a = item.assertion}
                <tr
                  class="assert-row {a.passed ? 'passed' : 'failed'}"
                  onclick={() => openEditAssertDrawer(a)}
                >
                  <td class="mono col-date">{a.date}</td>
                  <td class="col-account">
                    <span class="account-pill">{a.accountName}</span>
                  </td>
                  <td colspan="2" class="assert-desc">
                    {#if a.passed}
                      <span class="assert-status ok mono">✓ ASSERT ZGODNY</span>
                      <span>Potwierdzone saldo wyciągu bankowego</span>
                    {:else}
                      <span class="assert-status fail mono">
                        ✗ ROZBIEŻNOŚĆ ASSERTU (Δ {formatMoney(a.diff, a.currency, true)})
                      </span>
                      <span>
                        Oczekiwano {formatMoney(a.expected, a.currency)}, wyliczono {formatMoney(
                          a.actualBalance,
                          a.currency
                        )}
                      </span>
                    {/if}
                  </td>
                  <td class="mono col-amount assert-val">
                    Cel: {formatMoney(a.value, a.currency)}
                  </td>
                  <td class="mono col-balance">
                    Stan: {formatMoney(a.actualBalance, a.currency)}
                  </td>
                </tr>
              {:else}
                {@const t = item.tx}
                <tr class="tx-row" onclick={() => openEditTransactionDrawer(t)}>
                  <td class="mono col-date">{t.date.split('T')[0]}</td>
                  <td class="col-account">
                    <span class="account-pill">{t.account}</span>
                  </td>
                  <td class="col-payee">
                    <div class="payee-main">{t.payee || '—'}</div>
                    {#if t.memo}
                      <div class="payee-memo">{t.memo}</div>
                    {/if}
                  </td>
                  <td class="col-category">
                    {#if t.isTransfer}
                      <span class="cat-badge transfer">
                        ⇄ Transfer: {t.transferTarget}
                      </span>
                    {:else if t.categoryName}
                      <span class="cat-badge">
                        <span
                          class="cat-color-dot"
                          style="background-color: {t.categoryColor}"
                        ></span>
                        {t.categoryName}
                      </span>
                    {:else}
                      <span class="cat-badge uncategorized">Bez kategorii</span>
                    {/if}
                    {#if t.projectName}
                      <span class="proj-badge">/{t.projectName}</span>
                    {/if}
                  </td>
                  <td class="mono col-amount {t.amount < 0 ? 'neg' : 'pos'}">
                    {formatMoney(t.amount, t.currency, true)}
                  </td>
                  <td class="mono col-balance">
                    {formatMoney(t.runningBalance, t.currency)}
                  </td>
                </tr>
              {/if}
            {/each}
          </tbody>
        </table>

        {#if timelineItems.length > visibleRowLimit}
          <div class="load-more-bar">
            <button
              class="btn btn-secondary"
              onclick={() => (visibleRowLimit += 300)}
            >
              Pokaż kolejne 300 (wyświetlono {visibleRowLimit} z {timelineItems.length})
            </button>
            <button
              class="btn btn-ghost"
              onclick={() => (visibleRowLimit = timelineItems.length)}
            >
              Pokaż wszystkie ({timelineItems.length})
            </button>
          </div>
        {/if}
      </div>
    {:else if activeTab === 'analytics'}
      <!-- ANALYTICS & BULK CATEGORIZATION VIEW -->
      <div class="analytics-grid">
        <section class="panel">
          <div class="panel-header">
            <h2>Struktura wydatków i przychodów wg głównych kategorii ({baseCurrency})</h2>
            <p class="panel-sub">
              Uwzględnia bieżące filtry ({filteredSummary.txCount} transakcji). Kliknij kategorię, aby przefiltrować Księgę.
            </p>
          </div>
          <div class="cat-breakdown-list">
            {#each categoryBreakdown as row (row.category)}
              <div
                class="cat-stat-row"
                role="button"
                tabindex="0"
                onclick={() => {
                  filter.category = row.category === '(Bez kategorii)' ? '' : row.category;
                  if (row.category === '(Bez kategorii)') filter.type = 'uncategorized';
                  activeTab = 'ledger';
                }}
                onkeydown={(e) => {
                  if (e.key === 'Enter') {
                    filter.category = row.category === '(Bez kategorii)' ? '' : row.category;
                    activeTab = 'ledger';
                  }
                }}
              >
                <div class="cat-stat-top">
                  <div class="cat-stat-name">
                    <span class="cat-color-dot" style="background-color: {row.color}"></span>
                    <strong>{row.category}</strong>
                    <span class="mono muted">({row.count} tx)</span>
                  </div>
                  <div class="cat-stat-numbers mono">
                    {#if row.expense > 0}
                      <span class="neg">−{formatMoney(row.expense, baseCurrency)}</span>
                    {/if}
                    {#if row.income > 0}
                      <span class="pos">+{formatMoney(row.income, baseCurrency)}</span>
                    {/if}
                    <span class="share-pill">{row.share.toFixed(1)}%</span>
                  </div>
                </div>
                <div class="progress-track">
                  <div
                    class="progress-fill"
                    style="width: {Math.min(100, row.share)}%; background-color: {row.color}"
                  ></div>
                </div>
              </div>
            {/each}
          </div>
        </section>

        <section class="panel">
          <div class="panel-header">
            <h2>Masowa Kategoryzacja (Bulk Categorizer)</h2>
            <p class="panel-sub">
              Błyskawicznie przypisz kategorię i projekt do serii transakcji z banku (np. po nazwie odbiorcy).
            </p>
          </div>

          <div class="bulk-form">
            <div class="field">
              <label for="bulk-q">Filtr odbiorcy / opisu</label>
              <input
                id="bulk-q"
                type="text"
                class="input"
                placeholder="np. Biedronka, Żabka, Bolt, Wise..."
                bind:value={bulkSearch}
              />
            </div>

            <label class="checkbox-line">
              <input type="checkbox" bind:checked={bulkOnlyUncategorized} />
              <span>Tylko transakcje bez przypisanej kategorii</span>
            </label>

            <div class="field-row">
              <div class="field">
                <label for="bulk-cat">Nowa kategoria</label>
                <input
                  id="bulk-cat"
                  type="text"
                  class="input"
                  list="categories-datalist"
                  placeholder="np. Jedzenie:Zakupy"
                  bind:value={bulkTargetCategory}
                />
              </div>
              <div class="field">
                <label for="bulk-proj">Projekt (opcjonalnie)</label>
                <input
                  id="bulk-proj"
                  type="text"
                  class="input"
                  list="projects-datalist"
                  placeholder="np. Gruzja"
                  bind:value={bulkTargetProject}
                />
              </div>
            </div>

            <div class="bulk-preview">
              <div class="bulk-preview-header mono">
                Pasujących transakcji: <strong>{bulkMatchingTransactions.length}</strong>
              </div>
              <div class="bulk-sample-list">
                {#each bulkMatchingTransactions.slice(0, 8) as m (m.id)}
                  <div class="bulk-sample-item mono">
                    <span>{m.date.split('T')[0]}</span>
                    <span>{m.account}</span>
                    <span class="truncate">{m.payee || m.memo || '—'}</span>
                    <span class={m.amount < 0 ? 'neg' : 'pos'}>{m.amount}</span>
                  </div>
                {/each}
              </div>
            </div>

            <button
              class="btn btn-primary"
              disabled={bulkMatchingTransactions.length === 0}
              onclick={applyBulkCategorization}
            >
              Przypisz kategorię do {bulkMatchingTransactions.length} transakcji
            </button>
          </div>
        </section>
      </div>
    {:else if activeTab === 'sync'}
      <!-- SYNC, BACKUP, CONNECTORS & MCP COCKPIT -->
      <div class="sync-grid">
        <section class="panel">
          <div class="panel-header">
            <h2>Klucz Synchronizacji (12 słów BIP39)</h2>
            <p class="panel-sub">
              Jeden klucz łączy przeglądarkę, serwer <code>api.vaulttrack.org</code>, konektory bankowe i serwer MCP. Dane są przesyłane jako jawny JSON bez narzutu E2EE.
            </p>
          </div>

          <div class="sync-box">
            <div class="field">
              <label for="mnemonic-in">Twoje 12 słów (Pairing Phrase)</label>
              <div class="input-group">
                <input
                  id="mnemonic-in"
                  type="text"
                  class="input mono"
                  placeholder="Wpisz lub wygeneruj 12 słów..."
                  bind:value={mnemonicInput}
                />
                <button class="btn btn-secondary" onclick={generateNewMnemonic}>
                  Generuj 12 słów
                </button>
                <button class="btn btn-primary" onclick={savePairingMnemonic}>
                  Zapisz i Połącz
                </button>
              </div>
            </div>

            {#if derivedGroupId}
              <div class="group-id-card">
                <div class="gid-row">
                  <div>
                    <div class="gid-label">X-Sync-Group-ID (Klucz dla MCP oraz Konektorów Bankowych / Brain)</div>
                    <code class="gid-code mono">{derivedGroupId}</code>
                  </div>
                  <div class="gid-buttons">
                    <button
                      class="btn btn-secondary"
                      onclick={() => copyText(derivedGroupId, 'X-Sync-Group-ID')}
                    >
                      Kopiuj Group ID
                    </button>
                    <button class="btn btn-ghost" onclick={disconnectSync}>
                      Rozłącz
                    </button>
                  </div>
                </div>

                {#if qrDataUrl}
                  <div class="qr-row">
                    <img src={qrDataUrl} alt="QR Code" class="qr-img" />
                    <div class="qr-info">
                      <div><strong>Device ID:</strong> <code class="mono">{deviceId}</code></div>
                      <div><strong>Backend API:</strong> <code class="mono">{backendUrl}</code></div>
                      <div><strong>Zdarzeń w IndexedDB:</strong> <span class="mono">{eventCount}</span></div>
                      {#if lastSyncText}
                        <div><strong>Ostatnia synchronizacja:</strong> <span class="mono">{lastSyncText}</span></div>
                      {/if}
                    </div>
                  </div>
                {/if}
              </div>
            {/if}
          </div>

          <div class="backup-actions-box">
            <h3>Kopie zapasowe i Snapshot (Local-First)</h3>
            <div class="btn-row">
              <button class="btn btn-primary" onclick={loadLatestBundledBackup}>
                Załaduj najnowszy backup-1792270083.json (6 471 tx)
              </button>
              <label class="btn btn-secondary file-label">
                Wgraj dowolny plik .json
                <input type="file" accept=".json" hidden onchange={handleBackupFileUpload} />
              </label>
              <button class="btn btn-secondary" onclick={exportBackupJson}>
                Eksportuj JSON Backup
              </button>
              <button
                class="btn btn-ghost"
                onclick={async () => {
                  if (confirm('Wyczyścić lokalną bazę IndexedDB w przeglądarce?')) {
                    appState = await clearAllLocalData();
                    eventCount = 0;
                    notify('Wyczyszczono lokalną bazę IndexedDB');
                  }
                }}
              >
                Wyczyść IndexedDB
              </button>
            </div>
          </div>
        </section>

        <section class="panel">
          <div class="panel-header">
            <h2>Architektura Konektorów & MCP (Status)</h2>
            <p class="panel-sub">
              Backend utrzymuje zmaterializowane tabele SQL (<code>accounts</code>, <code>transactions</code>, <code>categories</code>, <code>projects</code>, <code>asserts</code>) i strumieniuje zmiany do przeglądarki.
            </p>
          </div>

          <div class="connector-cards">
            <div class="conn-card">
              <div class="conn-title">
                <span class="conn-dot active"></span>
                <strong>Backend SQL Materializer</strong>
              </div>
              <p>
                Każdy <code>POST /api/sync/push</code> oraz <code>POST /api/sync/import-backup</code> zapisuje rekordy bezpośrednio w tabelach relacyjnych SQLite/Turso.
              </p>
            </div>

            <div class="conn-card">
              <div class="conn-title">
                <span class="conn-dot planned"></span>
                <strong>MCP Server (LLM Native Interface)</strong>
              </div>
              <p>
                W planie: narzędzia SQL i mutacje po nagłówku <code>X-Sync-Group-ID</code> (zapytania analityczne, kategoryzacja wsadowa, uzgadnianie assertów).
              </p>
            </div>

            <div class="conn-card">
              <div class="conn-title">
                <span class="conn-dot {connectorStatus.length > 0 ? 'active' : 'ready'}"></span>
                <strong>Konektory bankowe</strong>
                <button class="btn btn-ghost btn-xs" onclick={refreshConnectorStatus}>
                  Odśwież
                </button>
              </div>
              {#if connectorStatusError}
                <p class="text-danger">Błąd statusu: {connectorStatusError}</p>
              {:else if connectorStatus.length === 0}
                <p>
                  Brak przebiegów. Uruchom <code>import:millennium</code> z 12 słowami, żeby
                  zaciągnąć świeży wyciąg i wystawić assert salda.
                </p>
              {:else}
                {#each connectorStatus as connector}
                  <div class="connector-run">
                    <span class="conn-dot {connector.status === 'ok' ? 'active' : 'error'}"></span>
                    <strong>{connector.source}</strong>
                    <span class="mono">+{connector.imported} / {connector.skipped} skip</span>
                    <span class="muted">{new Date(connector.startedAt).toLocaleString('pl-PL')}</span>
                  </div>
                {/each}
              {/if}
            </div>
          </div>

          <div class="logs-box">
            <h4>Logi synchronizacji</h4>
            <div class="logs-scroll mono">
              {#if syncLogs.length === 0}
                <div class="muted">Brak logów w tej sesji.</div>
              {:else}
                {#each syncLogs as l}
                  <div>{l}</div>
                {/each}
              {/if}
            </div>
          </div>
        </section>
      </div>
    {/if}
  </div>

  <!-- SLIDE-OVER DRAWER FOR EDITING TRANSACTIONS, ACCOUNTS, ASSERTS -->
  {#if activeDrawer}
    <div
      class="drawer-backdrop"
      role="presentation"
      onclick={() => (activeDrawer = null)}
    >
      <div
        class="drawer-panel"
        role="dialog"
        tabindex="-1"
        onclick={(e) => e.stopPropagation()}
        onkeydown={(e) => {
          if (e.key === 'Escape') activeDrawer = null;
        }}
      >
        {#if activeDrawer === 'tx'}
          <div class="drawer-header">
            <h3>{editingTxId ? 'Edytuj transakcję' : 'Nowa transakcja'}</h3>
            <button class="close-btn" onclick={() => (activeDrawer = null)}>✕</button>
          </div>

          <form class="drawer-form" onsubmit={saveTransactionForm}>
            <div class="mode-switch">
              <button
                type="button"
                class="mode-btn expense {txFormMode === 'expense' ? 'active' : ''}"
                onclick={() => (txFormMode = 'expense')}
              >
                Wydatek (−)
              </button>
              <button
                type="button"
                class="mode-btn income {txFormMode === 'income' ? 'active' : ''}"
                onclick={() => (txFormMode = 'income')}
              >
                Przychód (+)
              </button>
              <button
                type="button"
                class="mode-btn transfer {txFormMode === 'transfer' ? 'active' : ''}"
                onclick={() => (txFormMode = 'transfer')}
              >
                Transfer [⇄]
              </button>
            </div>

            <div class="field">
              <label for="tx-acc">
                {txFormMode === 'transfer' ? 'Z konta (źródłowe)' : 'Konto'}
              </label>
              <select id="tx-acc" class="input" bind:value={txFormAccountId} required>
                {#each visibleAccounts as a (a.id)}
                  <option value={a.id}>{a.name} ({a.currency})</option>
                {/each}
              </select>
            </div>

            {#if txFormMode === 'transfer'}
              <div class="field">
                <label for="tx-target-acc">Na konto (docelowe)</label>
                <select id="tx-target-acc" class="input" bind:value={txFormTargetAccountId} required>
                  {#each visibleAccounts as a (a.id)}
                    <option value={a.id}>{a.name} ({a.currency})</option>
                  {/each}
                </select>
              </div>
            {/if}

            <div class="field-row">
              <div class="field">
                <label for="tx-amount">Kwota</label>
                <input
                  id="tx-amount"
                  type="number"
                  step="any"
                  class="input mono"
                  bind:value={txFormAmount}
                  required
                />
              </div>
              <div class="field">
                <label for="tx-date">Data</label>
                <input
                  id="tx-date"
                  type="date"
                  class="input mono"
                  bind:value={txFormDate}
                  required
                />
              </div>
            </div>

            {#if !editingTxId && txFormMode === 'transfer'}
              <label class="checkbox-line">
                <input type="checkbox" bind:checked={txFormCreateCounterpart} />
                <span>Utwórz automatycznie drugą stronę transferu na koncie docelowym</span>
              </label>
              {#if txFormCreateCounterpart}
                <div class="field">
                  <label for="tx-target-amount">
                    Kwota na koncie docelowym (0 = taka sama jak źródłowa)
                  </label>
                  <input
                    id="tx-target-amount"
                    type="number"
                    step="any"
                    class="input mono"
                    bind:value={txFormTargetAmount}
                  />
                </div>
              {/if}
            {/if}

            <div class="field">
              <label for="tx-payee">Odbiorca / Płatnik (Payee)</label>
              <input
                id="tx-payee"
                type="text"
                class="input"
                placeholder="np. Biedronka, Wise, Allegro..."
                bind:value={txFormPayee}
              />
            </div>

            {#if txFormMode !== 'transfer'}
              <div class="field">
                <label for="tx-cat">Kategoria (np. Jedzenie:Miasto)</label>
                <input
                  id="tx-cat"
                  type="text"
                  class="input"
                  list="categories-datalist"
                  placeholder="Wybierz lub wpisz kategorię..."
                  bind:value={txFormCategory}
                />
              </div>
            {/if}

            <div class="field">
              <label for="tx-proj">Projekt (opcjonalny tag po /)</label>
              <input
                id="tx-proj"
                type="text"
                class="input"
                list="projects-datalist"
                placeholder="np. Studia, Dom, Wyjazd..."
                bind:value={txFormProject}
              />
            </div>

            <div class="field">
              <label for="tx-memo">Notatka (Memo)</label>
              <input
                id="tx-memo"
                type="text"
                class="input"
                placeholder="Dodatkowy opis..."
                bind:value={txFormMemo}
              />
            </div>

            <div class="drawer-footer">
              {#if editingTxId}
                <button
                  type="button"
                  class="btn btn-danger"
                  onclick={deleteCurrentTransaction}
                >
                  Usuń
                </button>
              {/if}
              <div class="spacer"></div>
              <button
                type="button"
                class="btn btn-ghost"
                onclick={() => (activeDrawer = null)}
              >
                Anuluj
              </button>
              <button type="submit" class="btn btn-primary">
                Zapisz transakcję
              </button>
            </div>
          </form>
        {:else if activeDrawer === 'account'}
          <div class="drawer-header">
            <h3>{editingAccountId ? 'Edytuj konto' : 'Nowe konto'}</h3>
            <button class="close-btn" onclick={() => (activeDrawer = null)}>✕</button>
          </div>

          <form class="drawer-form" onsubmit={saveAccountForm}>
            <div class="field">
              <label for="acc-name">Nazwa konta</label>
              <input
                id="acc-name"
                type="text"
                class="input"
                placeholder="np. mBank Prywatne, Wise EUR..."
                bind:value={accFormName}
                required
              />
            </div>

            <div class="field-row">
              <div class="field">
                <label for="acc-type">Typ konta</label>
                <select id="acc-type" class="input" bind:value={accFormType}>
                  <option value="Bank">Bank</option>
                  <option value="Cash">Gotówka (Cash)</option>
                  <option value="Invst">Inwestycje / Krypto (Invst)</option>
                  <option value="CCard">Karta / Pożyczki (CCard)</option>
                </select>
              </div>
              <div class="field">
                <label for="acc-cur">Waluta</label>
                <select id="acc-cur" class="input mono" bind:value={accFormCurrency}>
                  {#each ALL_CURRENCIES as cur}
                    <option value={cur}>{cur}</option>
                  {/each}
                </select>
              </div>
            </div>

            <div class="field">
              <label for="acc-desc">Opis / Numer konta / IBAN</label>
              <input
                id="acc-desc"
                type="text"
                class="input"
                bind:value={accFormDescription}
              />
            </div>

            <label class="checkbox-line">
              <input type="checkbox" bind:checked={accFormHidden} />
              <span>Ukryj konto na liście bocznej (archiwum)</span>
            </label>

            <div class="drawer-footer">
              <div class="spacer"></div>
              <button
                type="button"
                class="btn btn-ghost"
                onclick={() => (activeDrawer = null)}
              >
                Anuluj
              </button>
              <button type="submit" class="btn btn-primary">
                Zapisz konto
              </button>
            </div>
          </form>
        {:else if activeDrawer === 'assert'}
          <div class="drawer-header">
            <h3>{editingAssertId ? 'Edytuj Assert Salda' : 'Nowy Assert Salda'}</h3>
            <button class="close-btn" onclick={() => (activeDrawer = null)}>✕</button>
          </div>

          <form class="drawer-form" onsubmit={saveAssertForm}>
            <div class="field">
              <label for="as-acc">Konto</label>
              <select id="as-acc" class="input" bind:value={assertFormAccountId} required>
                {#each visibleAccounts as a (a.id)}
                  <option value={a.id}>{a.name} ({a.currency})</option>
                {/each}
              </select>
            </div>

            <div class="field">
              <label for="as-date">Data sprawdzenia salda (koniec dnia)</label>
              <input
                id="as-date"
                type="date"
                class="input mono"
                bind:value={assertFormDate}
                required
              />
            </div>

            <div class="field">
              <label for="as-val">Rzeczywiste saldo w banku / portfelu</label>
              <input
                id="as-val"
                type="number"
                step="any"
                class="input mono"
                bind:value={assertFormValue}
                required
              />
            </div>

            <div class="drawer-footer">
              {#if editingAssertId}
                <button
                  type="button"
                  class="btn btn-danger"
                  onclick={deleteCurrentAssert}
                >
                  Usuń Assert
                </button>
              {/if}
              <div class="spacer"></div>
              <button
                type="button"
                class="btn btn-ghost"
                onclick={() => (activeDrawer = null)}
              >
                Anuluj
              </button>
              <button type="submit" class="btn btn-primary">
                Zapisz Assert
              </button>
            </div>
          </form>
        {/if}
      </div>
    </div>
  {/if}

  <!-- DATALISTS FOR FAST AUTOCOMPLETE -->
  <datalist id="categories-datalist">
    {#each categoriesList as c (c.id)}
      <option value={c.category}></option>
    {/each}
  </datalist>
  <datalist id="projects-datalist">
    {#each projectsList as p (p.id)}
      <option value={p.project}></option>
    {/each}
  </datalist>
</div>

<style>
  .app-shell {
    display: grid;
    grid-template-columns: 320px 1fr;
    height: 100vh;
    width: 100vw;
    overflow: hidden;
    background: var(--bg-canvas);
  }

  /* SIDEBAR */
  .sidebar {
    background: var(--bg-surface);
    border-right: 1px solid var(--border-subtle);
    display: flex;
    flex-direction: column;
    height: 100vh;
    overflow: hidden;
  }

  .brand-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 16px;
    border-bottom: 1px solid var(--border-subtle);
  }

  .brand-title {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 15px;
    letter-spacing: -0.02em;
  }

  .brand-dot {
    width: 9px;
    height: 9px;
    border-radius: 50%;
    background: var(--accent-primary);
    box-shadow: 0 0 10px var(--accent-primary);
  }

  .version-pill {
    font-size: 10px;
    padding: 2px 6px;
    border-radius: 4px;
    background: var(--accent-primary-bg);
    color: var(--accent-primary);
  }

  .icon-btn {
    font-size: 12px;
    font-weight: 600;
    padding: 4px 9px;
    border-radius: 5px;
    background: var(--bg-elevated);
    color: var(--text-primary);
    border: 1px solid var(--border-strong);
  }
  .icon-btn:hover {
    background: var(--bg-hover);
  }

  .net-worth-panel {
    padding: 16px 18px;
    background: var(--nw-gradient);
    border-bottom: 1px solid var(--border-subtle);
  }

  .nw-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 10px;
    margin-bottom: 4px;
  }

  .nw-label {
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.06em;
    color: var(--text-secondary);
  }

  .currency-select {
    background: var(--bg-elevated);
    border: 1px solid var(--border-strong);
    color: var(--text-primary);
    border-radius: 4px;
    padding: 3px 6px;
    font-size: 11px;
    max-width: 92px;
  }

  .nw-value {
    font-size: 24px;
    font-weight: 600;
    letter-spacing: -0.03em;
    line-height: 1.2;
  }

  .nw-subvalue {
    margin-top: 2px;
    font-size: 12px;
    color: var(--text-secondary);
  }

  .nw-meta {
    margin-top: 4px;
    font-size: 12px;
    color: var(--text-secondary);
    display: flex;
    gap: 6px;
  }

  .account-list {
    flex: 1;
    overflow-y: auto;
    padding: 8px;
    content-visibility: auto;
  }

  .acc-group-header {
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.08em;
    color: var(--text-muted);
    padding: 12px 8px 4px;
  }

  .account-row {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 10px;
    border-radius: 6px;
    margin-bottom: 2px;
    text-align: left;
    cursor: pointer;
    transition: background 0.12s ease;
  }
  .account-row:hover {
    background: var(--bg-hover);
  }
  .account-row.selected {
    background: var(--bg-active);
    box-shadow: inset 2px 0 0 var(--accent-primary);
  }

  .acc-main {
    min-width: 0;
    flex: 1;
  }

  .acc-title-line {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .acc-name {
    font-size: 13px;
    font-weight: 600;
    color: var(--text-primary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .acc-sub {
    font-size: 11px;
    color: var(--text-muted);
  }

  .acc-dot.fail {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: var(--expense);
    flex-shrink: 0;
  }

  .acc-right {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-left: 8px;
  }

  .acc-bal {
    font-size: 12.5px;
    font-weight: 500;
  }

  .acc-edit-btn {
    opacity: 0;
    font-size: 12px;
    color: var(--text-secondary);
    padding: 2px 4px;
    border-radius: 4px;
  }
  .account-row:hover .acc-edit-btn {
    opacity: 1;
  }
  .acc-edit-btn:hover {
    background: var(--bg-elevated);
    color: var(--text-primary);
  }

  .assert-badge {
    font-size: 11px;
    padding: 2px 6px;
    border-radius: 4px;
    font-weight: 600;
  }
  .assert-badge.fail {
    background: var(--expense-bg);
    color: var(--expense);
  }
  .assert-badge.ok {
    background: var(--income-bg);
    color: var(--income);
  }

  .sidebar-footer {
    padding: 10px 14px;
    border-top: 1px solid var(--border-subtle);
    font-size: 12px;
    color: var(--text-secondary);
  }

  .toggle-hidden {
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
  }

  /* MAIN AREA */
  .main-area {
    display: flex;
    flex-direction: column;
    height: 100vh;
    overflow: hidden;
  }

  .topbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 24px;
    background: var(--bg-surface);
    border-bottom: 1px solid var(--border-subtle);
    gap: 20px;
    flex-wrap: wrap;
    row-gap: 10px;
  }

  .nav-tabs {
    display: flex;
    flex: 1 1 auto;
    flex-wrap: wrap;
    gap: 8px;
    min-width: 0;
  }

  .nav-tab {
    padding: 8px 16px;
    border-radius: 6px;
    font-weight: 600;
    font-size: 13px;
    color: var(--text-secondary);
    display: flex;
    align-items: center;
    gap: 8px;
    white-space: nowrap;
  }
  .nav-tab:hover {
    color: var(--text-primary);
    background: var(--bg-elevated);
  }
  .nav-tab.active {
    color: var(--text-primary);
    background: var(--bg-active);
  }

  .sync-pill {
    font-size: 10px;
    padding: 1px 6px;
    border-radius: 99px;
    background: var(--income-bg);
    color: var(--income);
  }

  .topbar-actions {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
    margin-left: auto;
  }

  .status-toast {
    font-size: 12px;
    padding: 5px 10px;
    border-radius: 6px;
    background: var(--accent-primary-bg);
    color: var(--accent-primary);
    border: 1px solid rgba(56, 189, 248, 0.3);
  }

  /* BUTTONS & INPUTS */
  .btn {
    padding: 7px 13px;
    border-radius: 6px;
    font-weight: 600;
    font-size: 13px;
    transition: background 0.12s ease;
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }
  .btn:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
  .btn-primary {
    background: var(--accent-primary);
    color: var(--accent-primary-fg);
  }
  .btn-primary:hover:not(:disabled) {
    background: var(--accent-primary-hover);
  }
  .btn-secondary {
    background: var(--bg-elevated);
    color: var(--text-primary);
    border: 1px solid var(--border-strong);
  }
  .btn-secondary:hover:not(:disabled) {
    background: var(--bg-hover);
  }
  .btn-ghost {
    color: var(--text-secondary);
  }
  .btn-ghost:hover:not(:disabled) {
    color: var(--text-primary);
    background: var(--bg-elevated);
  }
  .btn-danger {
    background: var(--expense-bg);
    color: var(--expense);
    border: 1px solid rgba(244, 63, 94, 0.35);
  }

  .input {
    background: var(--bg-surface);
    border: 1px solid var(--border-strong);
    color: var(--text-primary);
    padding: 7px 10px;
    border-radius: 6px;
    font-size: 13px;
  }

  /* RECONCILIATION BANNER */
  .reconcile-banner {
    background: var(--reconcile-banner-bg);
    border-bottom: 1px solid var(--reconcile-banner-border);
    padding: 10px 20px;
  }

  .reconcile-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 13px;
    color: var(--reconcile-header-fg);
    margin-bottom: 6px;
  }

  .reconcile-sub {
    color: var(--text-secondary);
    margin-left: 8px;
    font-size: 12px;
  }

  .btn-link {
    font-size: 12px;
    color: var(--accent-primary);
    text-decoration: underline;
  }

  .reconcile-list {
    display: flex;
    flex-direction: column;
    gap: 4px;
    max-height: 150px;
    overflow-y: auto;
  }

  .reconcile-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 5px 10px;
    background: var(--reconcile-item-bg);
    border: 1px solid var(--reconcile-banner-border);
    border-radius: 5px;
    font-size: 12px;
  }

  .reconcile-info {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
  }

  .reconcile-acc {
    font-weight: 700;
    color: var(--text-primary);
  }

  .reconcile-date {
    color: var(--text-secondary);
  }

  .diff-pill {
    padding: 1px 6px;
    border-radius: 4px;
    background: var(--expense-bg);
    color: var(--expense);
    font-weight: 600;
  }

  .reconcile-actions {
    display: flex;
    gap: 6px;
  }

  .btn-xs {
    font-size: 11px;
    font-weight: 600;
    padding: 3px 8px;
    border-radius: 4px;
    background: var(--bg-elevated);
    border: 1px solid var(--border-strong);
    color: var(--text-primary);
  }
  .btn-xs.fix {
    background: var(--expense-bg);
    border-color: var(--reconcile-banner-border);
    color: var(--expense);
  }
  .btn-xs:hover {
    filter: brightness(0.96);
  }

  /* FILTER BAR */
  .filter-bar {
    padding: 10px 20px;
    background: var(--bg-surface);
    border-bottom: 1px solid var(--border-subtle);
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .filter-inputs {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    align-items: center;
  }

  .search-input {
    flex: 1;
    min-width: 220px;
  }

  .date-input {
    width: 138px;
  }

  .summary-strip {
    display: flex;
    gap: 20px;
    font-size: 12px;
    color: var(--text-secondary);
    padding-top: 4px;
    border-top: 1px solid var(--border-subtle);
  }

  /* LEDGER TABLE */
  .ledger-container {
    flex: 1;
    overflow: auto;
    container-type: inline-size;
  }

  .ledger-table {
    width: 100%;
    border-collapse: separate;
    border-spacing: 0;
    font-size: 13px;
  }

  .ledger-table thead {
    position: sticky;
    inset-block-start: 0;
    z-index: 2;
    background: var(--bg-elevated);
  }

  .ledger-table th {
    text-align: left;
    padding: 9px 14px;
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--text-secondary);
    border-bottom: 1px solid var(--border-strong);
  }

  .ledger-table td {
    padding: 8px 14px;
    border-bottom: 1px solid var(--border-subtle);
    vertical-align: middle;
  }

  .col-date {
    width: 108px;
    white-space: nowrap;
    color: var(--text-secondary);
  }
  .col-account {
    width: 155px;
    white-space: nowrap;
  }
  .col-amount,
  .col-balance {
    text-align: right;
    width: 145px;
    white-space: nowrap;
  }
  .ledger-table th.col-amount,
  .ledger-table th.col-balance {
    text-align: right;
  }

  .tx-row {
    cursor: pointer;
    content-visibility: auto;
    contain-intrinsic-size: auto 41px;
  }
  .tx-row:hover {
    background: var(--bg-hover);
  }

  .assert-row {
    cursor: pointer;
    font-size: 12px;
  }
  .assert-row.passed {
    background: rgba(16, 185, 129, 0.06);
  }
  .assert-row.failed {
    background: rgba(244, 63, 94, 0.11);
  }
  .assert-row:hover {
    filter: brightness(1.12);
  }

  .assert-desc {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .assert-status {
    font-weight: 700;
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 11px;
  }
  .assert-status.ok {
    background: var(--income-bg);
    color: var(--income);
  }
  .assert-status.fail {
    background: var(--expense-bg);
    color: var(--expense);
  }

  .account-pill {
    font-size: 12px;
    font-weight: 600;
    padding: 2px 8px;
    border-radius: 4px;
    background: var(--bg-elevated);
    color: var(--text-primary);
    border: 1px solid var(--border-subtle);
  }

  .payee-main {
    font-weight: 500;
    color: var(--text-primary);
  }
  .payee-memo {
    font-size: 11.5px;
    color: var(--text-muted);
  }

  .cat-badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 2px 8px;
    border-radius: 4px;
    font-size: 12px;
    background: var(--bg-elevated);
    color: var(--text-primary);
  }
  .cat-badge.transfer {
    background: var(--accent-primary-bg);
    color: var(--accent-primary);
  }
  .cat-badge.uncategorized {
    background: var(--warning-bg);
    color: var(--warning);
  }

  .cat-color-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .proj-badge {
    margin-left: 4px;
    font-size: 11.5px;
    font-weight: 600;
    color: var(--accent-primary);
  }

  .pos {
    color: var(--income);
  }
  .neg {
    color: var(--expense);
  }
  .muted {
    color: var(--text-muted);
  }

  .load-more-bar {
    padding: 16px;
    display: flex;
    justify-content: center;
    gap: 12px;
  }

  /* ANALYTICS & SYNC GRIDS */
  .analytics-grid,
  .sync-grid {
    flex: 1;
    overflow-y: auto;
    padding: 20px;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px;
    align-items: start;
  }

  .panel {
    background: var(--bg-surface);
    border: 1px solid var(--border-subtle);
    border-radius: 8px;
    padding: 20px;
  }

  .panel-header {
    margin-bottom: 16px;
  }
  .panel-header h2 {
    font-size: 16px;
    font-weight: 700;
    margin-bottom: 4px;
  }
  .panel-sub {
    font-size: 12.5px;
    color: var(--text-secondary);
  }

  .cat-breakdown-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .cat-stat-row {
    padding: 8px 10px;
    border-radius: 6px;
    background: var(--bg-canvas);
    border: 1px solid var(--border-subtle);
    cursor: pointer;
  }
  .cat-stat-row:hover {
    border-color: var(--border-strong);
  }

  .cat-stat-top {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 6px;
    font-size: 13px;
  }

  .cat-stat-name {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .cat-stat-numbers {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 12.5px;
  }

  .share-pill {
    font-size: 11px;
    padding: 1px 6px;
    border-radius: 4px;
    background: var(--bg-elevated);
    color: var(--text-secondary);
  }

  .progress-track {
    height: 5px;
    background: var(--bg-elevated);
    border-radius: 99px;
    overflow: hidden;
  }

  .progress-fill {
    height: 100%;
    border-radius: 99px;
  }

  /* BULK FORM & SYNC */
  .bulk-form,
  .sync-box {
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: 5px;
    flex: 1;
  }
  .field label {
    font-size: 12px;
    font-weight: 600;
    color: var(--text-secondary);
  }

  .field-row {
    display: flex;
    gap: 12px;
  }

  .input-group {
    display: flex;
    gap: 8px;
  }
  .input-group .input {
    flex: 1;
  }

  .checkbox-line {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    color: var(--text-secondary);
    cursor: pointer;
  }

  .bulk-preview {
    background: var(--bg-canvas);
    border: 1px solid var(--border-subtle);
    border-radius: 6px;
    padding: 10px;
  }

  .bulk-preview-header {
    font-size: 12px;
    margin-bottom: 8px;
    color: var(--text-secondary);
  }

  .bulk-sample-list {
    display: flex;
    flex-direction: column;
    gap: 4px;
    font-size: 12px;
  }

  .bulk-sample-item {
    display: grid;
    grid-template-columns: 90px 110px 1fr 80px;
    gap: 8px;
    padding: 3px 0;
    border-bottom: 1px solid var(--border-subtle);
  }

  .truncate {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .group-id-card {
    background: var(--bg-canvas);
    border: 1px solid var(--border-strong);
    border-radius: 8px;
    padding: 14px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .gid-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
  }

  .gid-label {
    font-size: 11px;
    color: var(--text-secondary);
    margin-bottom: 4px;
  }

  .gid-code {
    font-size: 12px;
    color: var(--accent-primary);
    word-break: break-all;
  }

  .gid-buttons {
    display: flex;
    gap: 8px;
  }

  .qr-row {
    display: flex;
    align-items: center;
    gap: 16px;
    padding-top: 10px;
    border-top: 1px solid var(--border-subtle);
  }

  .qr-img {
    width: 110px;
    height: 110px;
    border-radius: 6px;
    background: #fff;
    padding: 4px;
  }

  .qr-info {
    font-size: 12.5px;
    display: flex;
    flex-direction: column;
    gap: 6px;
    color: var(--text-secondary);
  }

  .backup-actions-box {
    margin-top: 20px;
    padding-top: 16px;
    border-top: 1px solid var(--border-subtle);
  }
  .backup-actions-box h3 {
    font-size: 14px;
    margin-bottom: 10px;
  }

  .btn-row {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .file-label {
    cursor: pointer;
  }

  .connector-cards {
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin-bottom: 16px;
  }

  .conn-card {
    padding: 12px;
    border-radius: 6px;
    background: var(--bg-canvas);
    border: 1px solid var(--border-subtle);
    font-size: 12.5px;
    color: var(--text-secondary);
  }

  .conn-title {
    display: flex;
    align-items: center;
    gap: 8px;
    color: var(--text-primary);
    margin-bottom: 4px;
  }

  .conn-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
  }
  .conn-dot.active {
    background: var(--income);
  }
  .conn-dot.ready {
    background: var(--accent-primary);
  }
  .conn-dot.planned {
    background: var(--text-muted, #94a3b8);
  }
  .conn-dot.error {
    background: var(--expense);
  }

  .connector-run {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 4px 0;
    border-top: 1px solid var(--border-subtle);
  }

  .btn-xs {
    padding: 2px 8px;
    font-size: 11px;
    margin-left: auto;
  }

  .text-danger {
    color: var(--expense);
  }

  .logs-box h4 {
    font-size: 12px;
    color: var(--text-secondary);
    margin-bottom: 6px;
  }

  .logs-scroll {
    background: var(--bg-canvas);
    border: 1px solid var(--border-subtle);
    border-radius: 6px;
    padding: 10px;
    height: 140px;
    overflow-y: auto;
    font-size: 11.5px;
  }

  /* DRAWER */
  .drawer-backdrop {
    position: fixed;
    inset: 0;
    background: var(--backdrop-bg);
    backdrop-filter: blur(2px);
    z-index: 50;
    display: flex;
    justify-content: flex-end;
  }

  .drawer-panel {
    width: 440px;
    max-width: 95vw;
    height: 100vh;
    background: var(--bg-surface);
    border-left: 1px solid var(--border-strong);
    padding: 20px;
    display: flex;
    flex-direction: column;
    overflow-y: auto;
  }

  .drawer-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-bottom: 14px;
    border-bottom: 1px solid var(--border-subtle);
    margin-bottom: 16px;
  }

  .close-btn {
    font-size: 16px;
    color: var(--text-secondary);
    padding: 4px 8px;
  }

  .drawer-form {
    display: flex;
    flex-direction: column;
    gap: 14px;
    flex: 1;
  }

  .mode-switch {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 6px;
    background: var(--bg-canvas);
    padding: 4px;
    border-radius: 6px;
    border: 1px solid var(--border-subtle);
  }

  .mode-btn {
    padding: 7px;
    border-radius: 4px;
    font-size: 12.5px;
    font-weight: 600;
    color: var(--text-secondary);
  }
  .mode-btn.expense.active {
    background: var(--expense-bg);
    color: var(--expense);
  }
  .mode-btn.income.active {
    background: var(--income-bg);
    color: var(--income);
  }
  .mode-btn.transfer.active {
    background: var(--accent-primary-bg);
    color: var(--accent-primary);
  }

  .drawer-footer {
    margin-top: auto;
    padding-top: 16px;
    border-top: 1px solid var(--border-subtle);
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .spacer {
    flex: 1;
  }

  .empty-state {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text-secondary);
  }
</style>
