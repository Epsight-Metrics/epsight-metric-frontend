<script>
  import { t } from '$lib/i18n.js';
  import { getKpi, getTrends, getInspections } from '$lib/api/manager.js';
  import { onMount, onDestroy } from 'svelte';

  let kpi = $state(null);
  let trendData = $state({ labels: [], values: [] });
  let vendors = $state([]);
  let dimFailures = $state([]);
  let dateFrom = $state('');
  let dateTo = $state('');
  let activeQuickFilter = $state('');
  let loading = $state(true);
  let error = $state('');
  let lastUpdated = $state('');
  let refreshInterval;

  async function fetchKpi() {
    try {
      const params = {};
      if (dateFrom) params.dateFrom = dateFrom;
      if (dateTo) params.dateTo = dateTo;
      
      const data = await getKpi(params);
      kpi = {
        totalInspected: data.total,
        okCount: data.okCount,
        ngCount: data.ngCount,
        okRate: parseFloat(data.okRate),
        ngRate: parseFloat(data.ngRate),
        throughput: data.throughputPerHour,
      };
    } catch (err) {
      error = err.message;
    }
  }

  let selectedPeriod = $state(null);
  let selectedDetail = $state(null);

  let maxVendorRate = $derived(Math.max(...vendors.map(v => v.rate), 1));
  let maxDimCount = $derived(Math.max(...dimFailures.map(d => d.count), 1));
  let maxNgRate = $derived(Math.max(...trendData.values, 5));

  async function fetchTrends() {
    try {
      let params = {};
      let period = 'day';
      
      // Determine period based on date range
      if (dateFrom && dateTo) {
        const daysDiff = Math.ceil((new Date(dateTo) - new Date(dateFrom)) / (1000 * 60 * 60 * 24));
        
        // Choose appropriate period to get enough data from backend
        if (daysDiff <= 1) {
          period = 'day'; // hourly data for 1 day
        } else if (daysDiff <= 7) {
          period = 'week'; // daily data for up to 7 days
        } else {
          period = 'month'; // weekly data for longer ranges
        }
        
        params.dateFrom = dateFrom;
        params.dateTo = dateTo;
      }
      
      console.log('Fetching trends with params:', { period, ...params });
      const raw = await getTrends(period, params);
      console.log('Trends response (raw):', raw);
      
      // Filter di frontend untuk memastikan data sesuai range
      let filteredData = raw;
      if (dateFrom && dateTo) {
        const startDate = new Date(dateFrom + 'T00:00:00');
        const endDate = new Date(dateTo + 'T23:59:59');
        
        filteredData = raw.filter(item => {
          const itemDate = new Date(item.period);
          return itemDate >= startDate && itemDate <= endDate;
        });
        
        console.log('Filtered data:', filteredData);
      }
      
      // Check if single day (show hourly) or multiple days (show daily)
      const isSingleDay = dateFrom === dateTo;
      
      const labels = filteredData.map((item) => {
        const d = new Date(item.period);
        if (isSingleDay) {
          return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
        } else {
          return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
        }
      });
      const values = filteredData.map((item) =>
        item.total > 0 ? +((item.ng_count / item.total) * 100).toFixed(1) : 0
      );
      trendData = { labels, values, raw: filteredData };
    } catch (err) {
      console.error('Trends error:', err);
      error = err.message;
    }
  }

  function selectBar(index) {
    selectedPeriod = index;
    const data = trendData.raw[index];
    const total = data.total || 0;
    const ngCount = data.ng_count || 0;
    const okCount = data.ok_count || (total - ngCount);
    selectedDetail = {
      label: trendData.labels[index],
      ngRate: trendData.values[index],
      total: total,
      okCount: okCount,
      ngCount: ngCount,
      period: data.period
    };
  }

  async function fetchVendorNg() {
    try {
      const params = { limit: 500 };
      if (dateFrom) params.dateFrom = dateFrom;
      if (dateTo) params.dateTo = dateTo;
      
      const result = await getInspections(params);
      const inspections = result.data || [];
      const vendorMap = {};
      const dimMap = {};
      
      inspections.forEach(item => {
        const vendor = item.part?.vendorName || 'Unknown';
        if (!vendorMap[vendor]) vendorMap[vendor] = { total: 0, ng: 0 };
        vendorMap[vendor].total++;
        
        if (item.status === 'NG' || item.status === 'NO GOOD') {
          vendorMap[vendor].ng++;
          Object.keys(item.nilaiDimensi || {}).forEach(dim => {
            dimMap[dim] = (dimMap[dim] || 0) + 1;
          });
        }
      });
      
      vendors = Object.entries(vendorMap)
        .map(([name, stats]) => ({
          name,
          rate: stats.total > 0 ? +((stats.ng / stats.total) * 100).toFixed(1) : 0,
        }))
        .sort((a, b) => b.rate - a.rate)
        .slice(0, 5);
      
      dimFailures = Object.entries(dimMap)
        .map(([dim, count]) => ({ dim, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);
    } catch (err) {
      error = err.message;
    }
  }

  async function loadAll() {
    loading = true;
    error = '';
    await Promise.all([fetchKpi(), fetchTrends(), fetchVendorNg()]);
    lastUpdated = new Date().toLocaleTimeString('id-ID');
    loading = false;
  }

  function applyFilter() {
    if (dateFrom && dateTo) {
      if (new Date(dateFrom) > new Date(dateTo)) {
        error = 'Tanggal mulai tidak boleh lebih besar dari tanggal akhir';
        return;
      }
      activeQuickFilter = '';
      loadAll();
    } else {
      error = 'Silakan pilih rentang tanggal';
    }
  }

  function setQuickFilter(type) {
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
    
    loadAll();
  }

  $effect(() => {
    // Removed auto-fetch on date change
  });

  onMount(() => {
    // Set default date range: last 7 days
    const today = new Date();
    const lastWeek = new Date(today);
    lastWeek.setDate(today.getDate() - 7);
    
    dateTo = today.toISOString().split('T')[0];
    dateFrom = lastWeek.toISOString().split('T')[0];
    
    loadAll();
    refreshInterval = setInterval(loadAll, 30_000);
  });

  onDestroy(() => clearInterval(refreshInterval));
</script>

<svelte:head><title>{$t('manager.overview')} — EPSON QC</title></svelte:head>

<div class="page animate-fade-in">
  <div class="page-header">
    <h1 class="page-title">{$t('manager.overview')}</h1>
    <div class="header-actions">
      <div class="quick-filters">
        <button class="quick-btn" class:active={activeQuickFilter === 'today'} onclick={() => setQuickFilter('today')}>Hari Ini</button>
        <button class="quick-btn" class:active={activeQuickFilter === 'week'} onclick={() => setQuickFilter('week')}>Minggu Ini</button>
        <button class="quick-btn" class:active={activeQuickFilter === 'month'} onclick={() => setQuickFilter('month')}>Bulan Ini</button>
      </div>
      <div class="date-filters">
        <div class="date-input-group">
          <label class="date-label">Dari:</label>
          <input type="date" class="date-input" bind:value={dateFrom} />
        </div>
        <div class="date-input-group">
          <label class="date-label">Sampai:</label>
          <input type="date" class="date-input" bind:value={dateTo} />
        </div>
        <button class="btn btn-primary" onclick={applyFilter}>Terapkan</button>
      </div>
    </div>
  </div>

  {#if error}
    <div class="error-banner">{error}</div>
  {/if}

  {#if dateFrom && dateTo}
    <div class="date-range-info">
      Data rentang waktu {dateFrom} ke {dateTo}
    </div>
  {/if}

  {#if loading && !kpi}
    <div class="loading-state">{$t('common.loading')}</div>
  {:else if kpi}
  <!-- KPI Cards -->
  <div class="kpi-grid">
    <div class="kpi-card">
      <div class="kpi-icon">
        <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>
      </div>
      <div class="kpi-info">
        <span class="kpi-value">{kpi.totalInspected}</span>
        <span class="kpi-label">{$t('manager.total_inspected')}</span>
      </div>
    </div>
    <div class="kpi-card kpi-ok">
      <div class="kpi-icon">
        <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--clr-ok)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
      </div>
      <div class="kpi-info">
        <span class="kpi-value">{kpi.okRate}%</span>
        <span class="kpi-label">{$t('manager.ok_rate')}</span>
        <span class="kpi-sub">{kpi.okCount} parts</span>
      </div>
    </div>
    <div class="kpi-card kpi-ng">
      <div class="kpi-icon">
        <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--clr-ng)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
      </div>
      <div class="kpi-info">
        <span class="kpi-value">{kpi.ngRate}%</span>
        <span class="kpi-label">{$t('manager.ng_rate')}</span>
        <span class="kpi-sub">{kpi.ngCount} parts</span>
      </div>
    </div>
    <div class="kpi-card">
      <div class="kpi-icon">
        <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
      </div>
      <div class="kpi-info">
        <span class="kpi-value">{kpi.throughput}</span>
        <span class="kpi-label">{$t('manager.throughput')}</span>
      </div>
    </div>
  </div>

  <!-- Charts Row -->
  <div class="charts-row">
    <!-- Trend Chart (CSS-based bar chart) -->
    <div class="card chart-card">
      <h3 class="card-title">Tren NG Rate</h3>
      <div class="bar-chart">
        {#each trendData.labels as label, i}
          <div class="bar-col">
            <div class="bar-wrapper">
              <button
                class="bar"
                class:bar-high={trendData.values[i] > maxNgRate * 0.6}
                class:bar-selected={selectedPeriod === i}
                style="height: {(trendData.values[i] / maxNgRate) * 100}%"
                onclick={() => selectBar(i)}
              >
                <span class="bar-val">{trendData.values[i]}%</span>
              </button>
            </div>
            <span class="bar-label">{label}</span>
          </div>
        {/each}
      </div>
    </div>

    <!-- Top NG Vendors -->
    <div class="card chart-card">
      <h3 class="card-title">{$t('manager.top_ng_vendors')}</h3>
      <div class="vendor-list">
        {#each vendors as vendor, i}
          <div class="vendor-row">
            <span class="vendor-rank">#{i + 1}</span>
            <span class="vendor-name">{vendor.name}</span>
            <span class="vendor-rate">{vendor.rate}%</span>
            <div class="vendor-bar-bg">
              <div class="vendor-bar" style="width: {vendor.rate}%"></div>
            </div>
          </div>
        {/each}
      </div>
    </div>

    <!-- Top Failed Dimensions -->
    <div class="card chart-card">
      <h3 class="card-title">Dimensi Gagal Terbanyak</h3>
      <div class="vendor-list">
        {#if dimFailures.length > 0}
          {#each dimFailures as item, i}
            <div class="vendor-row">
              <span class="vendor-rank">#{i + 1}</span>
              <span class="vendor-name">{item.dim}</span>
              <span class="vendor-rate">{item.count}x</span>
              <div class="vendor-bar-bg">
                <div class="vendor-bar" style="width: {(item.count / maxDimCount) * 100}%"></div>
              </div>
            </div>
          {/each}
        {:else}
          <div class="no-data-chart">Tidak ada data dimensi gagal</div>
        {/if}
      </div>
    </div>
  </div>

  <!-- Detail Panel -->
  {#if selectedDetail}
  <div class="charts-row detail-row">
    <div class="card chart-card full-width">
      <div class="detail-header">
        <h3 class="card-title">Detail Periode: {selectedDetail.label}</h3>
        <button class="btn-close" onclick={() => { selectedPeriod = null; selectedDetail = null; }}>✕</button>
      </div>
      <div class="detail-grid">
        <div class="detail-card">
          <div class="detail-icon" style="color: var(--clr-accent);">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>
          </div>
          <div class="detail-info">
            <span class="detail-value">{selectedDetail.total}</span>
            <span class="detail-label">Total Inspeksi</span>
          </div>
        </div>
        <div class="detail-card ok-card">
          <div class="detail-icon" style="color: var(--clr-ok);">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
          </div>
          <div class="detail-info">
            <span class="detail-value">{selectedDetail.okCount}</span>
            <span class="detail-label">OK Parts</span>
            <span class="detail-percent">{selectedDetail.total > 0 ? ((selectedDetail.okCount / selectedDetail.total) * 100).toFixed(1) : 0}%</span>
          </div>
        </div>
        <div class="detail-card ng-card">
          <div class="detail-icon" style="color: var(--clr-ng);">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
          </div>
          <div class="detail-info">
            <span class="detail-value">{selectedDetail.ngCount}</span>
            <span class="detail-label">NG Parts</span>
            <span class="detail-percent" style="color: var(--clr-ng);">{selectedDetail.ngRate}%</span>
          </div>
        </div>
      </div>
    </div>
  </div>
  {/if}

  <!-- Footer -->
  <div class="page-footer">
    <span class="footer-info">
      {$t('manager.last_updated')}: {lastUpdated} WIB
    </span>
    <span class="footer-info auto-refresh">● {$t('manager.auto_refresh')} (30s)</span>
  </div>
  {/if}
</div>

<style>
  .page-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: var(--sp-5);
    flex-wrap: wrap;
    gap: var(--sp-3);
  }
  .page-title { font-family: var(--font-heading); font-size: var(--fs-2xl); font-weight: var(--fw-semibold); }
  .header-actions { display: flex; gap: var(--sp-4); align-items: center; flex-wrap: wrap; }
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
    margin-bottom: var(--sp-4);
  }
  .date-filters { display: flex; gap: var(--sp-3); align-items: center; }
  .date-input-group { display: flex; align-items: center; gap: var(--sp-2); }
  .date-label { font-size: var(--fs-sm); color: var(--clr-text-muted); font-weight: var(--fw-medium); }
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

  /* KPI Cards */
  .kpi-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: var(--sp-4);
    margin-bottom: var(--sp-6);
  }
  .kpi-card {
    background: var(--clr-surface);
    border: 1px solid var(--clr-border);
    border-radius: var(--radius-lg);
    padding: var(--sp-6);
    display: flex;
    align-items: center;
    gap: var(--sp-4);
    transition: all var(--transition-fast);
    box-shadow: var(--shadow-card);
  }
  .kpi-card:hover {
    border-color: var(--clr-border-light);
    transform: translateY(-2px);
    box-shadow: var(--shadow-md);
  }
  .kpi-ok { border-left: 4px solid var(--clr-ok); }
  .kpi-ng { border-left: 4px solid var(--clr-ng); }
  .kpi-icon { font-size: 2rem; color: var(--clr-accent); }
  .kpi-info { display: flex; flex-direction: column; }
  .kpi-value { font-family: var(--font-heading); font-size: var(--fs-metric); font-weight: var(--fw-bold); font-variant-numeric: tabular-nums; line-height: 1.2; }
  .kpi-label { font-size: var(--fs-xs); color: var(--clr-text-muted); text-transform: uppercase; letter-spacing: 0.5px; margin-top: var(--sp-1); }
  .kpi-sub { font-size: var(--fs-xs); color: var(--clr-text-dim); }

  /* Charts */
  .charts-row {
    display: grid;
    grid-template-columns: 2fr 1fr 1fr;
    gap: var(--sp-4);
    margin-bottom: var(--sp-4);
  }
  .chart-card { padding: var(--sp-5); }
  .card-title {
    font-size: var(--fs-sm);
    font-weight: var(--fw-semibold);
    color: var(--clr-text-muted);
    margin-bottom: var(--sp-5);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  /* Bar Chart */
  .bar-chart {
    display: flex;
    align-items: flex-end;
    justify-content: space-around;
    height: 200px;
    gap: var(--sp-2);
  }
  .bar-col {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--sp-2);
    flex: 1;
  }
  .bar-wrapper {
    width: 100%;
    height: 180px;
    display: flex;
    align-items: flex-end;
    justify-content: center;
  }
  .bar {
    width: 70%;
    max-width: 48px;
    background: linear-gradient(180deg, var(--clr-accent-light), var(--clr-accent));
    border-radius: var(--radius-sm) var(--radius-sm) 0 0;
    position: relative;
    transition: all 0.3s ease;
    min-height: 4px;
    border: 2px solid transparent;
    cursor: pointer;
    padding: 0;
    font: inherit;
  }
  .bar:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  }
  .bar.bar-selected {
    border-color: var(--clr-accent);
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.3);
  }
  .bar.bar-high {
    background: linear-gradient(180deg, #ef4444, var(--clr-ng));
  }
  .bar-val {
    position: absolute;
    top: -22px;
    left: 50%;
    transform: translateX(-50%);
    font-size: var(--fs-xs);
    font-weight: var(--fw-semibold);
    color: var(--clr-text-muted);
    white-space: nowrap;
  }
  .bar-label {
    font-size: var(--fs-xs);
    color: var(--clr-text-dim);
  }

  /* Vendor List */
  .vendor-list { display: flex; flex-direction: column; gap: var(--sp-4); }
  .vendor-row {
    display: grid;
    grid-template-columns: 30px 1fr 50px;
    gap: var(--sp-2);
    align-items: center;
  }
  .vendor-rank { font-size: var(--fs-xs); color: var(--clr-text-dim); font-weight: var(--fw-semibold); }
  .vendor-name { font-size: var(--fs-sm); }
  .vendor-rate { font-size: var(--fs-sm); font-weight: var(--fw-semibold); color: var(--clr-ng); text-align: right; }
  .vendor-bar-bg {
    grid-column: 1 / -1;
    height: 6px;
    background: var(--clr-surface-2);
    border-radius: 3px;
    overflow: hidden;
  }
  .vendor-bar {
    height: 100%;
    background: linear-gradient(90deg, var(--clr-ng), #ef4444);
    border-radius: 3px;
    transition: width 0.6s ease;
  }

  /* Detail Panel */
  .detail-row { margin-top: var(--sp-4); animation: slideDown 0.3s ease; }
  @keyframes slideDown { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
  .detail-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--sp-4); }
  .btn-close { background: none; border: none; font-size: var(--fs-xl); color: var(--clr-text-dim); cursor: pointer; padding: var(--sp-1); transition: color 0.2s; }
  .btn-close:hover { color: var(--clr-text); }
  .detail-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--sp-4); }
  .detail-card { background: var(--clr-surface-2); border: 1px solid var(--clr-border); border-radius: var(--radius-lg); padding: var(--sp-5); display: flex; align-items: center; gap: var(--sp-4); }
  .ok-card { border-left: 3px solid var(--clr-ok); }
  .ng-card { border-left: 3px solid var(--clr-ng); }
  .detail-icon { font-size: 2rem; }
  .detail-info { display: flex; flex-direction: column; }
  .detail-value { font-family: var(--font-heading); font-size: var(--fs-2xl); font-weight: var(--fw-bold); line-height: 1.2; }
  .detail-label { font-size: var(--fs-xs); color: var(--clr-text-muted); text-transform: uppercase; margin-top: var(--sp-1); }
  .detail-percent { font-size: var(--fs-sm); font-weight: var(--fw-semibold); color: var(--clr-ok); margin-top: var(--sp-1); }

  .page-footer {
    display: flex;
    justify-content: space-between;
    font-size: var(--fs-xs);
    color: var(--clr-text-dim);
    padding-top: var(--sp-3);
    border-top: 1px solid var(--clr-border);
  }
  .auto-refresh { color: var(--clr-ok); }
  .error-banner { padding: var(--sp-3); background: var(--clr-ng-bg); color: var(--clr-ng); border-radius: var(--radius-md); font-size: var(--fs-sm); margin-bottom: var(--sp-4); border: 1px solid var(--clr-ng-border); }
  .loading-state { padding: var(--sp-8); text-align: center; color: var(--clr-text-muted); }

  @media (max-width: 1024px) {
    .kpi-grid { grid-template-columns: repeat(2, 1fr); }
    .charts-row { grid-template-columns: 1fr; }
    .detail-grid { grid-template-columns: 1fr; }
  }
  @media (max-width: 768px) {
    .kpi-grid { grid-template-columns: 1fr; }
  }

  .full-width {
    width: 100%;
    grid-column: 1 / -1;
  }
</style>
