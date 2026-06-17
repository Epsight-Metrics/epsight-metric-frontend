<script>
  import { t } from '$lib/i18n.js';
  import { getLogs } from '$lib/api/admin.js';
  import { onMount } from 'svelte';

  let logs = $state([]);
  let searchQuery = $state('');
  let filterUser = $state('');
  let dateFrom = $state('');
  let dateTo = $state('');
  let activeQuickFilter = $state('');
  let page = $state(1);
  let limit = $state(50);
  let total = $state(0);
  let loading = $state(true);
  let error = $state('');
  let viewMode = $state('list'); // 'list' | 'grouped'
  let expandedUserId = $state(null);

  let totalPages = $derived(Math.ceil(total / limit) || 1);

  async function fetchLogs() {
    loading = true;
    error = '';
    try {
      const params = { page, limit };
      if (searchQuery) params.action = searchQuery;
      if (filterUser) params.username = filterUser;
      if (dateFrom) {
        params.dateFrom = `${dateFrom}T00:00:00`;
      }
      if (dateTo) {
        params.dateTo = `${dateTo}T23:59:59`;
      }
      const result = await getLogs(params);
      logs = (result.logs || []).map(log => ({
        id: log.id,
        userId: log.userId,
        user: log.user?.username || log.userId,
        userName: log.user?.name || '-',
        action: log.action,
        detail: log.detail || '-',
        timestamp: new Date(log.createdAt).toLocaleString('id-ID'),
        rawDate: new Date(log.createdAt),
      }));
      total = result.total || 0;
    } catch (err) {
      error = err.message;
    } finally {
      loading = false;
    }
  }

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

  function goToPage(p) {
    page = p;
    fetchLogs();
  }

  onMount(() => {
    fetchLogs();
  });

  let searchTimer;
  let isQuickFilterActive = false;
  
  $effect(() => {
    searchQuery; filterUser;
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      page = 1;
      fetchLogs();
    }, 300);
  });

  $effect(() => {
    dateFrom; dateTo;
    if (!isQuickFilterActive && activeQuickFilter) {
      activeQuickFilter = '';
    }
    isQuickFilterActive = false;
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      page = 1;
      fetchLogs();
    }, 300);
  });

  // Group logs by user
  let groupedLogs = $derived.by(() => {
    const groups = {};
    logs.forEach(log => {
      const key = log.user;
      if (!groups[key]) {
        groups[key] = {
          userId: log.userId,
          username: log.user,
          userName: log.userName,
          logs: [],
          count: 0,
        };
      }
      groups[key].logs.push(log);
      groups[key].count++;
    });
    return Object.values(groups);
  });

  function toggleExpandUser(userId) {
    expandedUserId = expandedUserId === userId ? null : userId;
  }
</script>

<svelte:head><title>{$t('admin.activity_logs')} — EPSON QC</title></svelte:head>

