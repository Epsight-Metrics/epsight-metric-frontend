<script>
  import { t } from '$lib/i18n.js';
  import { getAlertSummary } from '$lib/api/manager.js';
  import { onMount } from 'svelte';

  let alerts = $state([]);
  let loading = $state(true);
  let error = $state('');

  async function fetchAlerts() {
    loading = true;
    error = '';
    try {
      const result = await getAlertSummary();
      alerts = (result.data || []).map(item => ({
        id: item.id,
        timestamp: new Date(item.timestamp).toLocaleString('id-ID'),
        partName: item.part?.partName || '-',
        partCode: item.part?.partCode || '-',
        vendor: item.part?.vendorName || '-',
        operator: item.operator?.name || '-',
        dimensions: item.nilaiDimensi || {},
      }));
    } catch (err) {
      error = err.message;
    } finally {
      loading = false;
    }
  }

  onMount(() => {
    fetchAlerts();
  });
</script>

<svelte:head><title>{$t('manager.alert_summary')} — EPSON QC</title></svelte:head>

<div class="page animate-fade-in">
  <h1 class="page-title">{$t('manager.alert_summary')}</h1>

  {#if error}
    <div class="error-banner">{error}</div>
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
            {#each Object.entries(alert.dimensions) as [key, val]}
              <span class="dim-badge">{key}: {val}mm</span>
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
  .error-banner { padding: var(--sp-3); background: var(--clr-ng-bg); color: var(--clr-ng); border-radius: var(--radius-md); font-size: var(--fs-sm); margin-bottom: var(--sp-4); border: 1px solid rgba(239,68,68,0.2); }
  .loading-state { padding: var(--sp-8); text-align: center; color: var(--clr-text-muted); }
  .alerts-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: var(--sp-4); }
  .alert-card { background: var(--clr-surface); border: 1px solid var(--clr-border); border-left: 3px solid var(--clr-ng); border-radius: var(--radius-lg); padding: var(--sp-4); }
  .alert-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--sp-3); }
  .alert-icon { display: flex; color: var(--clr-warning); }
  .alert-time { font-size: var(--fs-xs); color: var(--clr-text-dim); }
  .alert-part { font-size: var(--fs-md); font-weight: var(--fw-semibold); margin-bottom: var(--sp-2); }
  .alert-detail { font-size: var(--fs-sm); color: var(--clr-text-muted); margin-bottom: var(--sp-1); }
  .alert-dims { display: flex; flex-wrap: wrap; gap: var(--sp-1); margin-top: var(--sp-2); }
  .dim-badge { font-size: var(--fs-xs); padding: 2px var(--sp-2); background: var(--clr-surface-2); border-radius: var(--radius-sm); }
  code { background: var(--clr-surface-2); padding: 1px 6px; border-radius: 4px; font-size: var(--fs-xs); }
  .no-alerts { text-align: center; padding: var(--sp-12); color: var(--clr-text-dim); grid-column: 1 / -1; }
  .no-alerts-icon { font-size: 3rem; display: block; margin-bottom: var(--sp-3); }
</style>
