<script>
  import { t } from '$lib/i18n.js';
  import { Download, FileText, Search, Camera, BarChart2 } from '@lucide/svelte';
  import { getInspections, exportData } from '$lib/api/audit.js';
  import { onMount, onDestroy } from 'svelte';
  import { cache } from '$lib/stores/cache.js';

  let inspections = $state([]);
  let page = $state(1);
  let limit = $state(100);
  let total = $state(0);
  let loading = $state(true);
  let error = $state('');
  let filterPart = $state('');
  let filterPartCode = $state('');
  let filterStatus = $state('');
  let dateFrom = $state('');
  let dateTo = $state('');
  let activeQuickFilter = $state('');
  let selectedInspection = $state(null);
  let showDetailModal = $state(false);

  let totalPages = $derived(Math.ceil(total / limit) || 1);
  let abortController;

  async function fetchInspections() {
    if (abortController) {
      abortController.abort();
    }
    abortController = new AbortController();

    loading = true;
    error = '';
    try {
      const params = { page, limit };
      if (filterPart) params.partName = filterPart;
      if (filterPartCode) params.partCode = filterPartCode;
      if (filterStatus) params.status = filterStatus;
      if (dateFrom) params.dateFrom = `${dateFrom}T00:00:00`;
      if (dateTo) params.dateTo = `${dateTo}T23:59:59`;

      const cacheKey = `auditor_logs_${JSON.stringify(params)}`;
      const cached = cache.get(cacheKey);
      if (cached) {
        inspections = cached.inspections;
        total = cached.total;
        loading = false;
        return;
      }

      const result = await getInspections(params, { signal: abortController.signal });
      const mapped = (result.data || []).map(item => ({
        id: item.id,
        timestamp: new Date(item.timestamp).toLocaleString('id-ID'),
        rawTimestamp: item.timestamp,
        partName: item.part?.partName || '-',
        partCode: item.part?.partCode || '-',
        vendor: item.part?.vendorName || '-',
        status: (item.status === 'GOOD' || item.status === 'OK') ? 'OK' : 'NG',
        operator: item.operator?.name || '-',
        operatorUsername: item.operator?.username || '-',
        dimensions: item.nilaiDimensi || {},
        imagePath: item.imagePath,
        sessionId: item.sessionId,
        idPart: item.idPart,
        matchedRef: item.matchedRef,
      }));
      inspections = mapped;
      total = result.total || 0;

      cache.set(cacheKey, { inspections: mapped, total: result.total || 0 });
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

  async function handleExport(format) {
    try {
      const params = { format };
      if (filterPart) params.partName = filterPart;
      if (filterPartCode) params.partCode = filterPartCode;
      if (filterStatus) params.status = filterStatus;
      if (dateFrom) params.dateFrom = `${dateFrom}T00:00:00`;
      if (dateTo) params.dateTo = `${dateTo}T23:59:59`;
      const blob = await exportData(params);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit_inspections.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      error = err.message;
    }
  }

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

  function viewDetail(inspection) {
    selectedInspection = inspection;
    showDetailModal = true;
  }

  function goToPage(p) {
    page = p;
    fetchInspections();
  }

  onMount(() => {
    fetchInspections();
  });

  let searchTimer;
  let isQuickFilterActive = false;
  
  $effect(() => {
    filterPart; filterPartCode; filterStatus;
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      page = 1;
      fetchInspections();
    }, 300);
  });

  $effect(() => {
    dateFrom; dateTo;
    if (!isQuickFilterActive && activeQuickFilter) {
      activeQuickFilter = '';
    }
    isQuickFilterActive = false;
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      page = 1;
      fetchInspections();
    }, 300);
  });
</script>

<svelte:head><title>{$t('auditor.inspection_logs')} — EPSON QC</title></svelte:head>

