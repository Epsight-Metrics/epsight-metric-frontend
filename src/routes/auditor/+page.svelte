<script>
  import { t } from '$lib/i18n.js';
  import { mockInspectionHistory } from '$lib/data/mock.js';

  let history = $state([...mockInspectionHistory]);
  let dateFrom = $state('2026-05-01');
  let dateTo = $state('2026-05-03');
  let filterPart = $state('');
  let filterVendor = $state('');
  let filterStatus = $state('');
  let filterOperator = $state('');

  const vendors = [...new Set(mockInspectionHistory.map(h => h.vendor))];
  const operators = [...new Set(mockInspectionHistory.map(h => h.operator))];

  let filtered = $derived(
    history.filter(h =>
      (!filterPart || h.partName.toLowerCase().includes(filterPart.toLowerCase()) || h.partCode.toLowerCase().includes(filterPart.toLowerCase())) &&
      (!filterVendor || h.vendor === filterVendor) &&
      (!filterStatus || h.status === filterStatus) &&
      (!filterOperator || h.operator === filterOperator)
    )
  );

  function exportCSV() {
    const headers = 'Timestamp,Part ID,Part Name,Part Code,Vendor,Length,Width,Diameter,Status,Operator,Hash,Config,Integrity\n';
    const rows = filtered.map(h => `${h.timestamp},${h.partId},${h.partName},${h.partCode},${h.vendor},${h.length},${h.width},${h.diameter},${h.status},${h.operator},${h.hash},${h.configVersion},${h.integrity}`).join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'audit_inspection_log.csv'; a.click();
    URL.revokeObjectURL(url);
  }

  async function exportPDF() {
    const { jsPDF } = await import('jspdf');
    const autoTable = (await import('jspdf-autotable')).default;
    
    const doc = new jsPDF('landscape');
    
    doc.setFontSize(14);
    doc.text($t('auditor.inspection_logs'), 14, 15);
    
    const tableColumn = [
      $t('auditor.time'), 
      $t('auditor.part_name'), 
      $t('auditor.part_code'), 
      $t('auditor.vendor_name'), 
      $t('auditor.dimension'), 
      $t('auditor.status'), 
      $t('auditor.integrity')
    ];
    
    const tableRows = filtered.map(item => [
      item.timestamp,
      item.partName,
      item.partCode,
      item.vendor,
      `${item.length}×${item.width}×${item.diameter}`,
      item.status,
      item.integrity === 'valid' ? 'Valid' : 'Warning'
    ]);
    
    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 20,
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [79, 70, 229] }
    });
    
    doc.save('audit_inspection_log.pdf');
  }

  function printTable() {
    window.print();
  }
</script>

<svelte:head><title>{$t('auditor.inspection_logs')} — EPSON QC</title></svelte:head>

