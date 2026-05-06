<script>
  import { t } from '$lib/i18n.js';
  import { mockBatches } from '$lib/data/mock.js';

  let batches = $state([...mockBatches]);
</script>

<svelte:head><title>{$t('auditor.traceability')} — EPSON QC</title></svelte:head>

<div class="page animate-fade-in">
  <h1 class="page-title">{$t('auditor.traceability')}</h1>
  <p class="subtitle">Validasi kelengkapan riwayat inspeksi per batch produk</p>

  <div class="batch-grid">
    {#each batches as batch}
      <div class="card batch-card" class:verified={batch.verified} class:unverified={!batch.verified}>
        <div class="batch-header">
          <span class="batch-id">{batch.batchId}</span>
          <span class="badge" class:badge-ok={batch.verified} class:badge-warning={!batch.verified}>
            {batch.verified ? '✅ Terverifikasi' : '⏳ Dalam Proses'}
          </span>
        </div>
        <div class="batch-body">
          <div class="batch-info">
            <span class="dl">Part:</span>
            <span>{batch.partName}</span>
          </div>
          <div class="batch-info">
            <span class="dl">Tanggal:</span>
            <span>{batch.date}</span>
          </div>
          <div class="batch-stats">
            <div class="stat">
              <span class="stat-val">{batch.totalParts}</span>
              <span class="stat-label">Total</span>
            </div>
            <div class="stat">
              <span class="stat-val">{batch.inspected}</span>
              <span class="stat-label">Diinspeksi</span>
            </div>
            <div class="stat stat-ok">
              <span class="stat-val">{batch.passed}</span>
              <span class="stat-label">Lolos</span>
            </div>
            <div class="stat stat-ng">
              <span class="stat-val">{batch.failed}</span>
              <span class="stat-label">Gagal</span>
            </div>
          </div>
          <!-- Progress bar -->
          <div class="progress-bar">
            <div class="progress-fill" style="width: {(batch.inspected / batch.totalParts) * 100}%"></div>
          </div>
          <span class="progress-label">{((batch.inspected / batch.totalParts) * 100).toFixed(0)}% Terinspeksi</span>
        </div>
      </div>
    {/each}
  </div>
</div>

<style>
  .page-title { font-size: var(--fs-xl); font-weight: var(--fw-semibold); margin-bottom: var(--sp-2); }
  .subtitle { color: var(--clr-text-dim); font-size: var(--fs-sm); margin-bottom: var(--sp-5); }
  .batch-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(350px, 1fr)); gap: var(--sp-4); }
  .batch-card.verified { border-left: 3px solid var(--clr-ok); }
  .batch-card.unverified { border-left: 3px solid var(--clr-warning); }
  .batch-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--sp-4); }
  .batch-id { font-weight: var(--fw-semibold); font-size: var(--fs-sm); }
  .batch-body { display: flex; flex-direction: column; gap: var(--sp-3); }
  .batch-info { font-size: var(--fs-sm); display: flex; gap: var(--sp-2); }
  .dl { color: var(--clr-text-muted); min-width: 60px; }
  .batch-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: var(--sp-2); margin-top: var(--sp-2); }
  .stat { text-align: center; padding: var(--sp-2); background: var(--clr-surface-2); border-radius: var(--radius-sm); }
  .stat-val { display: block; font-size: var(--fs-lg); font-weight: var(--fw-bold); }
  .stat-label { font-size: var(--fs-xs); color: var(--clr-text-dim); }
  .stat-ok .stat-val { color: var(--clr-ok); }
  .stat-ng .stat-val { color: var(--clr-ng); }
  .progress-bar { height: 6px; background: var(--clr-surface-2); border-radius: 3px; overflow: hidden; }
  .progress-fill { height: 100%; background: linear-gradient(90deg, var(--clr-accent), var(--clr-ok)); border-radius: 3px; transition: width 0.6s ease; }
  .progress-label { font-size: var(--fs-xs); color: var(--clr-text-dim); }
</style>
