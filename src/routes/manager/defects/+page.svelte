<script>
  import { t } from '$lib/i18n.js';
  import { getInspections } from '$lib/api/manager.js';
  import { onMount } from 'svelte';

  let vendorNg = $state([]);
  let dimFailures = $state([]);
  let loading = $state(true);
  let error = $state('');

  async function fetchDefectAnalysis() {
    loading = true;
    error = '';
    try {
      const result = await getInspections({ limit: 500 });
      const inspections = result.data || [];
      
      const vendorMap = {};
      const dimMap = {};
      
      inspections.forEach(item => {
        if (item.status === 'NO GOOD') {
          const vendor = item.part?.vendorName || 'Unknown';
          if (!vendorMap[vendor]) vendorMap[vendor] = { total: 0, ng: 0 };
          vendorMap[vendor].ng++;
          
          Object.keys(item.nilaiDimensi || {}).forEach(dim => {
            dimMap[dim] = (dimMap[dim] || 0) + 1;
          });
        }
        const vendor = item.part?.vendorName || 'Unknown';
        if (!vendorMap[vendor]) vendorMap[vendor] = { total: 0, ng: 0 };
        vendorMap[vendor].total++;
      });
      
      vendorNg = Object.entries(vendorMap)
        .map(([name, stats]) => ({
          name,
          rate: stats.total > 0 ? +((stats.ng / stats.total) * 100).toFixed(1) : 0,
          count: stats.ng,
        }))
        .sort((a, b) => b.rate - a.rate)
        .slice(0, 10);
      
      dimFailures = Object.entries(dimMap)
        .map(([dim, count]) => ({ dim, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);
    } catch (err) {
      error = err.message;
    } finally {
      loading = false;
    }
  }

  onMount(() => {
    fetchDefectAnalysis();
  });
</script>

<svelte:head><title>{$t('manager.defect_title')} — EPSON QC</title></svelte:head>

<div class="page animate-fade-in">
  <h1 class="page-title">{$t('manager.defect_title')}</h1>

  {#if error}
    <div class="error-banner">{error}</div>
  {/if}

  {#if loading}
    <div class="loading-state">{$t('common.loading')}</div>
  {:else}
  <div class="charts-row">
    <div class="card">
      <h3 class="card-title">{$t('manager.top_ng_vendors')}</h3>
      <div class="vendor-list">
        {#each vendorNg as vendor, i}
          <div class="vendor-row">
            <span class="vendor-rank">#{i + 1}</span>
            <span class="vendor-name">{vendor.name}</span>
            <span class="vendor-rate">{vendor.rate}%</span>
            <div class="vendor-bar-bg">
              <div class="vendor-bar" style="width: {Math.min(vendor.rate * 10, 100)}%"></div>
            </div>
          </div>
        {/each}
      </div>
    </div>

    <div class="card">
      <h3 class="card-title">{$t('manager.failed_dimension')}</h3>
      <div class="dim-list">
        {#each dimFailures as item, i}
          <div class="dim-row">
            <span class="dim-rank">#{i + 1}</span>
            <span class="dim-name">{item.dim}</span>
            <span class="dim-count">{item.count} kali</span>
          </div>
        {/each}
      </div>
    </div>
  </div>
  {/if}
</div>

<style>
  .page-title { font-size: var(--fs-xl); font-weight: var(--fw-semibold); margin-bottom: var(--sp-5); }
  .error-banner { padding: var(--sp-3); background: var(--clr-ng-bg); color: var(--clr-ng); border-radius: var(--radius-md); font-size: var(--fs-sm); margin-bottom: var(--sp-4); border: 1px solid rgba(239,68,68,0.2); }
  .loading-state { padding: var(--sp-8); text-align: center; color: var(--clr-text-muted); }
  .charts-row { display: grid; grid-template-columns: 1fr 1fr; gap: var(--sp-4); }
  .card-title { font-size: var(--fs-sm); font-weight: var(--fw-semibold); color: var(--clr-text-muted); margin-bottom: var(--sp-4); text-transform: uppercase; letter-spacing: 0.5px; }
  .vendor-list, .dim-list { display: flex; flex-direction: column; gap: var(--sp-4); }
  .vendor-row, .dim-row { display: grid; grid-template-columns: 30px 1fr 60px; gap: var(--sp-2); align-items: center; }
  .vendor-rank, .dim-rank { font-size: var(--fs-xs); color: var(--clr-text-dim); font-weight: var(--fw-semibold); }
  .vendor-name, .dim-name { font-size: var(--fs-sm); }
  .vendor-rate, .dim-count { font-size: var(--fs-sm); font-weight: var(--fw-semibold); color: var(--clr-ng); text-align: right; }
  .vendor-bar-bg { grid-column: 1 / -1; height: 6px; background: var(--clr-surface-2); border-radius: 3px; overflow: hidden; }
  .vendor-bar { height: 100%; background: linear-gradient(90deg, var(--clr-ng), #f87171); border-radius: 3px; transition: width 0.6s ease; }
</style>