<div class="page animate-fade-in">
  <div class="page-header">
    <h1 class="page-title">{$t('admin.activity_logs')}</h1>
    <div class="view-toggle">
      <button class="toggle-btn" class:active={viewMode === 'list'} onclick={() => viewMode = 'list'}>
        <svg class="toggle-icon" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
        Daftar Log
      </button>
      <button class="toggle-btn" class:active={viewMode === 'grouped'} onclick={() => viewMode = 'grouped'}>
        <svg class="toggle-icon" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
        Group by User
      </button>
    </div>
  </div>

  {#if error}
    <div class="error-banner">{error}</div>
  {/if}

  <div class="filter-row">
    <input class="input filter-input" type="text" bind:value={searchQuery} placeholder="Cari aksi..." />
    <input class="input filter-input" type="text" bind:value={filterUser} placeholder="Username..." />
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
              <th>No</th>
              <th>User</th>
              <th>Aksi</th>
              <th>Detail</th>
              <th>Waktu</th>
            </tr>
          {:else}
            <tr>
              <th></th>
              <th>User</th>
              <th>Total Aktivitas</th>
              <th></th>
            </tr>
          {/if}
        </thead>
        <tbody>
          {#if viewMode === 'list'}
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
          {:else}
            {#each groupedLogs as group}
              <tr class="clickable" onclick={() => toggleExpandUser(group.userId)}>
                <td class="expand-icon" style="vertical-align: middle;">
                  {#if expandedUserId === group.userId}
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                  {:else}
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
                  {/if}
                </td>
                <td>
                  <code>{group.username}</code>
                  <span class="dim" style="margin-left: 8px;">{group.userName}</span>
                </td>
                <td><span class="badge badge-info">{group.count} aktivitas</span></td>
                <td></td>
              </tr>
              {#if expandedUserId === group.userId}
                <tr class="detail-row animate-fade-in">
                  <td colspan="4">
                    <div class="user-logs-container animate-fade-in">
                      <h4 class="user-logs-subtitle">Aktivitas {group.username}</h4>
                      <div class="user-logs-table-wrapper">
                        <table class="user-logs-table">
                          <thead>
                            <tr>
                              <th>Aksi</th>
                              <th>Detail</th>
                              <th>Waktu</th>
                            </tr>
                          </thead>
                          <tbody>
                            {#each group.logs as log}
                              <tr>
                                <td><span class="badge badge-info">{log.action}</span></td>
                                <td>{log.detail}</td>
                                <td class="dim">{log.timestamp}</td>
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
            {#if groupedLogs.length === 0}
              <tr><td colspan="4" class="no-data">{$t('common.no_data')}</td></tr>
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

<style>
  .page { display: flex; flex-direction: column; flex: 1; height: 100%; }
  .page-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--sp-5); flex-wrap: wrap; gap: var(--sp-3); }
  .page-title { font-size: var(--fs-xl); font-weight: var(--fw-semibold); }
  .filter-row { display: flex; gap: var(--sp-3); margin-bottom: var(--sp-4); flex-wrap: wrap; align-items: center; }
  .filter-input { max-width: 200px; min-height: 44px; }
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
  .date-range-info {
    font-size: var(--fs-sm);
    color: var(--clr-text-muted);
    padding: var(--sp-2) var(--sp-3);
    background: var(--clr-surface);
    border-left: 3px solid var(--clr-accent);
    border-radius: var(--radius-sm);
    margin-bottom: var(--sp-3);
  }
  .dim { color: var(--clr-text-dim); font-size: var(--fs-xs); }
  .no-data { text-align: center; color: var(--clr-text-dim); padding: var(--sp-8) !important; }
  .error-banner { padding: var(--sp-3); background: var(--clr-ng-bg); color: var(--clr-ng); border-radius: var(--radius-md); font-size: var(--fs-sm); margin-bottom: var(--sp-4); border: 1px solid rgba(239,68,68,0.2); }
  .loading-state { padding: var(--sp-8); text-align: center; color: var(--clr-text-muted); }
  code { background: var(--clr-surface-2); padding: 1px 6px; border-radius: 4px; font-size: var(--fs-xs); }
  .table-container { flex: 1; overflow-y: auto; overflow-x: auto; }
  .table-footer { margin-top: var(--sp-3); font-size: var(--fs-xs); color: var(--clr-text-dim); display: flex; justify-content: space-between; align-items: center; }
  .pagination { display: flex; align-items: center; gap: var(--sp-2); }
  .page-num { font-weight: var(--fw-medium); color: var(--clr-text-muted); }

  /* View Toggle */
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

  /* Grouped View Styles */
  .clickable {
    cursor: pointer;
  }
  .clickable:hover {
    background: var(--clr-surface-2);
  }
  .expand-icon { color: var(--clr-text-dim); font-size: var(--fs-xs); width: 24px; }
  .detail-row td { padding: var(--sp-4) !important; background: var(--clr-surface-2); }
  .user-logs-container {
    padding: var(--sp-4) var(--sp-5);
    background: var(--clr-surface);
    border: 1px solid var(--clr-border);
    border-radius: var(--radius-lg);
    box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.01);
    margin: var(--sp-2) 0;
  }
  .user-logs-subtitle {
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
  .user-logs-subtitle::before {
    content: "";
    display: inline-block;
    width: 4px;
    height: 14px;
    background: var(--clr-accent);
    border-radius: var(--radius-sm);
  }
  .user-logs-table-wrapper {
    overflow-x: auto;
    border: 1px solid var(--clr-border);
    border-radius: var(--radius-md);
    background: var(--clr-surface-2);
  }
  .user-logs-table {
    width: 100%;
    border-collapse: collapse;
    font-size: var(--fs-sm);
  }
  .user-logs-table th {
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
  .user-logs-table td {
    padding: var(--sp-3) var(--sp-4);
    border-bottom: 1px solid var(--clr-border);
    color: var(--clr-text);
  }
  .user-logs-table tr:last-child td {
    border-bottom: none;
  }

  @media (max-width: 768px) {
    .page-header {
      flex-direction: column;
      align-items: flex-start;
    }
    .view-toggle {
      align-self: flex-start;
    }
    .page-title {
      font-size: var(--fs-lg);
    }
    .filter-row {
      gap: var(--sp-2);
    }
    .filter-input {
      max-width: 100%;
      width: 100%;
      flex: 1 1 calc(50% - var(--sp-2));
    }
    .quick-filters {
      width: 100%;
      flex: 1 1 100%;
    }
    .quick-btn {
      flex: 1;
      text-align: center;
    }
    .date-filter-group {
      flex: 1 1 calc(50% - var(--sp-2));
      min-width: 0;
    }
    .table-container {
      overflow-x: auto;
    }
    table {
      font-size: var(--fs-xs);
      min-width: 650px;
    }
    .table-footer {
      flex-direction: column;
      gap: var(--sp-3);
      align-items: center;
    }
  }
</style>
