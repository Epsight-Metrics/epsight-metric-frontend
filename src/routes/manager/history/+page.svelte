<script>
  import { t } from '$lib/i18n.js';
  import { mockInspectionHistory } from '$lib/data/mock.js';

  let history = $state([...mockInspectionHistory]);
  let filterPart = $state('');
  let filterVendor = $state('');
  let filterStatus = $state('');
  let expandedId = $state(null);

  let filtered = $derived(
    history.filter(h =>
      (!filterPart || h.partName.toLowerCase().includes(filterPart.toLowerCase())) &&
      (!filterVendor || h.vendor === filterVendor) &&
      (!filterStatus || h.status === filterStatus)
    )
  );

  const vendors = [...new Set(mockInspectionHistory.map(h => h.vendor))];

  function toggleExpand(id) { expandedId = expandedId === id ? null : id; }

  function exportCSV() {
    const headers = 'Timestamp,Part Name,Part Code,Vendor,Length,Width,Diameter,Status,Operator\n';
    const rows = filtered.map(h => `${h.timestamp},${h.partName},${h.partCode},${h.vendor},${h.length},${h.width},${h.diameter},${h.status},${h.operator}`).join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'inspection_history.csv'; a.click();
    URL.revokeObjectURL(url);
  }

  async function exportPDF() {
    const { jsPDF } = await import('jspdf');
    const autoTable = (await import('jspdf-autotable')).default;
    
    const doc = new jsPDF('landscape');
    
    doc.setFontSize(14);
    doc.text($t('manager.inspection_history'), 14, 15);
    
    const tableColumn = ['Waktu', 'Part Name', 'Part Code', 'Vendor', 'Dimensi', 'Status', 'Operator'];
    
    const tableRows = filtered.map(item => [
      item.timestamp,
      item.partName,
      item.partCode,
      item.vendor,
      `${item.length}×${item.width}×${item.diameter}`,
      item.status,
      item.operator
    ]);
    
    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 20,
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [79, 70, 229] }
    });
    
    doc.save('manager_inspection_history.pdf');
  }
</script>

<svelte:head><title>{$t('manager.inspection_history')} — EPSON QC</title></svelte:head>

<div class="page animate-fade-in">
  <div class="page-header">
    <h1 class="page-title">{$t('manager.inspection_history')}</h1>
    <div class="export-btns">
      <button class="btn btn-secondary" onclick={exportCSV}>{$t('manager.export_csv')}</button>
      <button class="btn btn-secondary" onclick={exportPDF}>{$t('manager.export_pdf')}</button>
    </div>
  </div>

  <!-- Filters -->
  <div class="filter-row">
    <input class="input filter-input" placeholder="Part Name..." bind:value={filterPart} />
    <select class="select filter-select" bind:value={filterVendor}>
      <option value="">Vendor: {$t('common.all')}</option>
      {#each vendors as v}<option value={v}>{v}</option>{/each}
    </select>
    <select class="select filter-select" bind:value={filterStatus}>
      <option value="">Status: {$t('common.all')}</option>
      <option value="OK">OK</option>
      <option value="NG">NG</option>
    </select>
  </div>

  <!-- Table -->
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
        {#each filtered as item}
          <tr class="clickable" onclick={() => toggleExpand(item.id)}>
            <td class="expand-icon">{expandedId === item.id ? '▼' : '▶'}</td>
            <td class="dim">{item.timestamp}</td>
            <td><strong>{item.partName}</strong></td>
            <td>{item.vendor}</td>
            <td>{item.length}×{item.width}×{item.diameter} mm</td>
            <td><span class="badge" class:badge-ok={item.status === 'OK'} class:badge-ng={item.status === 'NG'}>{item.status}</span></td>
            <td>{item.operator}</td>
          </tr>
          {#if expandedId === item.id}
            <tr class="detail-row animate-fade-in">
              <td colspan="7">
                <div class="detail-grid">
                  <div><span class="dl">ID:</span> {item.id}</div>
                  <div><span class="dl">Part Code:</span> {item.partCode}</div>
                  <div><span class="dl">Panjang:</span> {item.length} mm</div>
                  <div><span class="dl">Lebar:</span> {item.width} mm</div>
                  <div><span class="dl">Diameter:</span> {item.diameter} mm</div>
                  <div><span class="dl">Config:</span> {item.configVersion}</div>
                </div>
              </td>
            </tr>
          {/if}
        {/each}
      </tbody>
    </table>
  </div>
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
</style>
