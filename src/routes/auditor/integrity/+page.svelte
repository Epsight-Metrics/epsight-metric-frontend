<script>
  import { t } from '$lib/i18n.js';
  import { getInspections } from '$lib/api/audit.js';
  import { onMount, onDestroy } from 'svelte';
  import { cache } from '$lib/stores/cache.js';
  import { AlertTriangle, ShieldCheck, ShieldAlert } from '@lucide/svelte';

  let records = $state([]);
  let loading = $state(true);
  let error = $state('');

  let dateFrom = $state('');
  let dateTo = $state('');
  let activeQuickFilter = $state('');
  let isQuickFilterActive = false;

  // Pagination states
  let page = $state(1);
  let limit = $state(10);
  let totalPages = $derived(Math.ceil(records.length / limit) || 1);
  let paginatedRecords = $derived(records.slice((page - 1) * limit, page * limit));

  let totalRecords = $derived(records.length);
  let validCount = $derived(records.filter(r => r.integrity === 'valid').length);
  let warningCount = $derived(records.filter(r => r.integrity === 'warning').length);
  let integrityRate = $derived(totalRecords > 0 ? ((validCount / totalRecords) * 100).toFixed(1) : '0');

  let abortController;

  async function fetchIntegrity() {
    if (abortController) {
      abortController.abort();
    }
    abortController = new AbortController();

    loading = true;
    error = '';
    try {
      const params = { limit: 1000 };
      if (dateFrom) params.dateFrom = `${dateFrom}T00:00:00`;
      if (dateTo) params.dateTo = `${dateTo}T23:59:59`;

      const cacheKey = `auditor_integrity_${JSON.stringify(params)}`;
      const cached = cache.get(cacheKey);
      if (cached) {
        records = cached;
        loading = false;
        return;
      }

      const result = await getInspections(params, { signal: abortController.signal });
      const inspections = result.data || [];
      
      const mapped = inspections.map(item => {
        const hasHash = item.hash && item.hash !== null;
        let integrity = 'valid';
        if (!hasHash) {
          integrity = 'warning';
        }
        
        return {
          id: item.id,
          partName: item.part?.partName || '-',
          partCode: item.part?.partCode || '-',
          timestamp: new Date(item.timestamp).toLocaleString('id-ID'),
          hash: item.hash || 'No hash (legacy data)',
          configVersion: item.configVersion || 'v1.0',
          status: (item.status === 'GOOD' || item.status === 'OK') ? 'OK' : 'NG',
          integrity,
          operator: item.operator?.name || '-',
          hasHash,
        };
      });

      records = mapped;
      cache.set(cacheKey, mapped);
    } catch (err) {
      if (err.name === 'AbortError') return;
      error = err.message;
    } finally {
      if (abortController && abortController.signal.aborted) return;
      loading = false;
    }
  }

  onDestroy(() => {
    if (abortController) {
      abortController.abort();
    }
  });

  function setQuickFilter(type) {
    isQuickFilterActive = true;
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    dateTo = `${year}-${month}-${day}`;
    
    if (type === 'today') {
      dateFrom = dateTo;
      activeQuickFilter = 'today';
    } else if (type === 'week') {
      const weekAgo = new Date(today);
      weekAgo.setDate(today.getDate() - 7);
      const wYear = weekAgo.getFullYear();
      const wMonth = String(weekAgo.getMonth() + 1).padStart(2, '0');
      const wDay = String(weekAgo.getDate()).padStart(2, '0');
      dateFrom = `${wYear}-${wMonth}-${wDay}`;
      activeQuickFilter = 'week';
    } else if (type === 'month') {
      const monthAgo = new Date(today);
      monthAgo.setMonth(today.getMonth() - 1);
      const mYear = monthAgo.getFullYear();
      const mMonth = String(monthAgo.getMonth() + 1).padStart(2, '0');
      const mDay = String(monthAgo.getDate()).padStart(2, '0');
      dateFrom = `${mYear}-${mMonth}-${mDay}`;
      activeQuickFilter = 'month';
    }
  }

  function goToPage(p) {
    page = p;
  }

  onMount(() => {
    fetchIntegrity();
  });

  let searchTimer;
  $effect(() => {
    dateFrom; dateTo;
    if (!isQuickFilterActive && activeQuickFilter) {
      activeQuickFilter = '';
    }
    isQuickFilterActive = false;
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      page = 1;
      fetchIntegrity();
    }, 300);
  });
</script>

<svelte:head><title>{$t('auditor.data_integrity')} — EPSON QC</title></svelte:head>

