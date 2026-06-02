<script>
  import { t } from '$lib/i18n.js';
  import { Download, FileText } from '@lucide/svelte';
  import { getInspections, exportData } from '$lib/api/manager.js';
  import { onMount, onDestroy } from 'svelte';
  import { cache } from '$lib/stores/cache.js';

  let history = $state([]);
  let filterPart = $state('');
  let filterStatus = $state('');
  let dateFrom = $state('');
  let dateTo = $state('');
  let selectedInspection = $state(null);
  let showDetailModal = $state(false);
  let page = $state(1);
  let limit = $state(50);
  let total = $state(0);
  let activeQuickFilter = $state('');
  let loading = $state(true);
  let error = $state('');
  let viewMode = $state('list'); // 'list' | 'session'
  let expandedSessionId = $state(null);

  let totalPages = $derived(Math.ceil(total / limit) || 1);
  let abortController;

  let sessions = $derived.by(() => {
    const groups = {};
    history.forEach(item => {
      const sId = item.sessionId || '-';
      if (!groups[sId]) {
        groups[sId] = {
          sessionId: sId,
          operator: item.operator,
          inspections: [],
          okCount: 0,
          ngCount: 0,
          minTime: null,
          maxTime: null
        };
      }
      groups[sId].inspections.push(item);
      if (item.status === 'OK') {
        groups[sId].okCount++;
      } else {
        groups[sId].ngCount++;
      }
      
      const itemTime = item.rawDate;
      if (itemTime) {
        if (!groups[sId].minTime || itemTime < groups[sId].minTime) {
          groups[sId].minTime = itemTime;
        }
        if (!groups[sId].maxTime || itemTime > groups[sId].maxTime) {
          groups[sId].maxTime = itemTime;
        }
      }
    });

    return Object.values(groups).map(g => {
      let timeStr = '-';
      if (g.minTime && g.maxTime) {
        const minStr = g.minTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
        const maxStr = g.maxTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
        const dateStr = g.minTime.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' });
        timeStr = minStr === maxStr ? `${dateStr}, ${minStr}` : `${dateStr}, ${minStr} - ${maxStr}`;
      }
      return {
        ...g,
        timeStr
      };
    });
  });

  function toggleExpandSession(sessionId) {
    expandedSessionId = expandedSessionId === sessionId ? null : sessionId;
  }

  async function fetchHistory() {
    if (abortController) {
      abortController.abort();
    }
    abortController = new AbortController();

    loading = true;
    error = '';
    try {
      const params = { page, limit };
      if (filterPart) params.partName = filterPart;
      if (filterStatus) params.status = filterStatus;
      if (dateFrom) params.dateFrom = `${dateFrom}T00:00:00`;
      if (dateTo) params.dateTo = `${dateTo}T23:59:59`;

      const cacheKey = `manager_history_${JSON.stringify(params)}`;
      const cached = cache.get(cacheKey);
      if (cached) {
        history = cached.history;
        total = cached.total;
        loading = false;
        return;
      }

      const result = await getInspections(params, { signal: abortController.signal });
      const mapped = (result.data || []).map(item => ({
        id: item.id,
        timestamp: new Date(item.timestamp).toLocaleString('id-ID'),
        rawDate: new Date(item.timestamp),
        partName: item.part?.partName || '-',
        partCode: item.part?.partCode || '-',
        vendor: item.part?.vendorName || '-',
        dimensions: item.nilaiDimensi || {},
        status: (item.status === 'GOOD' || item.status === 'OK') ? 'OK' : 'NG',
        operator: item.operator?.name || '-',
        operatorUsername: item.operator?.username || '-',
        configVersion: item.configVersion || '-',
        sessionId: item.sessionId || '-',
        imagePath: item.imagePath,
        idPart: item.idPart,
        matchedRef: item.matchedRef,
      }));
      history = mapped;
      total = result.total || 0;

      cache.set(cacheKey, { history: mapped, total: result.total || 0 });
    } catch (err) {
      if (err.name === 'AbortError') return;
      error = err.message;
    } finally {
      if (abortController && abortController.signal.aborted) return;
      loading = false;
    }
  }

  function viewDetail(inspection) {
    selectedInspection = inspection;
    showDetailModal = true;
  }

  onDestroy(() => {
    if (abortController) {
      abortController.abort();
    }
  });

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

  // Helper to format dimensions summary for table preview
  function getDimensionSummary(dimensions) {
    if (!dimensions) return '-';
    if (dimensions.cvDetail) return dimensions.cvDetail;
    if (dimensions.cvdetail) return dimensions.cvdetail;

    // Unpack nested measurements if present
    const data = (dimensions.measurements && typeof dimensions.measurements === 'object')
      ? dimensions.measurements
      : dimensions;

    if (data.width_mm !== undefined && data.height_mm !== undefined) {
      const w = typeof data.width_mm === 'number' ? data.width_mm.toFixed(2) : data.width_mm;
      const h = typeof data.height_mm === 'number' ? data.height_mm.toFixed(2) : data.height_mm;
      return `${w} × ${h} mm`;
    }
    if (data.diameter_mm !== undefined) {
      const d = typeof data.diameter_mm === 'number' ? data.diameter_mm.toFixed(2) : data.diameter_mm;
      return `Ø ${d} mm`;
    }
    const physical = Object.entries(data)
      .filter(([key]) => {
        const lowerKey = key.toLowerCase();
        return !['contour', 'bbox', 'rot_box', 'center', 'shape', 'vertices', 'measurements', 'deviations', 'references', 'cvdetail', 'referencematched'].some(dk => lowerKey.includes(dk));
      })
      .map(([_, val]) => {
        if (typeof val === 'number') return val.toFixed(2);
        if (typeof val === 'string' && val.trim() !== '' && !isNaN(Number(val))) return Number(val).toFixed(2);
        return val;
      });
    if (physical.length > 0) {
      return physical.slice(0, 3).join(' × ') + ' mm';
    }
    return '-';
  }

  // Parse actual, reference, and deviations for detailed display
  function parseDetailedDimensions(dimensions) {
    if (!dimensions) return [];

    const items = [];

    const formatVal = (val) => {
      if (typeof val === 'number') return val.toFixed(2);
      if (typeof val === 'string' && val.trim() !== '' && !isNaN(Number(val))) return Number(val).toFixed(2);
      return val;
    };

    const getUnit = (key) => {
      if (key.endsWith('_mm')) return ' mm';
      if (key.endsWith('_mm2')) return ' mm²';
      if (key.endsWith('_px')) return ' px';
      if (['width', 'height', 'diameter', 'radius', 'perimeter'].includes(key.toLowerCase())) return ' mm';
      return '';
    };

    const getCleanName = (key) => {
      let name = key.replace(/_/g, ' ');
      if (key.endsWith('_mm')) name = name.replace(' mm', '');
      else if (key.endsWith('_mm2')) name = name.replace(' mm2', '');
      else if (key.endsWith('_px')) name = name.replace(' px', '');
      return name.charAt(0).toUpperCase() + name.slice(1);
    };

    // Check Case B (Nested structure)
    if (dimensions.measurements && typeof dimensions.measurements === 'object') {
      const measurements = dimensions.measurements;
      const deviations = dimensions.deviations || {};
      const references = dimensions.references || {};

      Object.entries(measurements).forEach(([key, actVal]) => {
        if (['contour', 'bbox', 'rot_box', 'center', 'shape', 'vertices'].some(dk => key.toLowerCase().includes(dk))) {
          return;
        }

        const devVal = deviations[key];
        let refVal = references[key];

        if (refVal === undefined && actVal !== undefined && devVal !== undefined) {
          if (typeof actVal === 'number' && typeof devVal === 'number') {
            refVal = actVal - devVal;
          } else if (!isNaN(Number(actVal)) && !isNaN(Number(devVal))) {
            refVal = Number(actVal) - Number(devVal);
          }
        }

        items.push({
          name: getCleanName(key),
          actual: formatVal(actVal),
          reference: refVal !== undefined ? formatVal(refVal) : '-',
          deviation: devVal !== undefined ? formatVal(devVal) : '-',
          unit: getUnit(key)
        });
      });
    } else {
      // Case A (Flat structure)
      Object.entries(dimensions).forEach(([key, val]) => {
        const lowerKey = key.toLowerCase();
        if (
          lowerKey.startsWith('reference_') || 
          lowerKey.startsWith('deviation_') ||
          ['contour', 'bbox', 'rot_box', 'center', 'shape', 'vertices', 'measurements', 'deviations', 'references', 'cvdetail', 'referencematched'].some(dk => lowerKey.includes(dk))
        ) {
          return;
        }

        const refKey = `reference_${key}`;
        const devKey = `deviation_${key}`;

        const actVal = val;
        const refVal = dimensions[refKey];
        const devVal = dimensions[devKey];

        items.push({
          name: getCleanName(key),
          actual: formatVal(actVal),
          reference: refVal !== undefined ? formatVal(refVal) : '-',
          deviation: devVal !== undefined ? formatVal(devVal) : '-',
          unit: getUnit(key)
        });
      });
    }

    return items;
  }
