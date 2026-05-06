<script>
  import { t } from '$lib/i18n.js';
  import { getInspections, exportData } from '$lib/api/manager.js';
  import { onMount } from 'svelte';

  let history = $state([]);
  let filterPart = $state('');
  let filterStatus = $state('');
  let expandedId = $state(null);
  let page = $state(1);
  let limit = $state(50);
  let total = $state(0);
  let loading = $state(true);
  let error = $state('');

  let totalPages = $derived(Math.ceil(total / limit) || 1);

  async function fetchHistory() {
    loading = true;
    error = '';
    try {
      const params = { page, limit };
      if (filterPart) params.partName = filterPart;
      if (filterStatus) params.status = filterStatus === 'OK' ? 'GOOD' : 'NO GOOD';
      const result = await getInspections(params);
      history = (result.data || []).map(item => ({
        id: item.id,
        timestamp: new Date(item.timestamp).toLocaleString('id-ID'),
        partName: item.part?.partName || '-',
        partCode: item.part?.partCode || '-',
        vendor: item.part?.vendorName || '-',
        dimensions: item.nilaiDimensi || {},
        status: item.status === 'GOOD' ? 'OK' : 'NG',
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

  async function handleExport(format) {
    try {
      const params = { format };
      if (filterPart) params.partName = filterPart;
      if (filterStatus) params.status = filterStatus === 'OK' ? 'GOOD' : 'NO GOOD';
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
  $effect(() => {
    filterPart; filterStatus;
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
      <button class="btn btn-secondary" onclick={() => handleExport('csv')}>{$t('manager.export_csv')}</button>
      <button class="btn btn-secondary" onclick={() => handleExport('pdf')}>{$t('manager.export_pdf')}</button>
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
            <td class="expand-icon">{expandedId === item.id ? '▼' : '▶'}</td>
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
  .filter-row { display: flex; gap: var(--sp-3); margin-bottom: var(--sp-4); flex-wrap: wrap; }
  .filter-input { max-width: 250px; }
  .filter-select { max-width: 200px; }
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