<div class="page animate-fade-in">
  <h1 class="page-title">{$t('auditor.inspection_logs')}</h1>

  <!-- Advanced Filter -->
  <div class="filter-panel card">
    <h3 class="filter-title">{$t('auditor.advanced_filter')}</h3>
    <div class="filter-grid">
      <div class="form-group period-group">
        <label class="label" for="dateFrom">{$t('auditor.period')}</label>
        <div class="date-range">
          <input id="dateFrom" class="input" type="date" bind:value={dateFrom} />
          <span class="range-sep">{$t('auditor.to')}</span>
          <input id="dateTo" class="input" type="date" bind:value={dateTo} aria-label="End Date" />
        </div>
      </div>
      <div class="form-group">
        <label class="label" for="filterPart">{$t('auditor.part')}</label>
        <input id="filterPart" class="input" bind:value={filterPart} placeholder="ID / Nama / Kode..." />
      </div>
      <div class="form-group">
        <label class="label" for="filterVendor">{$t('auditor.vendor')}</label>
        <select id="filterVendor" class="select" bind:value={filterVendor}>
          <option value="">{$t('common.all')}</option>
          {#each vendors as v}<option value={v}>{v}</option>{/each}
        </select>
      </div>
      <div class="form-group">
        <label class="label" for="filterStatus">{$t('auditor.status')}</label>
        <select id="filterStatus" class="select" bind:value={filterStatus}>
          <option value="">{$t('common.all')}</option>
          <option value="OK">OK</option>
          <option value="NG">NG</option>
        </select>
      </div>
      <div class="form-group">
        <label class="label" for="filterOperator">{$t('auditor.operator')}</label>
        <select id="filterOperator" class="select" bind:value={filterOperator}>
          <option value="">{$t('common.all')}</option>
          {#each operators as op}<option value={op}>{op}</option>{/each}
        </select>
      </div>
    </div>
  </div>

  <!-- Results Table -->
  <div class="table-container">
    <table>
      <thead>
        <tr>
          <th>{$t('auditor.time')}</th>
          <th>{$t('auditor.part_name')}</th>
          <th>{$t('auditor.part_code')}</th>
          <th>{$t('auditor.vendor_name')}</th>
          <th>{$t('auditor.dimension')}</th>
          <th>{$t('auditor.status')}</th>
          <th>{$t('auditor.integrity')}</th>
        </tr>
      </thead>
      <tbody>
        {#each filtered as item}
          <tr>
            <td class="dim">{item.timestamp}</td>
            <td><strong>{item.partName}</strong></td>
            <td><code>{item.partCode}</code></td>
            <td>{item.vendor}</td>
            <td class="mono">{item.length}×{item.width}×{item.diameter}</td>
            <td>
              <span class="badge" class:badge-ok={item.status === 'OK'} class:badge-ng={item.status === 'NG'}>{item.status}</span>
            </td>
            <td>
              <span class="integrity-badge" class:valid={item.integrity === 'valid'} class:warn={item.integrity === 'warning'}>
                {item.integrity === 'valid' ? '🟢' : '🟡'}
                {item.integrity === 'valid' ? $t('auditor.valid') : $t('auditor.warning')}
              </span>
            </td>
          </tr>
        {/each}
        {#if filtered.length === 0}
          <tr><td colspan="7" class="no-data">{$t('common.no_data')}</td></tr>
        {/if}
      </tbody>
    </table>
  </div>

  <!-- Footer -->
  <div class="page-footer">
    <span>{$t('auditor.total_records')}: <strong>{filtered.length}</strong></span>
    <div class="export-btns">
      <button class="btn btn-secondary" onclick={exportCSV}>{$t('auditor.export_csv')}</button>
      <button class="btn btn-secondary" onclick={exportPDF}>{$t('auditor.export_pdf')}</button>
      <button class="btn btn-secondary" onclick={printTable}>{$t('auditor.print')}</button>
    </div>
  </div>
</div>

<style>
  .page-title { font-size: var(--fs-xl); font-weight: var(--fw-semibold); margin-bottom: var(--sp-5); }
  .filter-panel { margin-bottom: var(--sp-4); }
  .filter-title { font-size: var(--fs-sm); font-weight: var(--fw-semibold); color: var(--clr-text-muted); margin-bottom: var(--sp-4); text-transform: uppercase; letter-spacing: 0.5px; }
  .filter-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: var(--sp-4); }
  .period-group { grid-column: span 2; }
  @media (max-width: 600px) {
    .period-group { grid-column: span 1; }
  }
  .date-range { display: flex; align-items: center; gap: var(--sp-2); }
  .range-sep { color: var(--clr-text-dim); font-size: var(--fs-sm); }
  .dim { color: var(--clr-text-dim); font-size: var(--fs-xs); }
  .mono { font-variant-numeric: tabular-nums; font-size: var(--fs-xs); }
  .no-data { text-align: center; color: var(--clr-text-dim); padding: var(--sp-8) !important; }
  code { background: var(--clr-surface-2); padding: 1px 6px; border-radius: 4px; font-size: var(--fs-xs); }
  .integrity-badge { font-size: var(--fs-xs); font-weight: var(--fw-medium); display: inline-flex; align-items: center; gap: 4px; }
  .integrity-badge.valid { color: var(--clr-ok); }
  .integrity-badge.warn { color: var(--clr-warning); }
  .page-footer { display: flex; justify-content: space-between; align-items: center; margin-top: var(--sp-4); padding-top: var(--sp-3); border-top: 1px solid var(--clr-border); font-size: var(--fs-sm); color: var(--clr-text-muted); }
  .export-btns { display: flex; gap: var(--sp-2); }
</style>
