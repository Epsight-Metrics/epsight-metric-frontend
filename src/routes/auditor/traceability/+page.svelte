<script>
  import { t } from '$lib/i18n.js';
  import { getInspections } from '$lib/api/audit.js';
  import { onMount } from 'svelte';

  let batches = $state([]);
  let loading = $state(true);
  let error = $state('');

  async function fetchTraceability() {
    loading = true;
    error = '';
    try {
      const result = await getInspections({ limit: 1000 });
      const inspections = result.data || [];
      
      const batchMap = {};
      inspections.forEach(item => {
        const batchId = item.batchId || 'UNKNOWN';
        if (!batchMap[batchId]) {
          batchMap[batchId] = { total: 0, passed: 0, failed: 0 };
        }
        batchMap[batchId].total++;
        if (item.status === 'GOOD') batchMap[batchId].passed++;
        else batchMap[batchId].failed++;
      });
      
      batches = Object.entries(batchMap).map(([id, stats]) => ({
        id,
        ...stats,
        verified: stats.total > 0,
      }));
    } catch (err) {
      error = err.message;
    } finally {
      loading = false;
    }
  }

  onMount(() => {
    fetchTraceability();
  });
</script>

<svelte:head><title>{$t('auditor.traceability')} — EPSON QC</title></svelte:head>

<div class="page animate-fade-in">
  <h1 class="page-title">{$t('auditor.traceability')}</h1>

  {#if error}
    <div class="error-banner">{error}</div>
  {/if}

  {#if loading}
    <div class="loading-state">{$t('common.loading')}</div>
  {:else}
  <div class="table-container">
    <table>
      <thead>
        <tr>
          <th>{$t('auditor.batch_id')}</th>
          <th>Total Parts</th>
          <th>Passed</th>
          <th>Failed</th>
          <th>{$t('auditor.verified')}</th>
        </tr>
      </thead>
      <tbody>
        {#each batches as batch}
          <tr>
            <td><code>{batch.id}</code></td>
            <td>{batch.total}</td>
            <td class="ok-text">{batch.passed}</td>
            <td class="ng-text">{batch.failed}</td>
            <td>
              <span class="badge" class:badge-ok={batch.verified}>
                {batch.verified ? '✓ ' + $t('auditor.verified') : '✗ Unverified'}
              </span>
            </td>
          </tr>
        {/each}
        {#if batches.length === 0}
          <tr><td colspan="5" class="no-data">{$t('common.no_data')}</td></tr>
        {/if}
      </tbody>
    </table>
  </div>
  {/if}
</div>

<style>
  .page-title { font-size: var(--fs-xl); font-weight: var(--fw-semibold); margin-bottom: var(--sp-5); }
  .error-banner { padding: var(--sp-3); background: var(--clr-ng-bg); color: var(--clr-ng); border-radius: var(--radius-md); font-size: var(--fs-sm); margin-bottom: var(--sp-4); border: 1px solid rgba(239,68,68,0.2); }
  .loading-state { padding: var(--sp-8); text-align: center; color: var(--clr-text-muted); }
  .no-data { text-align: center; color: var(--clr-text-dim); padding: var(--sp-8) !important; }
  code { background: var(--clr-surface-2); padding: 1px 6px; border-radius: 4px; font-size: var(--fs-xs); }
  .ok-text { color: var(--clr-ok); font-weight: var(--fw-medium); }
  .ng-text { color: var(--clr-ng); font-weight: var(--fw-medium); }
</style>
