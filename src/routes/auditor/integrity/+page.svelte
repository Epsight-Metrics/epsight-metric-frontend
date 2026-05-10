<script>
  import { t } from '$lib/i18n.js';
  import { mockInspectionHistory } from '$lib/data/mock.js';

  let records = $state([...mockInspectionHistory]);

  let totalRecords = $derived(records.length);
  let validCount = $derived(records.filter(r => r.integrity === 'valid').length);
  let warningCount = $derived(records.filter(r => r.integrity === 'warning').length);
  let integrityRate = $derived(totalRecords > 0 ? ((validCount / totalRecords) * 100).toFixed(1) : '0');
</script>

<svelte:head><title>{$t('auditor.data_integrity')} — EPSON QC</title></svelte:head>

<div class="page animate-fade-in">
  <h1 class="page-title">{$t('auditor.data_integrity')}</h1>
  <p class="subtitle">Verifikasi keaslian data menggunakan hash & timestamp</p>

  <!-- Summary Cards -->
  <div class="summary-grid">
    <div class="card summary-card">
      <span class="summary-icon"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M7 17v-4"/><path d="M12 17V9"/><path d="M17 17v-6"/></svg></span>
      <span class="summary-val">{totalRecords}</span>
      <span class="summary-label">{$t('auditor.total_records')}</span>
    </div>
    <div class="card summary-card ok-card">
      <span class="summary-icon"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon-ok"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg></span>
      <span class="summary-val">{validCount}</span>
      <span class="summary-label">{$t('auditor.valid')}</span>
    </div>
    <div class="card summary-card warn-card">
      <span class="summary-icon"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon-warn"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg></span>
      <span class="summary-val">{warningCount}</span>
      <span class="summary-label">{$t('auditor.warning')}</span>
    </div>
    <div class="card summary-card">
      <span class="summary-icon"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg></span>
      <span class="summary-val">{integrityRate}%</span>
      <span class="summary-label">{$t('auditor.integrity_rate')}</span>
    </div>
  </div>

  <!-- Records Table -->
  <div class="table-container">
    <table>
      <thead>
        <tr>
          <th>ID</th>
          <th>Part</th>
          <th>Timestamp</th>
          <th>Hash</th>
          <th>Config Version</th>
          <th>Status</th>
          <th>Integritas</th>
        </tr>
      </thead>
      <tbody>
        {#each records as record}
          <tr>
            <td><code>{record.id}</code></td>
            <td>{record.partName}</td>
            <td class="dim">{record.timestamp}</td>
            <td><code class="hash">{record.hash}</code></td>
            <td>{record.configVersion}</td>
            <td><span class="badge" class:badge-ok={record.status === 'OK'} class:badge-ng={record.status === 'NG'}>{record.status}</span></td>
            <td>
              <span class="integrity-badge" class:valid={record.integrity === 'valid'} class:warn={record.integrity === 'warning'}>
                {record.integrity === 'valid' ? 'Valid' : 'Warning'}
              </span>
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
</div>

<style>
  .page-title { font-size: var(--fs-xl); font-weight: var(--fw-semibold); margin-bottom: var(--sp-2); }
  .subtitle { color: var(--clr-text-dim); font-size: var(--fs-sm); margin-bottom: var(--sp-5); }
  .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: var(--sp-4); margin-bottom: var(--sp-6); }
  .summary-card {
    display: flex; flex-direction: column; align-items: center; text-align: center; padding: var(--sp-5);
    transition: all var(--transition-fast);
  }
  .summary-card:hover { transform: translateY(-2px); box-shadow: var(--shadow-md); }
  .ok-card { border-top: 3px solid var(--clr-ok); }
  .warn-card { border-top: 3px solid var(--clr-warning); }
  .summary-icon { display: flex; color: var(--clr-text-muted); margin-bottom: var(--sp-2); }
  .icon-ok { color: var(--clr-ok); }
  .icon-warn { color: var(--clr-warning); }
  .summary-val { font-size: var(--fs-2xl); font-weight: var(--fw-bold); }
  .summary-label { font-size: var(--fs-xs); color: var(--clr-text-muted); text-transform: uppercase; letter-spacing: 0.5px; }
  .dim { color: var(--clr-text-dim); font-size: var(--fs-xs); }
  code { background: var(--clr-surface-2); padding: 1px 6px; border-radius: 4px; font-size: var(--fs-xs); }
  .hash { color: var(--clr-accent-hover); }
  .integrity-badge { font-size: var(--fs-xs); font-weight: var(--fw-medium); }
  .integrity-badge.valid { color: var(--clr-ok); }
  .integrity-badge.warn { color: var(--clr-warning); }
</style>
