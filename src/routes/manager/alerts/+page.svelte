<script>
  import { t } from '$lib/i18n.js';
  import { mockAlerts } from '$lib/data/mock.js';

  let alerts = $state([...mockAlerts]);
</script>

<svelte:head><title>{$t('manager.alert_summary')} — EPSON QC</title></svelte:head>

<div class="page animate-fade-in">
  <h1 class="page-title">{$t('manager.alert_summary')}</h1>
  <p class="subtitle">Ringkasan notifikasi kegagalan (NG) terbaru</p>

  <div class="alert-list">
    {#each alerts as alert}
      <div class="alert-card card">
        <div class="alert-header">
          <span class="badge badge-ng">NG</span>
          <span class="alert-part">{alert.partId}</span>
          <span class="alert-time">{alert.timestamp}</span>
        </div>
        <div class="alert-body">
          <div class="alert-detail">
            <span class="dl">Vendor:</span> {alert.vendor}
          </div>
          <div class="alert-detail">
            <span class="dl">Dimensi Gagal:</span> {alert.dimension}
          </div>
          <div class="alert-detail">
            <span class="dl">Nilai:</span> <span class="val-ng">{alert.value} mm</span> (Ekspektasi: {alert.expected} mm)
          </div>
          <div class="alert-detail">
            <span class="dl">Operator:</span> {alert.operator}
          </div>
        </div>
      </div>
    {/each}
  </div>
</div>

<style>
  .page-title { font-size: var(--fs-xl); font-weight: var(--fw-semibold); margin-bottom: var(--sp-2); }
  .subtitle { color: var(--clr-text-dim); font-size: var(--fs-sm); margin-bottom: var(--sp-5); }
  .alert-list { display: flex; flex-direction: column; gap: var(--sp-3); }
  .alert-card { border-left: 3px solid var(--clr-ng); }
  .alert-header { display: flex; align-items: center; gap: var(--sp-3); margin-bottom: var(--sp-3); }
  .alert-part { font-weight: var(--fw-semibold); }
  .alert-time { margin-left: auto; font-size: var(--fs-xs); color: var(--clr-text-dim); }
  .alert-body { display: grid; grid-template-columns: 1fr 1fr; gap: var(--sp-2); }
  .alert-detail { font-size: var(--fs-sm); }
  .dl { color: var(--clr-text-muted); }
  .val-ng { color: var(--clr-ng); font-weight: var(--fw-semibold); }
</style>
