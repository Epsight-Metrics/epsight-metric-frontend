<script>
  import { t } from '$lib/i18n.js';
  import { mockActivityLogs } from '$lib/data/mock.js';

  let logs = $state([...mockActivityLogs]);
  let searchQuery = $state('');

  let filteredLogs = $derived(
    logs.filter(l =>
      l.user.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.detail.toLowerCase().includes(searchQuery.toLowerCase())
    )
  );
</script>

<svelte:head><title>{$t('admin.activity_logs')} — EPSON QC</title></svelte:head>

<div class="page animate-fade-in">
  <h1 class="page-title">{$t('admin.activity_logs')}</h1>

  <div class="search-bar">
    <input class="input" type="text" bind:value={searchQuery} placeholder="Cari log aktivitas..." />
  </div>

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
        {#each filteredLogs as log, i}
          <tr>
            <td>{i + 1}</td>
            <td><code>{log.user}</code></td>
            <td><span class="badge badge-info">{log.action}</span></td>
            <td>{log.detail}</td>
            <td class="dim">{log.timestamp}</td>
          </tr>
        {/each}
        {#if filteredLogs.length === 0}
          <tr><td colspan="5" class="no-data">{$t('common.no_data')}</td></tr>
        {/if}
      </tbody>
    </table>
  </div>
</div>

<style>
  .page-title { font-size: var(--fs-xl); font-weight: var(--fw-semibold); margin-bottom: var(--sp-5); }
  .search-bar { margin-bottom: var(--sp-4); max-width: 400px; }
  .dim { color: var(--clr-text-dim); font-size: var(--fs-xs); }
  .no-data { text-align: center; color: var(--clr-text-dim); padding: var(--sp-8) !important; }
  code { background: var(--clr-surface-2); padding: 1px 6px; border-radius: 4px; font-size: var(--fs-xs); }
</style>
