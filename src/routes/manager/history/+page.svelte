<script>
  import { t } from '$lib/i18n.js';
  import { Download, FileText } from '@lucide/svelte';
  import { getInspections, exportData } from '$lib/api/manager.js';
  import { onMount } from 'svelte';

  let history = $state([]);
  let filterPart = $state('');
  let filterStatus = $state('');
  let dateFrom = $state('');
  let dateTo = $state('');
  let expandedId = $state(null);
  let page = $state(1);
  let limit = $state(50);
  let total = $state(0);
  let activeQuickFilter = $state('');
  let loading = $state(true);
  let error = $state('');

  let totalPages = $derived(Math.ceil(total / limit) || 1);

  async function fetchHistory() {
    loading = true;
    error = '';
    try {
      const params = { page, limit };
      if (filterPart) params.partName = filterPart;
      if (filterStatus) params.status = filterStatus;
      if (dateFrom) {
        // Tambahkan waktu awal hari untuk dateFrom
        params.dateFrom = `${dateFrom}T00:00:00`;
      }
      if (dateTo) {
        // Tambahkan waktu akhir hari untuk dateTo
        params.dateTo = `${dateTo}T23:59:59`;
      }
      const result = await getInspections(params);
      history = (result.data || []).map(item => ({
        id: item.id,
        timestamp: new Date(item.timestamp).toLocaleString('id-ID'),
        partName: item.part?.partName || '-',
        partCode: item.part?.partCode || '-',
        vendor: item.part?.vendorName || '-',
        dimensions: item.nilaiDimensi || {},
        status: (item.status === 'GOOD' || item.status === 'OK') ? 'OK' : 'NG',
        operator: item.operator?.name || '-',
        configVersion: item.configVersion || '-',
      }));
      total = result.total || 0;
    } catch (err) {
      error = err.message;
    } finally {
      loading = false;
    }
  }

  function toggleExpand(id) { expandedId = expandedId === id ? null : id; }

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

  function clearFilters() {
    filterPart = '';
    filterStatus = '';
    dateFrom = '';
    dateTo = '';
    activeQuickFilter = '';
  }

  async function handleExport(format) {
    try {
      const params = { format };
      if (filterPart) params.partName = filterPart;
      if (filterStatus) params.status = filterStatus;
      if (dateFrom) params.dateFrom = `${dateFrom}T00:00:00`;
      if (dateTo) params.dateTo = `${dateTo}T23:59:59`;
      const blob = await exportData(params);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `inspection_history.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      error = err.message;
    }
  }

  function goToPage(p) {
    page = p;
    fetchHistory();
  }

  onMount(() => {
    fetchHistory();
  });

  let searchTimer;
  let isQuickFilterActive = false;
  
  $effect(() => {
    filterPart; filterStatus;
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      page = 1;
      fetchHistory();
    }, 300);
  });

  $effect(() => {
    dateFrom; dateTo;
    // Reset activeQuickFilter hanya jika bukan dari quick filter
    if (!isQuickFilterActive && activeQuickFilter) {
      activeQuickFilter = '';
    }
    isQuickFilterActive = false;
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      page = 1;
      fetchHistory();
    }, 300);
  });
</script>

<svelte:head><title>{$t('manager.inspection_history')} — EPSON QC</title></svelte:head>

<div class="page animate-fade-in">
  <div class="page-header">
    <h1 class="page-title">{$t('manager.inspection_history')}</h1>
    <div class="export-btns">
      <button class="btn btn-secondary" onclick={() => handleExport('csv')}><Download size={15} />{$t('manager.export_csv')}</button>
      <button class="btn btn-secondary" onclick={() => handleExport('pdf')}><FileText size={15} />{$t('manager.export_pdf')}</button>
    </div>
  </div>

  {#if error}
    <div class="error-banner">{error}</div>
  {/if}

  <div class="filter-row">
    <input class="input filter-input" placeholder="Part Name..." bind:value={filterPart} />
    <select class="select filter-select" bind:value={filterStatus}>
      <option value="">Status: {$t('common.all')}</option>
      <option value="OK">OK</option>
      <option value="NG">NG</option>
    </select>
    <div class="quick-filters">
      <button class="quick-btn" class:active={activeQuickFilter === 'today'} onclick={() => setQuickFilter('today')}>Hari Ini</button>
      <button class="quick-btn" class:active={activeQuickFilter === 'week'} onclick={() => setQuickFilter('week')}>Minggu Ini</button>
      <button class="quick-btn" class:active={activeQuickFilter === 'month'} onclick={() => setQuickFilter('month')}>Bulan Ini</button>
    </div>
    <div class="date-filter-group">
      <label class="date-label">Dari:</label>
      <input type="date" class="date-input" bind:value={dateFrom} />
    </div>
    <div class="date-filter-group">
      <label class="date-label">Sampai:</label>
      <input type="date" class="date-input" bind:value={dateTo} />
    </div>
  </div>

  {#if dateFrom || dateTo}
    <div class="date-range-info">
      Data rentang waktu {dateFrom || '...'} ke {dateTo || '...'}
    </div>
  {/if}

  {#if loading}
    <div class="loading-state">{$t('common.loading')}</div>
  {:else}
  <div class="table-container">
    <table>
      <thead>
        <tr>
          <th></th>
          <th>Waktu</th>
          <th>Part</th>
          <th>Vendor</th>
          <th>Dimensi</th>
          <th>Status</th>
          <th>Operator</th>
        </tr>
      </thead>
      <tbody>
        {#each history as item}
          <tr class="clickable" onclick={() => toggleExpand(item.id)}>
            <td class="expand-icon" style="vertical-align: middle;">
              {#if expandedId === item.id}
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
              {:else}
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
              {/if}
            </td>
            <td class="dim">{item.timestamp}</td>
            <td><strong>{item.partName}</strong></td>
            <td>{item.vendor}</td>
            <td>{Object.values(item.dimensions).slice(0,3).join('×')} mm</td>
            <td><span class="badge" class:badge-ok={item.status === 'OK'} class:badge-ng={item.status === 'NG'}>{item.status}</span></td>
            <td>{item.operator}</td>
          </tr>
          {#if expandedId === item.id}
            <tr class="detail-row animate-fade-in">
              <td colspan="7">
                <div class="detail-grid">
                  <div><span class="dl">ID:</span> {item.id}</div>
                  <div><span class="dl">Part Code:</span> {item.partCode}</div>
                  {#each Object.entries(item.dimensions) as [key, val]}
                    <div><span class="dl">{key}:</span> {val} mm</div>
                  {/each}
                  <div><span class="dl">Config:</span> {item.configVersion}</div>
                </div>
              </td>
            </tr>
          {/if}
        {/each}
        {#if history.length === 0}
          <tr><td colspan="7" class="no-data">{$t('common.no_data')}</td></tr>
        {/if}
      </tbody>
    </table>
  </div>

  <div class="table-footer">
    <span>{$t('common.showing')} {(page-1)*limit + 1}-{Math.min(page*limit, total)} {$t('common.of')} {total}</span>
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
  .page-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--sp-5); flex-wrap: wrap; gap: var(--sp-3); }
  .page-title { font-size: var(--fs-xl); font-weight: var(--fw-semibold); }
  .export-btns { display: flex; gap: var(--sp-2); }
  .filter-row { display: flex; gap: var(--sp-3); margin-bottom: var(--sp-4); flex-wrap: wrap; align-items: center; }
  .filter-input { max-width: 250px; }
  .filter-select { max-width: 200px; }
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
  .date-range-info {
    font-size: var(--fs-sm);
    color: var(--clr-text-muted);
    padding: var(--sp-2) var(--sp-3);
    background: var(--clr-surface);
    border-left: 3px solid var(--clr-accent);
    border-radius: var(--radius-sm);
    margin-bottom: var(--sp-3);
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
  .date-input:hover {
    border-color: var(--clr-border-light);
  }
  .date-input:focus {
    outline: none;
    border-color: var(--clr-accent);
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }
  .clickable { cursor: pointer; }
  .clickable:hover { background: var(--clr-surface-2); }
  .expand-icon { color: var(--clr-text-dim); font-size: var(--fs-xs); width: 24px; }
  .dim { color: var(--clr-text-dim); font-size: var(--fs-xs); }
  .detail-row td { padding: var(--sp-4) !important; background: var(--clr-surface-2); }
  .detail-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--sp-3); font-size: var(--fs-sm); }
  .dl { color: var(--clr-text-muted); font-weight: var(--fw-medium); }
  .error-banner { padding: var(--sp-3); background: var(--clr-ng-bg); color: var(--clr-ng); border-radius: var(--radius-md); font-size: var(--fs-sm); margin-bottom: var(--sp-4); border: 1px solid rgba(239,68,68,0.2); }
  .loading-state { padding: var(--sp-8); text-align: center; color: var(--clr-text-muted); }
  .no-data { text-align: center; color: var(--clr-text-dim); padding: var(--sp-8) !important; }
  .table-footer { margin-top: var(--sp-3); font-size: var(--fs-xs); color: var(--clr-text-dim); display: flex; justify-content: space-between; align-items: center; }
  .pagination { display: flex; align-items: center; gap: var(--sp-2); }
  .page-num { font-weight: var(--fw-medium); color: var(--clr-text-muted); }
</style>
