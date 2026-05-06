<script>
  import { t } from '$lib/i18n.js';
  import { getKpi, getTrends, getInspections } from '$lib/api/manager.js';
  import { onMount, onDestroy } from 'svelte';

  let kpi = $state(null);
  let trendData = $state({ labels: [], values: [] });
  let vendors = $state([]);
  let filterPeriod = $state('day');
  let loading = $state(true);
  let error = $state('');
  let lastUpdated = $state('');
  let refreshInterval;

  async function fetchKpi() {
    try {
      const data = await getKpi();
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

  async function fetchTrends() {
    try {
      const raw = await getTrends(filterPeriod);
      const labels = raw.map((item) => {
        const d = new Date(item.period);
        if (filterPeriod === 'day') return d.toLocaleTimeString('id-ID', { hour: '2-digit' });
        if (filterPeriod === 'week') return d.toLocaleDateString('id-ID', { weekday: 'short' });
        return d.toLocaleDateString('id-ID', { month: 'short', day: 'numeric' });
      });
      const values = raw.map((item) =>
        item.total > 0 ? +((item.ng_count / item.total) * 100).toFixed(1) : 0
      );
      trendData = { labels, values };
    } catch (err) {
      error = err.message;
    }
  }

  async function fetchVendorNg() {
    try {
      const result = await getInspections({ limit: 500 });
      const inspections = result.data || [];
      const vendorMap = {};
      inspections.forEach(item => {
        const vendor = item.part?.vendorName || 'Unknown';
        if (!vendorMap[vendor]) vendorMap[vendor] = { total: 0, ng: 0 };
        vendorMap[vendor].total++;
        if (item.status === 'NO GOOD') vendorMap[vendor].ng++;
      });
      vendors = Object.entries(vendorMap)
        .map(([name, stats]) => ({
          name,
          rate: stats.total > 0 ? +((stats.ng / stats.total) * 100).toFixed(1) : 0,
        }))
        .sort((a, b) => b.rate - a.rate)
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

  $effect(() => {
    filterPeriod;
    fetchTrends();
  });

  onMount(() => {
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
      <div class="filter-pills">
        {#each ['day', 'week', 'month'] as period}
          <button
            class="pill"
            class:active={filterPeriod === period}
            onclick={() => filterPeriod = period}
          >
            {$t(`manager.filter_${period}`)}
          </button>
        {/each}
      </div>
    </div>
  </div>

  {#if error}
    <div class="error-banner">{error}</div>
  {/if}

  {#if loading && !kpi}
    <div class="loading-state">{$t('common.loading')}</div>
  {:else if kpi}
  <!-- KPI Cards -->
  <div class="kpi-grid">
    <div class="kpi-card">
      <div class="kpi-icon">📦</div>
      <div class="kpi-info">
        <span class="kpi-value">{kpi.totalInspected}</span>
        <span class="kpi-label">{$t('manager.total_inspected')}</span>
      </div>
    </div>
    <div class="kpi-card kpi-ok">
      <div class="kpi-icon">✅</div>
      <div class="kpi-info">
        <span class="kpi-value">{kpi.okRate}%</span>
        <span class="kpi-label">{$t('manager.ok_rate')}</span>
        <span class="kpi-sub">{kpi.okCount} parts</span>
      </div>
    </div>
    <div class="kpi-card kpi-ng">
      <div class="kpi-icon">❌</div>
      <div class="kpi-info">
        <span class="kpi-value">{kpi.ngRate}%</span>
        <span class="kpi-label">{$t('manager.ng_rate')}</span>
        <span class="kpi-sub">{kpi.ngCount} parts</span>
      </div>
    </div>
    <div class="kpi-card">
      <div class="kpi-icon">⚡</div>
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
      <h3 class="card-title">{$t('manager.trend_title')} (7 {$t('manager.filter_day')})</h3>
      <div class="bar-chart">
        {#each trendData.labels as label, i}
          <div class="bar-col">
            <div class="bar-wrapper">
              <div
                class="bar"
                style="height: {(trendData.values[i] / 5) * 100}%"
                class:bar-high={trendData.values[i] > 3}
              >
                <span class="bar-val">{trendData.values[i]}%</span>
              </div>
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
              <div class="vendor-bar" style="width: {(vendor.rate / 5) * 100}%"></div>
            </div>
          </div>
        {/each}
      </div>
    </div>
  </div>

  <!-- Line Chart Row -->
  <div class="charts-row line-chart-row">
    <div class="card chart-card full-width">
      <h3 class="card-title">{$t('manager.trend_title')}</h3>
      <div class="line-chart">
        <div class="y-axis">
          {#each [5, 4, 3, 2, 1, 0] as val}
            <div class="y-tick">
              <span class="y-label">{val}%</span>
              <div class="y-line"></div>
            </div>
          {/each}
        </div>
        <div class="chart-area">
          <svg viewBox="0 0 700 250" class="line-svg" preserveAspectRatio="none">
            <!-- Grid lines -->
            {#each [0, 50, 100, 150, 200, 250] as y}
              <line x1="0" y1={y} x2="700" y2={y} stroke="var(--clr-border)" stroke-width="0.5" />
            {/each}
            <!-- Data line -->
            <polyline
              fill="none"
              stroke="var(--clr-accent)"
              stroke-width="3"
              stroke-linecap="round"
              stroke-linejoin="round"
              points={trendData.values.map((v, i) => `${i * (700 / (trendData.values.length - 1))},${250 - (v / 5) * 250}`).join(' ')}
            />
            <!-- Data points -->
            {#each trendData.values as v, i}
              <circle
                cx={i * (700 / (trendData.values.length - 1))}
                cy={250 - (v / 5) * 250}
                r="5"
                fill="var(--clr-accent)"
                stroke="var(--clr-bg)"
                stroke-width="2"
              />
            {/each}
            <!-- Area fill -->
            <polygon
              fill="url(#areaGradient)"
              points={`0,250 ${trendData.values.map((v, i) => `${i * (700 / (trendData.values.length - 1))},${250 - (v / 5) * 250}`).join(' ')} 700,250`}
            />
            <defs>
              <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="var(--clr-accent)" stop-opacity="0.2" />
                <stop offset="100%" stop-color="var(--clr-accent)" stop-opacity="0" />
              </linearGradient>
            </defs>
          </svg>
          <div class="x-labels">
            {#each trendData.labels as label}
              <span>{label}</span>
            {/each}
          </div>
        </div>
      </div>
    </div>
  </div>

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
  .page-title { font-size: var(--fs-xl); font-weight: var(--fw-semibold); }
  .filter-pills { display: flex; gap: var(--sp-1); }
  .pill {
    padding: var(--sp-1) var(--sp-3);
    font-family: var(--font-family);
    font-size: var(--fs-xs);
    font-weight: var(--fw-medium);
    color: var(--clr-text-muted);
    background: var(--clr-surface);
    border: 1px solid var(--clr-border);
    border-radius: var(--radius-full);
    cursor: pointer;
    transition: all var(--transition-fast);
  }
  .pill.active {
    background: var(--clr-accent);
    color: #fff;
    border-color: var(--clr-accent);
  }
  .pill:hover:not(.active) {
    background: var(--clr-surface-2);
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
    padding: var(--sp-5);
    display: flex;
    align-items: center;
    gap: var(--sp-4);
    transition: all var(--transition-fast);
  }
  .kpi-card:hover {
    border-color: var(--clr-border-light);
    transform: translateY(-2px);
    box-shadow: var(--shadow-md);
  }
  .kpi-ok { border-left: 3px solid var(--clr-ok); }
  .kpi-ng { border-left: 3px solid var(--clr-ng); }
  .kpi-icon { font-size: 2rem; }
  .kpi-info { display: flex; flex-direction: column; }
  .kpi-value { font-size: var(--fs-2xl); font-weight: var(--fw-bold); }
  .kpi-label { font-size: var(--fs-xs); color: var(--clr-text-muted); text-transform: uppercase; letter-spacing: 0.5px; }
  .kpi-sub { font-size: var(--fs-xs); color: var(--clr-text-dim); }

  /* Charts */
  .charts-row {
    display: grid;
    grid-template-columns: 2fr 1fr;
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
    background: linear-gradient(180deg, var(--clr-accent), #818cf8);
    border-radius: var(--radius-sm) var(--radius-sm) 0 0;
    position: relative;
    transition: height 0.6s ease;
    min-height: 4px;
  }
  .bar.bar-high {
    background: linear-gradient(180deg, var(--clr-ng), #f87171);
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
    background: linear-gradient(90deg, var(--clr-ng), #f87171);
    border-radius: 3px;
    transition: width 0.6s ease;
  }

  /* Line Chart */
  .line-chart-row {
    margin-top: var(--sp-6);
  }
  .full-width {
    width: 100%;
    grid-column: 1 / -1;
  }
  .line-chart { display: flex; gap: var(--sp-2); margin-top: var(--sp-4); }
  .y-axis { display: flex; flex-direction: column; justify-content: space-between; padding-right: var(--sp-2); }
  .y-tick { display: flex; align-items: center; gap: var(--sp-2); }
  .y-label { font-size: var(--fs-xs); color: var(--clr-text-dim); min-width: 30px; text-align: right; }
  .y-line { display: none; }
  .chart-area { flex: 1; }
  .line-svg { width: 100%; height: 250px; }
  .x-labels { display: flex; justify-content: space-between; font-size: var(--fs-xs); color: var(--clr-text-dim); margin-top: var(--sp-2); }

  .page-footer {
    display: flex;
    justify-content: space-between;
    font-size: var(--fs-xs);
    color: var(--clr-text-dim);
    padding-top: var(--sp-3);
    border-top: 1px solid var(--clr-border);
  }
  .auto-refresh { color: var(--clr-ok); }
  .error-banner { padding: var(--sp-3); background: var(--clr-ng-bg); color: var(--clr-ng); border-radius: var(--radius-md); font-size: var(--fs-sm); margin-bottom: var(--sp-4); border: 1px solid rgba(239,68,68,0.2); }
  .loading-state { padding: var(--sp-8); text-align: center; color: var(--clr-text-muted); }
</style>