<div class="page animate-fade-in">
  <div class="page-header">
    <h1 class="page-title">{$t('auditor.inspection_logs')}</h1>
    <div class="export-btns">
      <button class="btn btn-secondary" onclick={() => handleExport('csv')}><Download size={15} />{$t('auditor.export_csv')}</button>
      <button class="btn btn-secondary" onclick={() => handleExport('pdf')}><FileText size={15} />{$t('auditor.export_pdf')}</button>
    </div>
  </div>

  {#if error}
    <div class="error-banner">{error}</div>
  {/if}

  <div class="filter-row">
    <input class="input filter-input" placeholder="Part Name..." bind:value={filterPart} />
    <input class="input filter-input" placeholder="Part Code..." bind:value={filterPartCode} />
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

  {#if loading}
    <div class="loading-state">{$t('common.loading')}</div>
  {:else}
  <div class="table-container">
    <table>
      <thead>
        <tr>
          <th>ID</th>
          <th>Waktu</th>
          <th>Part</th>
          <th>Vendor</th>
          <th>Status</th>
          <th>Operator</th>
          <th>Evidence</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {#each inspections as item}
          <tr>
            <td><code>#{item.id}</code></td>
            <td class="dim">{item.timestamp}</td>
            <td><strong>{item.partName}</strong><br/><span class="dim">{item.partCode}</span></td>
            <td>{item.vendor}</td>
            <td><span class="badge" class:badge-ok={item.status === 'OK'} class:badge-ng={item.status === 'NG'}>{item.status}</span></td>
            <td>{item.operator}<br/><span class="dim">{item.operatorUsername}</span></td>
            <td>
              <div class="evidence-cell">
                {#if item.imagePath}
                  <span class="evidence-icon-wrapper" title="Photo Evidence">
                    <Camera size={15} class="text-blue-500" />
                  </span>
                {/if}
                {#if Object.keys(item.dimensions).length > 0}
                  <span class="evidence-icon-wrapper" title="Measurement Data">
                    <BarChart2 size={15} class="text-emerald-500" />
                  </span>
                {/if}
              </div>
            </td>
            <td>
              <button class="btn-icon btn-view" title="View Detail" onclick={() => viewDetail(item)}>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
              </button>
            </td>
          </tr>
        {/each}
        {#if inspections.length === 0}
          <tr><td colspan="8" class="no-data">{$t('common.no_data')}</td></tr>
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

<!-- Detail Modal -->
{#if showDetailModal && selectedInspection}
  <div 
    class="modal-backdrop" 
    role="button" 
    tabindex="-1" 
    onclick={(e) => { if (e.target === e.currentTarget) showDetailModal = false; }}
    onkeydown={(e) => { if (e.key === 'Escape') showDetailModal = false; }}
  >
    <div class="modal animate-fade-in">
      <div class="modal-header">
        <h2 class="modal-title">Inspection Evidence #{selectedInspection.id}</h2>
        <button class="btn-close" onclick={() => showDetailModal = false}>✕</button>
      </div>
      
      <div class="modal-body">
        <div class="detail-section">
          <h3 class="section-title">Basic Info</h3>
          <div class="detail-grid">
            <div><span class="label">Timestamp:</span> {selectedInspection.timestamp}</div>
            <div><span class="label">Operator:</span> {selectedInspection.operator}</div>
            <div><span class="label">Status:</span> <span class="badge" class:badge-ok={selectedInspection.status === 'OK'} class:badge-ng={selectedInspection.status === 'NG'}>{selectedInspection.status}</span></div>
            <div><span class="label">Session ID:</span> <code>{selectedInspection.sessionId || '-'}</code></div>
          </div>
        </div>

        <div class="detail-section">
          <h3 class="section-title">Part Info</h3>
          <div class="detail-grid">
            <div><span class="label">Part Code:</span> <code>{selectedInspection.partCode}</code></div>
            <div><span class="label">Part Name:</span> {selectedInspection.partName}</div>
            <div><span class="label">Vendor:</span> {selectedInspection.vendor}</div>
            <div><span class="label">ID Part:</span> {selectedInspection.idPart || '-'}</div>
          </div>
        </div>

        {#if Object.keys(selectedInspection.dimensions).length > 0}
          <div class="detail-section">
            <h3 class="section-title">Measurements</h3>
            <div class="measurements-grid">
              {#each Object.entries(selectedInspection.dimensions) as [key, val]}
                <div class="measurement-item">
                  <span class="measurement-key">{key}:</span>
                  <span class="measurement-val">{val} mm</span>
                </div>
              {/each}
            </div>
          </div>
        {/if}

        {#if selectedInspection.imagePath}
          <div class="detail-section">
            <h3 class="section-title">Evidence Photo</h3>
            <img src={selectedInspection.imagePath} alt="Evidence" class="evidence-img" onerror={(e) => e.target.style.display='none'} />
          </div>
        {:else}
          <div class="detail-section">
            <h3 class="section-title">Evidence Photo</h3>
            <div class="no-evidence">
              <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="opacity: 0.3;"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
              <p>Tidak ada foto evidence</p>
            </div>
          </div>
        {/if}
      </div>
    </div>
  </div>
{/if}

<style>
  .page-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--sp-5); flex-wrap: wrap; gap: var(--sp-3); }
  .page-title { font-family: var(--font-heading); font-size: var(--fs-2xl); font-weight: var(--fw-semibold); }
  .export-btns { display: flex; gap: var(--sp-2); }
  .filter-row { display: flex; gap: var(--sp-3); margin-bottom: var(--sp-4); flex-wrap: wrap; align-items: center; }
  .filter-input { max-width: 200px; min-height: 44px; }
  .filter-select { max-width: 180px; min-height: 44px; }
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
  .evidence-cell { display: flex; gap: var(--sp-1); align-items: center; }
  .evidence-icon-wrapper {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 26px;
    height: 26px;
    border-radius: var(--radius-md);
    background: var(--clr-surface-2);
    border: 1px solid var(--clr-border);
    transition: all var(--transition-fast);
  }
  .evidence-icon-wrapper:hover {
    background: var(--clr-surface);
    border-color: var(--clr-border-light);
    transform: translateY(-1px);
  }
  .evidence-icon-wrapper :global(svg) {
    display: block;
  }
  .evidence-icon-wrapper :global(.text-blue-500) {
    color: #3b82f6;
  }
  .evidence-icon-wrapper :global(.text-emerald-500) {
    color: #10b981;
  }
  .btn-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    padding: 0;
    border: 1px solid var(--clr-border);
    border-radius: var(--radius-md);
    background: var(--clr-surface);
    cursor: pointer;
    transition: all var(--transition-fast);
  }
  .btn-view {
    color: var(--clr-accent);
  }
  .btn-view:hover {
    background: var(--clr-accent);
    color: white;
    border-color: var(--clr-accent);
  }
  .btn-icon:active { transform: scale(0.95); }
  .dim { color: var(--clr-text-dim); font-size: var(--fs-xs); }
  .error-banner { padding: var(--sp-3); background: var(--clr-ng-bg); color: var(--clr-ng); border-radius: var(--radius-md); font-size: var(--fs-sm); margin-bottom: var(--sp-4); border: 1px solid var(--clr-ng-border); }
  .loading-state { padding: var(--sp-8); text-align: center; color: var(--clr-text-muted); }
  .no-data { text-align: center; color: var(--clr-text-dim); padding: var(--sp-8) !important; }
  code { background: var(--clr-surface-2); padding: 1px 6px; border-radius: 4px; font-size: var(--fs-xs); }
  .table-footer { margin-top: var(--sp-3); font-size: var(--fs-xs); color: var(--clr-text-dim); display: flex; justify-content: space-between; align-items: center; }
  .pagination { display: flex; align-items: center; gap: var(--sp-2); }
  .page-num { font-weight: var(--fw-medium); color: var(--clr-text-muted); }
  
  /* Modal */
  .modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; z-index: 500; padding: var(--sp-4); }
  .modal { background: var(--clr-surface); border: 1px solid var(--clr-border); border-radius: var(--radius-xl); padding: var(--sp-6); width: 100%; max-width: 700px; max-height: 90vh; overflow-y: auto; box-shadow: var(--shadow-lg); }
  .modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--sp-5); }
  .modal-title { font-family: var(--font-heading); font-size: var(--fs-xl); font-weight: var(--fw-semibold); }
  .btn-close { background: none; border: none; font-size: var(--fs-2xl); color: var(--clr-text-dim); cursor: pointer; padding: 0; transition: color 0.2s; line-height: 1; }
  .btn-close:hover { color: var(--clr-text); }
  .modal-body { display: flex; flex-direction: column; gap: var(--sp-5); }
  .detail-section { }
  .section-title { font-size: var(--fs-md); font-weight: var(--fw-semibold); margin-bottom: var(--sp-3); color: var(--clr-text-muted); text-transform: uppercase; letter-spacing: 0.5px; }
  .detail-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: var(--sp-3); font-size: var(--fs-sm); }
  .detail-grid .label { color: var(--clr-text-muted); font-weight: var(--fw-medium); }
  .measurements-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--sp-2); }
  .measurement-item { background: var(--clr-surface-2); padding: var(--sp-2) var(--sp-3); border-radius: var(--radius-md); }
  .measurement-key { font-size: var(--fs-xs); color: var(--clr-text-muted); font-weight: var(--fw-medium); }
  .measurement-val { font-size: var(--fs-sm); font-weight: var(--fw-semibold); display: block; margin-top: var(--sp-1); }
  .evidence-img { width: 100%; max-width: 500px; border-radius: var(--radius-lg); border: 1px solid var(--clr-border); }
  .no-evidence { text-align: center; padding: var(--sp-8); color: var(--clr-text-dim); background: var(--clr-surface-2); border-radius: var(--radius-lg); }
  .no-evidence p { margin-top: var(--sp-2); font-size: var(--fs-sm); }
  .page { display: flex; flex-direction: column; flex: 1; overflow: hidden; height: 100%; }
  .table-container { flex: 1; overflow-y: auto; }
</style>
