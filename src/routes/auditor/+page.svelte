<script>
  import { t } from '$lib/i18n.js';
  import { getInspections, exportData } from '$lib/api/audit.js';
  import { onMount } from 'svelte';

  let inspections = $state([]);
  let page = $state(1);
  let limit = $state(50);
  let total = $state(0);
  let loading = $state(true);
  let error = $state('');
  let filterPart = $state('');
  let filterStatus = $state('');

  let totalPages = $derived(Math.ceil(total / limit) || 1);

  async function fetchInspections() {
    loading = true;
    error = '';
    try {
      const params = { page, limit };
      if (filterPart) params.partName = filterPart;
      if (filterStatus) params.status = filterStatus;
      const result = await getInspections(params);
      inspections = (result.data || []).map(item => ({
        id: item.id,
        timestamp: new Date(item.timestamp).toLocaleString('id-ID'),
        partName: item.part?.partName || '-',
        partCode: item.part?.partCode || '-',
        vendor: item.part?.vendorName || '-',
        status: (item.status === 'GOOD' || item.status === 'OK') ? 'OK' : 'NG',
        operator: item.operator?.name || '-',
        dimensions: item.nilaiDimensi || {},
      }));
      total = result.total || 0;
    } catch (err) {
      error = err.message;
    } finally {
      loading = false;
    }
  }

  async function handleExport(format) {
    try {
      const params = { format };
      if (filterPart) params.partName = filterPart;
      if (filterStatus) params.status = filterStatus;
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

  function goToPage(p) {
    page = p;
    fetchInspections();
  }

  onMount(() => {
    fetchInspections();
  });

  let searchTimer;
  $effect(() => {
    filterPart; filterStatus;
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
      <button class="btn btn-secondary" onclick={() => handleExport('csv')}>{$t('auditor.export_csv')}</button>
      <button class="btn btn-secondary" onclick={() => handleExport('pdf')}>{$t('auditor.export_pdf')}</button>
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
  </div>

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
            <td>{item.operator}</td>
          </tr>
        {/each}
        {#if inspections.length === 0}
          <tr><td colspan="6" class="no-data">{$t('common.no_data')}</td></tr>
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
  .filter-row { display: flex; gap: var(--sp-3); margin-bottom: var(--sp-4); flex-wrap: wrap; }
  .filter-input { max-width: 250px; }
  .filter-select { max-width: 200px; }
  .dim { color: var(--clr-text-dim); font-size: var(--fs-xs); }
  .error-banner { padding: var(--sp-3); background: var(--clr-ng-bg); color: var(--clr-ng); border-radius: var(--radius-md); font-size: var(--fs-sm); margin-bottom: var(--sp-4); border: 1px solid rgba(239,68,68,0.2); }
  .loading-state { padding: var(--sp-8); text-align: center; color: var(--clr-text-muted); }
  .no-data { text-align: center; color: var(--clr-text-dim); padding: var(--sp-8) !important; }
  code { background: var(--clr-surface-2); padding: 1px 6px; border-radius: 4px; font-size: var(--fs-xs); }
  .table-footer { margin-top: var(--sp-3); font-size: var(--fs-xs); color: var(--clr-text-dim); display: flex; justify-content: space-between; align-items: center; }
  .pagination { display: flex; align-items: center; gap: var(--sp-2); }
  .page-num { font-weight: var(--fw-medium); color: var(--clr-text-muted); }
</style>
