<script>
  import { t } from '$lib/i18n.js';
  import { getInspections } from '$lib/api/manager.js';
  import { onMount, onDestroy } from 'svelte';
  import { cache } from '$lib/stores/cache.js';

  let alerts = $state([]);
  let filterPart = $state('');
  let dateFrom = $state('');
  let dateTo = $state('');
  let activeQuickFilter = $state('');
  let loading = $state(true);
  let error = $state('');
  let abortController;

  async function fetchAlerts() {
    if (abortController) {
      abortController.abort();
    }
    abortController = new AbortController();

    loading = true;
    error = '';
    try {
      const params = { limit: 100, status: 'NG' };
      if (filterPart) params.partName = filterPart;
      if (dateFrom) params.dateFrom = `${dateFrom}T00:00:00`;
      if (dateTo) params.dateTo = `${dateTo}T23:59:59`;

      const cacheKey = `manager_alerts_${JSON.stringify(params)}`;
      const cached = cache.get(cacheKey);
      if (cached) {
        alerts = cached;
        loading = false;
        return;
      }

      const result = await getInspections(params, { signal: abortController.signal });
      const mapped = (result.data || []).map(item => ({
        id: item.id,
        timestamp: new Date(item.timestamp).toLocaleString('id-ID'),
        partName: item.part?.partName || '-',
        partCode: item.part?.partCode || '-',
        vendor: item.part?.vendorName || '-',
        operator: item.operator?.name || '-',
        dimensions: item.nilaiDimensi || {},
      }));

      alerts = mapped;
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

  function clearFilters() {
    filterPart = '';
    dateFrom = '';
    dateTo = '';
    activeQuickFilter = '';
  }

  onMount(() => {
    fetchAlerts();
  });

  let searchTimer;
  let isQuickFilterActive = false;
  
  $effect(() => {
    filterPart;
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      fetchAlerts();
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
      fetchAlerts();
    }, 300);
  });
  // Helper to format dimensions and ignore coordinates/debug fields
  function formatDimensions(dimensions) {
    const debugKeys = ['contour', 'bbox', 'rot_box', 'center'];
    return Object.entries(dimensions || {})
      .filter(([key]) => {
        const lowerKey = key.toLowerCase();
        return !debugKeys.some(dk => lowerKey.includes(dk));
      })
      .map(([key, val]) => {
        let displayKey = key.replace(/_/g, ' ');
        let unit = '';

        if (key.endsWith('_mm')) {
          displayKey = displayKey.replace(' mm', '');
          unit = ' mm';
        } else if (key.endsWith('_mm2')) {
          displayKey = displayKey.replace(' mm2', '');
          unit = ' mm²';
        } else if (key.endsWith('_px')) {
          displayKey = displayKey.replace(' px', '');
          unit = ' px';
        } else if (['width', 'height', 'diameter', 'radius', 'perimeter'].includes(key.toLowerCase())) {
          unit = ' mm';
        }

        let displayVal = val;
        if (typeof val === 'number') {
          displayVal = val.toFixed(2);
        } else if (typeof val === 'string' && val.trim() !== '' && !isNaN(Number(val))) {
          displayVal = Number(val).toFixed(2);
        }

        return {
          key: displayKey,
          value: displayVal,
          unit: unit
        };
      });
  }
</script>

<svelte:head><title>{$t('manager.alert_summary')} — EPSON QC</title></svelte:head>

<div class="page animate-fade-in">
  <h1 class="page-title">{$t('manager.alert_summary')}</h1>

  {#if error}
    <div class="error-banner">{error}</div>
  {/if}

  <div class="filter-row">
    <input class="input filter-input" placeholder="Part Name..." bind:value={filterPart} />
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
  <div class="alerts-grid">
    {#each alerts as alert}
      <div class="alert-card animate-fade-in">
        <div class="alert-header">
          <span class="alert-icon"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg></span>
          <span class="alert-time">{alert.timestamp}</span>
        </div>
        <div class="alert-body">
          <h3 class="alert-part">{alert.partName}</h3>
          <p class="alert-detail">Part Code: <code>{alert.partCode}</code></p>
          <p class="alert-detail">Vendor: {alert.vendor}</p>
          <p class="alert-detail">Operator: {alert.operator}</p>
          <div class="alert-dims">
            {#each formatDimensions(alert.dimensions) as dim}
              <span class="dim-badge">{dim.key}: {dim.value}{dim.unit}</span>
            {/each}
          </div>
        </div>
      </div>
    {/each}
    {#if alerts.length === 0}
      <div class="no-alerts">
        <span class="no-alerts-icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--clr-ok)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="opacity: 0.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
        </span>
        <p>Tidak ada peringatan NG</p>
      </div>
    {/if}
  </div>
  {/if}
</div>

<style>
  .page-title { font-size: var(--fs-xl); font-weight: var(--fw-semibold); margin-bottom: var(--sp-5); }
  .filter-row { display: flex; gap: var(--sp-3); margin-bottom: var(--sp-4); flex-wrap: wrap; align-items: center; }
  .filter-input { max-width: 250px; }
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
  .error-banner { padding: var(--sp-3); background: var(--clr-ng-bg); color: var(--clr-ng); border-radius: var(--radius-md); font-size: var(--fs-sm); margin-bottom: var(--sp-4); border: 1px solid rgba(239,68,68,0.2); }
  .loading-state { padding: var(--sp-8); text-align: center; color: var(--clr-text-muted); }
  .alerts-grid { flex: 1; overflow-y: auto; display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: var(--sp-4); align-content: start; }
  .alert-card { background: var(--clr-surface); border: 1px solid var(--clr-border); border-left: 3px solid var(--clr-ng); border-radius: var(--radius-lg); padding: var(--sp-4); }
  .alert-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--sp-3); }
  .alert-icon { display: flex; color: var(--clr-warning); }
  .alert-time { font-size: var(--fs-xs); color: var(--clr-text-dim); }
  .alert-part { font-size: var(--fs-md); font-weight: var(--fw-semibold); margin-bottom: var(--sp-2); }
  .alert-detail { font-size: var(--fs-sm); color: var(--clr-text-muted); margin-bottom: var(--sp-1); }
  .alert-dims { display: flex; flex-wrap: wrap; gap: var(--sp-1); margin-top: var(--sp-2); }
  .dim-badge {
    font-size: var(--fs-xs);
    padding: 2px var(--sp-2);
    background: var(--clr-surface-2);
    border-radius: var(--radius-sm);
    max-width: 100%;
    word-break: break-all;
    white-space: normal;
  }
  code { background: var(--clr-surface-2); padding: 1px 6px; border-radius: 4px; font-size: var(--fs-xs); }
  .no-alerts { text-align: center; padding: var(--sp-12); color: var(--clr-text-dim); grid-column: 1 / -1; }
  .no-alerts-icon { font-size: 3rem; display: block; margin-bottom: var(--sp-3); }
  .page { display: flex; flex-direction: column; flex: 1; overflow: hidden; height: 100%; }
</style>
