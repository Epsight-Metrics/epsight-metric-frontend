<script>
  import { t } from '$lib/i18n.js';
  import { getLogs } from '$lib/api/admin.js';
  import { onMount } from 'svelte';

  let logs = $state([]);
  let searchQuery = $state('');
  let page = $state(1);
  let limit = $state(50);
  let total = $state(0);
  let loading = $state(true);
  let error = $state('');

  let totalPages = $derived(Math.ceil(total / limit) || 1);

  async function fetchLogs() {
    loading = true;
    error = '';
    try {
      const params = { page, limit };
      if (searchQuery) params.action = searchQuery;
      const result = await getLogs(params);
      logs = (result.data || []).map(log => ({
        id: log.id,
        user: log.user?.username || log.userId,
        userName: log.user?.name || '-',
        action: log.action,
        detail: log.detail || '-',
        timestamp: new Date(log.createdAt).toLocaleString('id-ID'),
      }));
      total = result.total || 0;
    } catch (err) {
      error = err.message;
    } finally {
      loading = false;
    }
  }

  function goToPage(p) {
    page = p;
    fetchLogs();
  }

  onMount(() => {
    fetchLogs();
  });

  let searchTimer;
  $effect(() => {
    searchQuery;
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      page = 1;
      fetchLogs();
    }, 300);
  });
</script>

<svelte:head><title>{$t('admin.activity_logs')} — EPSON QC</title></svelte:head>

<div class="page animate-fade-in">
  <h1 class="page-title">{$t('admin.activity_logs')}</h1>

  {#if error}
    <div class="error-banner">{error}</div>
  {/if}

  <div class="search-bar">
    <input class="input" type="text" bind:value={searchQuery} placeholder="Cari log aktivitas..." />
  </div>

  {#if loading}
    <div class="loading-state">{$t('common.loading')}</div>
  {:else}
    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th>No</th>
            <th>User</th>
            <th>Aksi</th>
            <th>Detail</th>
            <th>Waktu</th>
          </tr>
        </thead>
        <tbody>
          {#each logs as log, i}
            <tr>
              <td>{(page - 1) * limit + i + 1}</td>
              <td>
                <code>{log.user}</code>
                <span class="dim" style="margin-left: 8px;">{log.userName}</span>
              </td>
              <td><span class="badge badge-info">{log.action}</span></td>
              <td>{log.detail}</td>
              <td class="dim">{log.timestamp}</td>
            </tr>
          {/each}
          {#if logs.length === 0}
            <tr><td colspan="5" class="no-data">{$t('common.no_data')}</td></tr>
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
  .page-title { font-size: var(--fs-xl); font-weight: var(--fw-semibold); margin-bottom: var(--sp-5); }
  .search-bar { margin-bottom: var(--sp-4); max-width: 400px; }
  .dim { color: var(--clr-text-dim); font-size: var(--fs-xs); }
  .no-data { text-align: center; color: var(--clr-text-dim); padding: var(--sp-8) !important; }
  .error-banner { padding: var(--sp-3); background: var(--clr-ng-bg); color: var(--clr-ng); border-radius: var(--radius-md); font-size: var(--fs-sm); margin-bottom: var(--sp-4); border: 1px solid rgba(239,68,68,0.2); }
  .loading-state { padding: var(--sp-8); text-align: center; color: var(--clr-text-muted); }
  code { background: var(--clr-surface-2); padding: 1px 6px; border-radius: 4px; font-size: var(--fs-xs); }
  .table-footer { margin-top: var(--sp-3); font-size: var(--fs-xs); color: var(--clr-text-dim); display: flex; justify-content: space-between; align-items: center; }
  .pagination { display: flex; align-items: center; gap: var(--sp-2); }
  .page-num { font-weight: var(--fw-medium); color: var(--clr-text-muted); }
</style>