<div class="page animate-fade-in">
  <h1 class="page-title">{$t('auditor.data_integrity')}</h1>
  <p class="subtitle">
    Verifikasi integritas data inspeksi menggunakan SHA256 hash. 
    {#if records.some(r => !r.hasHash)}
      <span class="info-badge">
        <AlertTriangle size={12} class="inline-icon" />
        Beberapa data legacy belum memiliki hash
      </span>
    {/if}
  </p>

  <div class="filter-row">
    <div class="quick-filters">
      <button class="quick-btn" class:active={activeQuickFilter === 'today'} onclick={() => setQuickFilter('today')}>Hari Ini</button>
      <button class="quick-btn" class:active={activeQuickFilter === 'week'} onclick={() => setQuickFilter('week')}>Minggu Ini</button>
      <button class="quick-btn" class:active={activeQuickFilter === 'month'} onclick={() => setQuickFilter('month')}>Bulan Ini</button>
    </div>
    <div class="date-filter-group">
      <span class="date-label">Dari:</span>
      <input type="date" class="date-input" bind:value={dateFrom} />
    </div>
    <div class="date-filter-group">
      <span class="date-label">Sampai:</span>
      <input type="date" class="date-input" bind:value={dateTo} />
    </div>
  </div>

  {#if dateFrom || dateTo}
    <div class="date-range-info">
      Data rentang waktu {dateFrom || '...'} ke {dateTo || '...'}
    </div>
  {/if}
  {#if error}
    <div class="error-banner">{error}</div>
  {/if}

  {#if loading}
    <div class="loading-state">{$t('common.loading')}</div>
  {:else}
  <!-- Summary Cards -->
  <div class="summary-grid">
    <div class="card summary-card">
      <span class="summary-icon"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M7 17v-4"/><path d="M12 17V9"/><path d="M17 17v-6"/></svg></span>
      <span class="summary-val">{totalRecords}</span>
      <span class="summary-label">{$t('auditor.total_records')}</span>
    </div>
    <div class="card summary-card ok-card">
      <span class="summary-icon"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon-ok"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg></span>
      <span class="summary-val">{validCount}</span>
      <span class="summary-label">{$t('auditor.valid')}</span>
    </div>
    <div class="card summary-card warn-card">
      <span class="summary-icon"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon-warn"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg></span>
      <span class="summary-val">{warningCount}</span>
      <span class="summary-label">{$t('auditor.warning')}</span>
    </div>
    <div class="card summary-card">
      <span class="summary-icon"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg></span>
      <span class="summary-val">{integrityRate}%</span>
      <span class="summary-label">{$t('auditor.integrity_rate')}</span>
    </div>
  </div>

  <!-- Records Table -->
  <div class="table-container">
    <table>
      <thead>
        <tr>
          <th>ID</th>
          <th>Part</th>
          <th>Operator</th>
          <th>Timestamp</th>
          <th>Hash</th>
          <th>Config</th>
          <th>Status</th>
          <th>Integritas</th>
        </tr>
      </thead>
      <tbody>
        {#each paginatedRecords as record}
          <tr>
            <td><code>{record.id}</code></td>
            <td>
              <strong>{record.partName}</strong><br/>
              <span class="dim">{record.partCode}</span>
            </td>
            <td>{record.operator}</td>
            <td class="dim">{record.timestamp}</td>
            <td><code class="hash">{record.hash}</code></td>
            <td>{record.configVersion}</td>
            <td><span class="badge" class:badge-ok={record.status === 'OK'} class:badge-ng={record.status === 'NG'}>{record.status}</span></td>
            <td>
              <span class="integrity-badge" class:valid={record.integrity === 'valid'} class:warn={record.integrity === 'warning'}>
                {#if record.hasHash}
                  <ShieldCheck size={13} class="inline-icon" /> Valid
                {:else}
                  <ShieldAlert size={13} class="inline-icon" /> No Hash
                {/if}
              </span>
            </td>
          </tr>
        {/each}
        {#if records.length === 0}
          <tr><td colspan="8" class="no-data">{$t('common.no_data')}</td></tr>
        {/if}
      </tbody>
    </table>
  </div>

  <div class="table-footer">
    <span>{$t('common.showing')} {records.length > 0 ? (page-1)*limit + 1 : 0}-{Math.min(page*limit, records.length)} {$t('common.of')} {records.length}</span>
    {#if totalPages > 1}
      <div class="pagination">
        <button class="btn btn-ghost" disabled={page <= 1} onclick={() => goToPage(page - 1)}>{$t('common.prev')}</button>
        <span class="page-num">{page}/{totalPages}</span>
        <button class="btn btn-ghost" disabled={page >= totalPages} onclick={() => goToPage(page + 1)}>{$t('common.next')}</button>
      </div>
    {/if}
  </div>
  {/if}
</div>

<style>
  .page-title { font-size: var(--fs-xl); font-weight: var(--fw-semibold); margin-bottom: var(--sp-2); }
  .subtitle { color: var(--clr-text-dim); font-size: var(--fs-sm); margin-bottom: var(--sp-5); }
  .info-badge { 
    display: inline-flex;
    align-items: center;
    gap: 4px;
    background: rgba(251, 191, 36, 0.1); 
    color: var(--clr-warning);
    padding: 3px 8px; 
    border-radius: var(--radius-sm); 
    font-size: var(--fs-xs);
    margin-left: var(--sp-2);
    vertical-align: middle;
  }
  .filter-row { display: flex; gap: var(--sp-3); margin-bottom: var(--sp-4); flex-wrap: wrap; align-items: center; }
  .quick-filters { display: flex; gap: var(--sp-2); }
  .quick-btn {
    padding: var(--sp-2) var(--sp-3);
    font-family: var(--font-family);
    font-size: var(--fs-xs);
    font-weight: var(--fw-medium);
    color: var(--clr-text-muted);
    background: var(--clr-surface);
    border: 1px solid var(--clr-border);
    border-radius: var(--radius-md);
    cursor: pointer;
    transition: all var(--transition-fast);
  }
  .quick-btn:hover {
    background: var(--clr-surface-2);
    border-color: var(--clr-border-light);
  }
  .quick-btn.active {
    background: var(--clr-accent);
    color: white;
    border-color: var(--clr-accent);
  }
  .quick-btn:active {
    transform: scale(0.98);
  }
  .date-filter-group { display: flex; align-items: center; gap: var(--sp-2); }
  .date-label { font-size: var(--fs-sm); color: var(--clr-text-muted); font-weight: var(--fw-medium); white-space: nowrap; }
  .date-input {
    padding: var(--sp-2) var(--sp-3);
    font-family: var(--font-family);
    font-size: var(--fs-sm);
    color: var(--clr-text);
    background: var(--clr-surface);
    border: 1px solid var(--clr-border);
    border-radius: var(--radius-md);
    cursor: pointer;
    transition: all var(--transition-fast);
  }
  .date-input:hover { border-color: var(--clr-border-light); }
  .date-input:focus {
    outline: none;
    border-color: var(--clr-accent);
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }
  .date-range-info {
    font-size: var(--fs-sm);
    color: var(--clr-text-muted);
    padding: var(--sp-2) var(--sp-3);
    background: var(--clr-surface);
    border-left: 3px solid var(--clr-accent);
    border-radius: var(--radius-sm);
    margin-bottom: var(--sp-3);
  }
  .error-banner { padding: var(--sp-3); background: var(--clr-ng-bg); color: var(--clr-ng); border-radius: var(--radius-md); font-size: var(--fs-sm); margin-bottom: var(--sp-4); border: 1px solid rgba(239,68,68,0.2); }
  .loading-state { padding: var(--sp-8); text-align: center; color: var(--clr-text-muted); }
  .no-data { text-align: center; color: var(--clr-text-dim); padding: var(--sp-8) !important; }
  .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: var(--sp-4); margin-bottom: var(--sp-6); }
  .summary-card {
    display: flex; flex-direction: column; align-items: center; text-align: center; padding: var(--sp-5);
    transition: all var(--transition-fast);
  }
  .summary-card:hover { transform: translateY(-2px); box-shadow: var(--shadow-md); }
  .ok-card { border-top: 3px solid var(--clr-ok); }
  .warn-card { border-top: 3px solid var(--clr-warning); }
  .summary-icon { display: flex; color: var(--clr-text-muted); margin-bottom: var(--sp-2); }
  .icon-ok { color: var(--clr-ok); }
  .icon-warn { color: var(--clr-warning); }
  .summary-val { font-size: var(--fs-2xl); font-weight: var(--fw-bold); }
  .summary-label { font-size: var(--fs-xs); color: var(--clr-text-muted); text-transform: uppercase; letter-spacing: 0.5px; }
  .dim { color: var(--clr-text-dim); font-size: var(--fs-xs); }
  code { background: var(--clr-surface-2); padding: 1px 6px; border-radius: 4px; font-size: var(--fs-xs); }
  .hash { color: var(--clr-accent-hover); }
  .integrity-badge {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: var(--fs-xs);
    font-weight: var(--fw-medium);
    padding: 3px 8px;
    border-radius: var(--radius-sm);
  }
  .integrity-badge.valid { color: var(--clr-ok); background: var(--clr-ok-bg); }
  .integrity-badge.warn { color: var(--clr-warning); background: rgba(251, 191, 36, 0.1); }
  .integrity-badge :global(.inline-icon), .info-badge :global(.inline-icon) {
    display: inline-block;
    vertical-align: middle;
  }
  .table-footer { margin-top: var(--sp-3); font-size: var(--fs-xs); color: var(--clr-text-dim); display: flex; justify-content: space-between; align-items: center; }
  .pagination { display: flex; align-items: center; gap: var(--sp-2); }
  .page-num { font-weight: var(--fw-medium); color: var(--clr-text-muted); }
  .page { display: flex; flex-direction: column; flex: 1; overflow: hidden; height: 100%; }
  .table-container { flex: 1; overflow-y: auto; overflow-x: auto; }

  @media (max-width: 768px) {
    .summary-grid {
      grid-template-columns: repeat(2, 1fr);
      gap: var(--sp-3);
    }
    .filter-row {
      flex-direction: column;
      align-items: stretch;
      gap: var(--sp-2);
    }
    .quick-filters,
    .date-filter-group {
      max-width: 100% !important;
      width: 100% !important;
      flex: 1 1 100%;
    }
    .quick-btn {
      flex: 1;
      text-align: center;
    }
    .info-badge {
      display: block;
      margin-left: 0;
      margin-top: var(--sp-2);
      width: fit-content;
    }
  }

  @media (max-width: 480px) {
    .summary-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