</script>

<svelte:head><title>{$t('manager.inspection_history')} — EPSON QC</title></svelte:head>

<div class="page animate-fade-in">
  <div class="page-header">
    <h1 class="page-title">{$t('manager.inspection_history')}</h1>
    <div style="display: flex; gap: var(--sp-2); align-items: center; flex-wrap: wrap;">
      <div class="view-toggle">
        <button class="toggle-btn" class:active={viewMode === 'list'} onclick={() => viewMode = 'list'}>
          <svg class="toggle-icon" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
          Daftar Inspeksi
        </button>
        <button class="toggle-btn" class:active={viewMode === 'session'} onclick={() => viewMode = 'session'}>
          <svg class="toggle-icon" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          Grup Sesi Kerja
        </button>
      </div>
      <div class="export-btns">
        <button class="btn btn-secondary" onclick={() => handleExport('csv')}><Download size={15} />{$t('manager.export_csv')}</button>
        <button class="btn btn-secondary" onclick={() => handleExport('pdf')}><FileText size={15} />{$t('manager.export_pdf')}</button>
      </div>
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
        {#if viewMode === 'list'}
          <tr>
            <th>Waktu</th>
            <th>Part</th>
            <th>Vendor</th>
            <th>Dimensi</th>
            <th>Status</th>
            <th>Operator</th>
          </tr>
        {:else}
          <tr>
            <th></th>
            <th>ID Sesi</th>
            <th>Operator</th>
            <th>Waktu Sesi</th>
            <th>Total Part</th>
            <th>Hasil Sesi</th>
            <th></th>
          </tr>
        {/if}
      </thead>
      <tbody>
        {#if viewMode === 'list'}
          {#each history as item}
            <tr class="clickable" onclick={() => viewDetail(item)}>
              <td class="dim">{item.timestamp}</td>
              <td><strong>{item.partName}</strong></td>
              <td>{item.vendor}</td>
              <td>{getDimensionSummary(item.dimensions)}</td>
              <td><span class="badge" class:badge-ok={item.status === 'OK'} class:badge-ng={item.status === 'NG'}>{item.status}</span></td>
              <td>{item.operator}</td>
            </tr>
          {/each}
          {#if history.length === 0}
            <tr><td colspan="6" class="no-data">{$t('common.no_data')}</td></tr>
          {/if}
        {:else}
          {#each sessions as session}
            <tr class="clickable" onclick={() => toggleExpandSession(session.sessionId)}>
              <td class="expand-icon" style="vertical-align: middle;">
                {#if expandedSessionId === session.sessionId}
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                {:else}
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
                {/if}
              </td>
              <td><code>{session.sessionId}</code></td>
              <td><strong>{session.operator}</strong></td>
              <td class="dim">{session.timeStr}</td>
              <td>{session.inspections.length} Part</td>
              <td>
                <span class="badge badge-ok">{session.okCount} OK</span>
                {#if session.ngCount > 0}
                  <span class="badge badge-ng" style="margin-left: var(--sp-1);">{session.ngCount} NG</span>
                {/if}
              </td>
              <td></td>
            </tr>
            {#if expandedSessionId === session.sessionId}
              <tr class="detail-row animate-fade-in">
                <td colspan="7">
                  <div class="session-detail-container animate-fade-in">
                    <h4 class="session-subtitle">Daftar Inspeksi Sesi</h4>
                    <div class="session-table-wrapper">
                      <table class="session-inspections-table">
                        <thead>
                          <tr>
                            <th>Waktu</th>
                            <th>Part</th>
                            <th>Vendor</th>
                            <th>Dimensi</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {#each session.inspections as item}
                            <tr class="clickable" onclick={(e) => { e.stopPropagation(); viewDetail(item); }}>
                              <td class="dim">{new Date(item.timestamp).toLocaleTimeString('id-ID')}</td>
                              <td><strong>{item.partName}</strong> (Code: <code>{item.partCode}</code>)</td>
                              <td>{item.vendor}</td>
                              <td>{getDimensionSummary(item.dimensions)}</td>
                              <td><span class="badge" class:badge-ok={item.status === 'OK'} class:badge-ng={item.status === 'NG'}>{item.status}</span></td>
                            </tr>
                          {/each}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </td>
              </tr>
            {/if}
          {/each}
          {#if history.length === 0}
            <tr><td colspan="7" class="no-data">{$t('common.no_data')}</td></tr>
          {/if}
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
  {@const parsedDims = parseDetailedDimensions(selectedInspection.dimensions)}
  <div 
    class="modal-backdrop" 
    role="button" 
    tabindex="-1" 
    onclick={(e) => { if (e.target === e.currentTarget) showDetailModal = false; }}
    onkeydown={(e) => { if (e.key === 'Escape') showDetailModal = false; }}
  >
    <div class="modal animate-fade-in">
      <div class="modal-header">
        <h2 class="modal-title">Bukti Inspeksi #{selectedInspection.id}</h2>
        <button class="btn-close" onclick={() => showDetailModal = false}>✕</button>
      </div>
      
      <div class="modal-body">
        <div class="detail-section">
          <h3 class="section-title">Informasi Dasar</h3>
          <div class="detail-grid">
            <div><span class="label">Waktu:</span> {selectedInspection.timestamp}</div>
            <div><span class="label">Operator:</span> {selectedInspection.operator}</div>
            <div><span class="label">Status:</span> <span class="badge" class:badge-ok={selectedInspection.status === 'OK'} class:badge-ng={selectedInspection.status === 'NG'}>{selectedInspection.status}</span></div>
            <div><span class="label">ID Sesi:</span> <code>{selectedInspection.sessionId || '-'}</code></div>
          </div>
        </div>

        <div class="detail-section">
          <h3 class="section-title">Informasi Part</h3>
          <div class="detail-grid">
            <div><span class="label">Kode Part:</span> <code>{selectedInspection.partCode}</code></div>
            <div><span class="label">Nama Part:</span> {selectedInspection.partName}</div>
            <div><span class="label">Vendor:</span> {selectedInspection.vendor}</div>
            <div><span class="label">ID Part:</span> {selectedInspection.idPart || '-'}</div>
          </div>
        </div>

        <div class="detail-section">
          <h3 class="section-title">Informasi Sistem & CV</h3>
          <div class="detail-grid">
            <div><span class="label">Versi Konfigurasi:</span> {selectedInspection.configVersion || '-'}</div>
            <div><span class="label">Referensi Cocok:</span> {selectedInspection.dimensions.referenceMatched || selectedInspection.dimensions.referencematched || '-'}</div>
            {#if selectedInspection.dimensions.cvDetail || selectedInspection.dimensions.cvdetail}
              <div style="grid-column: span 2; margin-top: var(--sp-1); padding: var(--sp-2); background: var(--clr-ng-bg); border: 1px solid var(--clr-ng-border); border-radius: var(--radius-sm); color: var(--clr-ng); font-size: var(--fs-xs);">
                <span class="label" style="color: var(--clr-ng); font-weight: 600;">CV Detail:</span> {selectedInspection.dimensions.cvDetail || selectedInspection.dimensions.cvdetail}
              </div>
            {/if}
          </div>
        </div>

        {#if parsedDims.length > 0}
          <div class="detail-section">
            <h3 class="section-title">Hasil Pengukuran</h3>
            <div class="expanded-measurements-table">
              <div class="table-header">
                <span class="col-name">Dimensi</span>
                <span class="col-val">Hasil Pengukuran</span>
                <span class="col-val">Ukuran Referensi</span>
                <span class="col-val">Deviasi (Selisih)</span>
              </div>
              {#each parsedDims as dim}
                {@const parsedDev = parseFloat(dim.deviation)}
                {@const isNg = !isNaN(parsedDev) && Math.abs(parsedDev) > 0.1}
                <div class="table-row" class:deviation-alert={isNg}>
                  <span class="col-name">{dim.name}</span>
                  <span class="col-val">{dim.actual}{dim.unit}</span>
                  <span class="col-val">{dim.reference}{dim.unit}</span>
                  <span class="col-val deviation-cell" class:positive={parsedDev > 0} class:negative={parsedDev < 0}>
                    {dim.deviation !== '-' && parsedDev >= 0 ? '+' : ''}{dim.deviation}{dim.unit}
                  </span>
                </div>
              {/each}
            </div>
          </div>
        {/if}

        {#if selectedInspection.imagePath}
          <div class="detail-section">
            <h3 class="section-title">Foto Evidence</h3>
            <img src={selectedInspection.imagePath} alt="Evidence" class="evidence-img" onerror={(e) => e.target.style.display='none'} />
          </div>
        {:else}
          <div class="detail-section">
            <h3 class="section-title">Foto Evidence</h3>
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
  .view-toggle {
    display: inline-flex;
    background: var(--clr-surface-2);
    border: 1px solid var(--clr-border);
    border-radius: 30px;
    padding: 3px;
    gap: 4px;
    align-items: center;
    box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.05);
  }
  .toggle-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px var(--sp-4);
    font-family: var(--font-family);
    font-size: var(--fs-xs);
    font-weight: var(--fw-semibold);
    color: var(--clr-text-muted);
    background: transparent;
    border: none;
    border-radius: 20px;
    cursor: pointer;
    transition: all var(--transition-base);
    white-space: nowrap;
  }
  .toggle-btn.active {
    background: var(--clr-surface);
    color: var(--clr-accent);
    box-shadow: 0 2px 5px rgba(0, 51, 153, 0.1), 0 1px 2px rgba(0, 0, 0, 0.05);
  }
  .toggle-btn:hover:not(.active) {
    color: var(--clr-text);
    background: rgba(0, 0, 0, 0.02);
  }
  .toggle-icon {
    opacity: 0.6;
    transition: all var(--transition-fast);
  }
  .toggle-btn.active .toggle-icon {
    opacity: 1;
    color: var(--clr-accent);
  }
  .session-detail-container {
    padding: var(--sp-4) var(--sp-5);
    background: var(--clr-surface);
    border: 1px solid var(--clr-border);
    border-radius: var(--radius-lg);
    box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.01);
    margin: var(--sp-2) 0;
  }
  .session-subtitle {
    font-size: var(--fs-sm);
    font-weight: var(--fw-bold);
    color: var(--clr-text);
    margin-bottom: var(--sp-3);
    display: flex;
    align-items: center;
    gap: 8px;
    text-transform: none;
    letter-spacing: normal;
  }
  .session-subtitle::before {
    content: "";
    display: inline-block;
    width: 4px;
    height: 14px;
    background: var(--clr-accent);
    border-radius: var(--radius-sm);
  }
  .session-table-wrapper {
    overflow-x: auto;
    border: 1px solid var(--clr-border);
    border-radius: var(--radius-md);
    background: var(--clr-surface-2);
  }
  .session-inspections-table {
    width: 100%;
    border-collapse: collapse;
    font-size: var(--fs-sm);
  }
  .session-inspections-table th {
    background: var(--clr-surface-3);
    color: var(--clr-text-muted);
    font-size: var(--fs-xs);
    font-weight: var(--fw-semibold);
    padding: 10px var(--sp-4);
    text-align: left;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    border-bottom: 1px solid var(--clr-border);
  }
  .session-inspections-table td {
    padding: var(--sp-3) var(--sp-4);
    border-bottom: 1px solid var(--clr-border);
    color: var(--clr-text);
  }
  .session-inspections-table tr:last-child td {
    border-bottom: none;
  }
  .expanded-measurements-table {
    border: 1px solid var(--clr-border);
    border-radius: var(--radius-md);
    overflow: hidden;
    background: var(--clr-surface-2);
  }
  .expanded-measurements-table .table-header {
    display: grid;
    grid-template-columns: 2fr repeat(3, 1fr);
    background: var(--clr-surface-2);
    border-bottom: 1px solid var(--clr-border);
    padding: var(--sp-2) var(--sp-4);
    font-size: var(--fs-xs);
    font-weight: var(--fw-semibold);
    color: var(--clr-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  .expanded-measurements-table .table-row {
    display: grid;
    grid-template-columns: 2fr repeat(3, 1fr);
    padding: var(--sp-3) var(--sp-4);
    font-size: var(--fs-sm);
    border-bottom: 1px solid var(--clr-border);
    align-items: center;
  }
  .expanded-measurements-table .table-row:last-child {
    border-bottom: none;
  }
  .expanded-measurements-table .table-row.deviation-alert {
    background: var(--clr-ng-bg);
  }
  .col-name {
    font-weight: var(--fw-semibold);
    color: var(--clr-text);
  }
  .col-val {
    color: var(--clr-text-muted);
  }
  .deviation-cell {
    font-weight: var(--fw-semibold);
  }
  .deviation-cell.positive {
    color: var(--clr-ok);
  }
  .deviation-cell.negative {
    color: #3b82f6;
  }
  .error-banner { padding: var(--sp-3); background: var(--clr-ng-bg); color: var(--clr-ng); border-radius: var(--radius-md); font-size: var(--fs-sm); margin-bottom: var(--sp-4); border: 1px solid rgba(239,68,68,0.2); }
  .loading-state { padding: var(--sp-8); text-align: center; color: var(--clr-text-muted); }
  .no-data { text-align: center; color: var(--clr-text-dim); padding: var(--sp-8) !important; }
  .table-footer { margin-top: var(--sp-3); font-size: var(--fs-xs); color: var(--clr-text-dim); display: flex; justify-content: space-between; align-items: center; }
  .pagination { display: flex; align-items: center; gap: var(--sp-2); }
  .page-num { font-weight: var(--fw-medium); color: var(--clr-text-muted); }
  .page { display: flex; flex-direction: column; flex: 1; overflow: hidden; height: 100%; }
  .table-container { flex: 1; overflow-y: auto; overflow-x: auto; }

  /* Modal Overlay & Details */
  .modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; z-index: 500; padding: var(--sp-4); }
  .modal { background: var(--clr-surface); border: 1px solid var(--clr-border); border-radius: var(--radius-xl); padding: var(--sp-6); width: 100%; max-width: 700px; max-height: 90vh; overflow-y: auto; box-shadow: var(--shadow-lg); }
  .modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--sp-5); }
  .modal-title { font-family: var(--font-heading); font-size: var(--fs-xl); font-weight: var(--fw-semibold); }
  .btn-close { background: none; border: none; font-size: var(--fs-2xl); color: var(--clr-text-dim); cursor: pointer; padding: 0; transition: color 0.2s; line-height: 1; }
  .btn-close:hover { color: var(--clr-text); }
  .modal-body { display: flex; flex-direction: column; gap: var(--sp-5); }
  .section-title { font-size: var(--fs-md); font-weight: var(--fw-semibold); margin-bottom: var(--sp-3); color: var(--clr-text-muted); text-transform: uppercase; letter-spacing: 0.5px; }
  .detail-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: var(--sp-3); font-size: var(--fs-sm); }
  .detail-grid .label { color: var(--clr-text-muted); font-weight: var(--fw-medium); }
  .evidence-img { width: 100%; max-width: 500px; border-radius: var(--radius-lg); border: 1px solid var(--clr-border); }
  .no-evidence { text-align: center; padding: var(--sp-8); color: var(--clr-text-dim); background: var(--clr-surface-2); border-radius: var(--radius-lg); }
  .no-evidence p { margin-top: var(--sp-2); font-size: var(--fs-sm); }
</style>
