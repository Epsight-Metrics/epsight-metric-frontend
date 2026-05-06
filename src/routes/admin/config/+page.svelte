<script>
  import { t } from '$lib/i18n.js';

  let config = $state({
    cameraResolution: '1920x1080',
    inspectionTimeout: 2000,
    alarmVolume: 80,
    autoRefreshInterval: 30,
    ngThreshold: 5.0,
    calibrationDate: '2026-04-28',
  });

  let saved = $state(false);

  function saveConfig() {
    // TODO: POST to /api/config
    saved = true;
    setTimeout(() => saved = false, 2000);
  }
</script>

<svelte:head><title>{$t('admin.system_config')} — EPSON QC</title></svelte:head>

<div class="page animate-fade-in">
  <h1 class="page-title">{$t('admin.system_config')}</h1>

  <div class="config-grid">
    <div class="card">
      <h3 class="card-title">📷 Kamera</h3>
      <div class="form-group">
        <label class="label">Resolusi Kamera</label>
        <select class="select" bind:value={config.cameraResolution}>
          <option>1920x1080</option>
          <option>1280x720</option>
          <option>640x480</option>
        </select>
      </div>
      <div class="form-group">
        <label class="label">Timeout Inspeksi (ms)</label>
        <input class="input" type="number" bind:value={config.inspectionTimeout} />
      </div>
    </div>

    <div class="card">
      <h3 class="card-title">🔊 Alarm & Notifikasi</h3>
      <div class="form-group">
        <label class="label">Volume Alarm (%)</label>
        <input class="input" type="range" min="0" max="100" bind:value={config.alarmVolume} />
        <span class="range-value">{config.alarmVolume}%</span>
      </div>
      <div class="form-group">
        <label class="label">Auto-refresh Interval (detik)</label>
        <input class="input" type="number" bind:value={config.autoRefreshInterval} />
      </div>
    </div>

    <div class="card">
      <h3 class="card-title">📐 Kalibrasi & Toleransi</h3>
      <div class="form-group">
        <label class="label">NG Threshold (%)</label>
        <input class="input" type="number" step="0.1" bind:value={config.ngThreshold} />
      </div>
      <div class="form-group">
        <label class="label">Tanggal Kalibrasi Terakhir</label>
        <input class="input" type="date" bind:value={config.calibrationDate} />
      </div>
    </div>
  </div>

  <div class="save-section">
    <button class="btn btn-primary btn-lg" onclick={saveConfig}>
      💾 Simpan Konfigurasi
    </button>
    {#if saved}
      <span class="saved-msg animate-fade-in">Tersimpan!</span>
    {/if}
  </div>
</div>

<style>
  .page-title { font-size: var(--fs-xl); font-weight: var(--fw-semibold); margin-bottom: var(--sp-5); }
  .config-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: var(--sp-4);
    margin-bottom: var(--sp-6);
  }
  .card-title {
    font-size: var(--fs-md);
    font-weight: var(--fw-semibold);
    margin-bottom: var(--sp-4);
  }
  .range-value {
    font-size: var(--fs-sm);
    color: var(--clr-accent);
    font-weight: var(--fw-semibold);
  }
  .save-section {
    display: flex;
    align-items: center;
    gap: var(--sp-4);
  }
  .saved-msg {
    color: var(--clr-ok);
    font-weight: var(--fw-medium);
  }
</style>
