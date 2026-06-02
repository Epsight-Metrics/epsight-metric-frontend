<script>
  import { onMount, onDestroy } from 'svelte';
  import { getCalibration, saveCalibration } from '$lib/api/engineer.js';
  import { isAuthenticated } from '$lib/stores/auth.js';
  import { Sliders, Ruler, Eye, Crop, AlertTriangle, Save, Check } from '@lucide/svelte';

  let loading = $state(true);
  let saving  = $state(false);
  let saved   = $state(false);
  let error   = $state('');

  let cfg = $state({
    pixelPerMm:     9.28,
    toleranceMm:    1.0,
    contourThresh:  200,
    contourMinArea: 1500,
    minFeatureMm:   5.0,
    warningDuration: 5.0,
    roiPercent:     [0.20, 0.10, 0.80, 0.90],
  });

  let roi = $state({ x1: 0.20, y1: 0.10, x2: 0.80, y2: 0.90 });
  let abortController;

  async function loadCalibration() {
    if (!$isAuthenticated) return;
    if (abortController) abortController.abort();
    abortController = new AbortController();

    loading = true;
    error = '';

    try {
      const data = await getCalibration({ signal: abortController.signal });
      cfg.pixelPerMm      = data.pixelPerMm;
      cfg.toleranceMm     = data.toleranceMm;
      cfg.contourThresh   = data.contourThresh;
      cfg.contourMinArea  = data.contourMinArea;
      cfg.minFeatureMm    = data.minFeatureMm;
      cfg.warningDuration = data.warningDuration;
      if (Array.isArray(data.roiPercent) && data.roiPercent.length === 4) {
        roi.x1 = data.roiPercent[0];
        roi.y1 = data.roiPercent[1];
        roi.x2 = data.roiPercent[2];
        roi.y2 = data.roiPercent[3];
      }
    } catch (err) {
      if (err.name === 'AbortError') return;
      error = err.message;
    } finally {
      if (abortController && abortController.signal.aborted) return;
      loading = false;
    }
  }

  onMount(() => loadCalibration());
  onDestroy(() => { if (abortController) abortController.abort(); });

  async function handleSave() {
    saving = true;
    error  = '';
    saved  = false;
    try {
      await saveCalibration({
        ...cfg,
        roiPercent: [roi.x1, roi.y1, roi.x2, roi.y2],
      });
      saved = true;
      setTimeout(() => (saved = false), 3000);
    } catch (err) {
      error = err.message;
    } finally {
      saving = false;
    }
  }
</script>

<svelte:head><title>Kalibrasi CV — EPSON QC</title></svelte:head>

<div class="page animate-fade-in">
  <div class="page-header">
    <h1 class="page-title"><Sliders class="inline-icon" size={24} /> Kalibrasi CV</h1>
  </div>

  {#if error}
    <div class="error-banner">{error}</div>
  {/if}

  {#if loading}
    <div class="loading-center"><span class="spinner-lg"></span><p>Memuat...</p></div>
  {:else}
    <div class="cal-grid">
      <div class="card">
        <h3 class="card-title"><Ruler class="inline-icon" size={20} /> Skala & Toleransi</h3>
        <div class="form-group">
          <label class="label">Pixel per mm</label>
          <input class="input" type="number" step="0.01" min="0.1" bind:value={cfg.pixelPerMm} />
        </div>
        <div class="form-group">
          <label class="label">Toleransi (mm)</label>
          <input class="input" type="number" step="0.1" min="0" bind:value={cfg.toleranceMm} />
        </div>
      </div>

      <div class="card">
        <h3 class="card-title"><Eye class="inline-icon" size={20} /> Deteksi</h3>
        <div class="form-group">
          <label class="label">Threshold ({cfg.contourThresh})</label>
          <input class="range-input" type="range" min="10" max="250" step="5" bind:value={cfg.contourThresh} />
        </div>
        <div class="form-group">
          <label class="label">Min Area (px²)</label>
          <input class="input" type="number" step="100" min="100" bind:value={cfg.contourMinArea} />
        </div>
      </div>
    </div>

    <div class="save-bar">
      <button class="btn btn-primary" onclick={handleSave} disabled={saving}>
        {#if saving}
          <span class="spinner"></span> Menyimpan...
        {:else}
          <Save size={16} /> Simpan
        {/if}
      </button>
      {#if saved}
        <span class="saved-msg"><Check size={16} /> Tersimpan!</span>
      {/if}
    </div>
  {/if}
</div>

<style>
  .page { padding: var(--sp-6); }
  .page-header { margin-bottom: var(--sp-6); padding-bottom: var(--sp-4); border-bottom: 1px solid var(--clr-border); }
  .page-title { font-size: var(--fs-2xl); font-weight: var(--fw-bold); }
  .inline-icon { display: inline-block; vertical-align: middle; margin-right: 8px; }
  .cal-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: var(--sp-5); margin-bottom: var(--sp-6); }
  .card-title { font-size: var(--fs-lg); font-weight: var(--fw-semibold); margin-bottom: var(--sp-4); }
  .range-input { width: 100%; accent-color: var(--clr-accent); }
  .save-bar { display: flex; align-items: center; gap: var(--sp-4); padding: var(--sp-5) 0; }
  .saved-msg { color: var(--clr-ok); font-weight: var(--fw-semibold); }
  .spinner { display: inline-block; width: 16px; height: 16px; border: 2px solid rgba(255,255,255,0.4); border-top-color: #fff; border-radius: 50%; animation: spin 0.6s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }
  .loading-center { display: flex; flex-direction: column; align-items: center; gap: var(--sp-4); padding: var(--sp-12); }
  .spinner-lg { width: 32px; height: 32px; border: 3px solid var(--clr-border); border-top-color: var(--clr-accent); border-radius: 50%; animation: spin 0.6s linear infinite; }
  .error-banner { padding: var(--sp-3); background: var(--clr-ng-bg); color: var(--clr-ng); border-radius: var(--radius-md); margin-bottom: var(--sp-4); }
  @media (max-width: 768px) { .cal-grid { grid-template-columns: 1fr; } }
</style>
