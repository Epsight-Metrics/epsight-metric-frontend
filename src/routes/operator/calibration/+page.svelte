<script>
  import { onMount, onDestroy } from 'svelte';
  import { getCalibration, saveCalibration } from '$lib/api/engineer.js';
  import { cache } from '$lib/stores/cache.js';
  import { isAuthenticated } from '$lib/stores/auth.js';
  import { Sliders, Ruler, Eye, Crop, AlertTriangle, Info, Save, Check } from '@lucide/svelte';

  let loading = $state(true);
  let saving  = $state(false);
  let saved   = $state(false);
  let error   = $state('');
  let lastUpdatedBy = $state('');
  let lastUpdatedAt = $state('');

  let cfg = $state({
    pixelPerMm:     9.28,
    toleranceMm:    1.0,
    contourThresh:  200,
    contourMinArea: 1500,
    minFeatureMm:   5.0,
    warningDuration: 5.0,
    roiPercent:     [0.20, 0.10, 0.80, 0.90],
  });

  // ROI helper
  let roi = $state({ x1: 0.20, y1: 0.10, x2: 0.80, y2: 0.90 });
  let abortController;

  async function loadCalibration() {
    if (!$isAuthenticated) return;

    if (abortController) {
      abortController.abort();
    }
    abortController = new AbortController();

    loading = true;
    error = '';

    const cacheKey = 'engineer_calibration_config';
    const cached = cache.get(cacheKey);
    if (cached) {
      cfg = cached.cfg;
      roi = cached.roi;
      lastUpdatedBy = cached.lastUpdatedBy;
      lastUpdatedAt = cached.lastUpdatedAt;
      loading = false;
      return;
    }

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
      lastUpdatedBy = data.updatedByUser?.name || '-';
      lastUpdatedAt = data.updatedAt ? new Date(data.updatedAt).toLocaleString('id-ID') : '-';

      cache.set(cacheKey, {
        cfg: { ...cfg },
        roi: { ...roi },
        lastUpdatedBy,
        lastUpdatedAt
      });
    } catch (err) {
      if (err.name === 'AbortError') return;
      error = err.message;
    } finally {
      if (abortController && abortController.signal.aborted) return;
      loading = false;
    }
  }

  onMount(() => {
    loadCalibration();
  });

  onDestroy(() => {
    if (abortController) {
      abortController.abort();
    }
  });

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
      lastUpdatedAt = new Date().toLocaleString('id-ID');
      
      // Update cache upon successful save
      cache.set('engineer_calibration_config', {
        cfg: { ...cfg },
        roi: { ...roi },
        lastUpdatedBy: lastUpdatedBy || 'Anda',
        lastUpdatedAt
      });

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
    <div>
      <h1 class="page-title"><Sliders class="inline-icon mr-2 text-primary" size={24} /> Kalibrasi Parameter CV</h1>
      <p class="page-sub">Atur parameter deteksi kamera untuk sistem inspeksi otomatis</p>
    </div>
    
    <div class="header-actions">
      {#if lastUpdatedAt !== '-'}
        <div class="last-update">
          <span class="update-label">Terakhir diubah oleh</span>
          <strong>{lastUpdatedBy}</strong>
          <span class="update-time">{lastUpdatedAt}</span>
        </div>
      {/if}
      <button class="btn btn-primary btn-save" onclick={handleSave} disabled={saving}>
        {#if saving}
          <span class="spinner"></span> Menyimpan...
        {:else}
          <Save size={16} class="inline-icon mr-2" /> Simpan
        {/if}
      </button>
      {#if saved}
        <span class="saved-msg animate-fade-in"><Check size={16} class="inline-icon mr-2" /> Tersimpan!</span>
      {/if}
    </div>
  </div>

  {#if error}
    <div class="error-banner">{error}</div>
  {/if}

  {#if loading}
    <div class="loading-center"><span class="spinner-lg"></span><p>Memuat konfigurasi...</p></div>
  {:else}
    <div class="cal-dashboard-grid">
      
      <!-- COLUMN 1: DETEKSI & SKALA PARAMETERS -->
      <div class="cal-column">
        <div class="card flex-1">
          <h3 class="card-title"><Ruler class="inline-icon mr-2 text-primary" size={18} /> Skala & Toleransi</h3>
          
          <div class="form-group">
            <div class="label-row">
              <label class="label" for="ppm">Pixel per mm</label>
              <span class="info-tooltip-trigger">
                <Info size={14} />
                <span class="info-tooltip-content">Rumus: pixel benda / ukuran benda (mm) · Contoh: koin 27mm = 250px → 250/27 = 9.26</span>
              </span>
            </div>
            <input class="input mono" id="ppm" type="number" step="0.01" min="0.1" max="1000" bind:value={cfg.pixelPerMm} />
          </div>

          <div class="form-group">
            <div class="label-row">
              <label class="label" for="tol">Toleransi GOOD/NG (mm)</label>
              <span class="info-tooltip-trigger">
                <Info size={14} />
                <span class="info-tooltip-content">Selisih dimensi maksimum yang masih dianggap GOOD</span>
              </span>
            </div>
            <input class="input mono" id="tol" type="number" step="0.1" min="0" max="100" bind:value={cfg.toleranceMm} />
          </div>
        </div>

        <div class="card flex-1">
          <h3 class="card-title"><Eye class="inline-icon mr-2 text-primary" size={18} /> Deteksi Kontur</h3>
          
          <div class="form-group">
            <div class="label-row">
              <label class="label" for="thresh">Threshold Binarisasi Awal</label>
              <span class="info-tooltip-trigger">
                <Info size={14} />
                <span class="info-tooltip-content">Bisa diubah real-time saat inspeksi dengan tombol +/−</span>
              </span>
            </div>
            <div class="slider-row">
              <input class="range-input" id="thresh" type="range" min="10" max="250" step="5" bind:value={cfg.contourThresh} />
              <span class="range-val mono">{cfg.contourThresh}</span>
            </div>
          </div>

          <div class="form-row">
            <div class="form-group flex-1">
              <div class="label-row">
                <label class="label" for="area">Min Area (px²)</label>
                <span class="info-tooltip-trigger">
                  <Info size={14} />
                  <span class="info-tooltip-content">Kontur lebih kecil dari nilai ini diabaikan</span>
                </span>
              </div>
              <input class="input mono" id="area" type="number" step="100" min="100" bind:value={cfg.contourMinArea} />
            </div>

            <div class="form-group flex-1">
              <div class="label-row">
                <label class="label" for="minmm">Min Objek (mm)</label>
                <span class="info-tooltip-trigger">
                  <Info size={14} />
                  <span class="info-tooltip-content">Objek dengan dimensi di bawah nilai ini diabaikan</span>
                </span>
              </div>
              <input class="input mono" id="minmm" type="number" step="0.5" min="0.1" bind:value={cfg.minFeatureMm} />
            </div>
          </div>
        </div>
      </div>

      <!-- COLUMN 2: ROI CONTROLS & ALERTS -->
      <div class="cal-column">
        <div class="card flex-1">
          <h3 class="card-title"><Crop class="inline-icon mr-2 text-primary" size={18} /> Area Inspeksi (ROI)</h3>
          <div class="label-row mb-2">
            <span class="hint-text">Nilai 0.0–1.0 dari ukuran frame kamera</span>
            <span class="info-tooltip-trigger">
              <Info size={14} />
              <span class="info-tooltip-content">Menentukan batas crop area pemrosesan Computer Vision</span>
            </span>
          </div>

          <div class="roi-grid">
            <div class="form-group">
              <label class="label-sm" for="roi_x1">X Mulai</label>
              <input class="input mono compact" id="roi_x1" type="number" step="0.01" min="0" max="0.9" bind:value={roi.x1} />
            </div>
            <div class="form-group">
              <label class="label-sm" for="roi_y1">Y Mulai</label>
              <input class="input mono compact" id="roi_y1" type="number" step="0.01" min="0" max="0.9" bind:value={roi.y1} />
            </div>
            <div class="form-group">
              <label class="label-sm" for="roi_x2">X Selesai</label>
              <input class="input mono compact" id="roi_x2" type="number" step="0.01" min="0.1" max="1" bind:value={roi.x2} />
            </div>
            <div class="form-group">
              <label class="label-sm" for="roi_y2">Y Selesai</label>
              <input class="input mono compact" id="roi_y2" type="number" step="0.01" min="0.1" max="1" bind:value={roi.y2} />
            </div>
          </div>
        </div>

        <div class="card flex-1">
          <h3 class="card-title"><AlertTriangle class="inline-icon mr-2 text-warning" size={18} /> Sistem & Alert</h3>
          
          <div class="form-group">
            <div class="label-row">
              <label class="label" for="warn">Durasi Alert NG (detik)</label>
              <span class="info-tooltip-trigger">
                <Info size={14} />
                <span class="info-tooltip-content">Berapa lama overlay merah berkedip saat ada part NG</span>
              </span>
            </div>
            <div class="slider-row">
              <input class="range-input" id="warn" type="range" min="1" max="30" step="1" bind:value={cfg.warningDuration} />
              <span class="range-val mono">{cfg.warningDuration}s</span>
            </div>
          </div>
        </div>
      </div>

      <!-- COLUMN 3: ROI VISUAL PREVIEW & INFO -->
      <div class="cal-column">
        <div class="card flex-1 flex-col-preview">
          <h3 class="card-title"><Crop class="inline-icon mr-2 text-primary" size={18} /> Visual ROI Preview</h3>
          
          <div class="roi-preview">
            <div class="roi-frame">
              <div class="roi-box" style="
                left: {roi.x1 * 100}%;
                top: {roi.y1 * 100}%;
                width: {(roi.x2 - roi.x1) * 100}%;
                height: {(roi.y2 - roi.y1) * 100}%;
              "></div>
              <span class="roi-label">[ AREA INSPEKSI ]</span>
            </div>
          </div>

          <div class="info-box-compact">
            <p class="info-title-sm"><Info class="inline-icon mr-1 text-primary" size={14} /> Cara Kerja</p>
            <p class="info-desc">CV program mengambil konfigurasi ini saat startup melalui:</p>
            <code class="endpoint-compact">GET /api/engineer/calibration/public</code>
          </div>
        </div>
      </div>

    </div>
  {/if}
</div>

<style>
  .page { 
    max-width: 100%; 
    height: 100%; 
    padding: var(--sp-4) var(--sp-5); 
    display: flex; 
    flex-direction: column; 
    overflow: hidden; 
    box-sizing: border-box;
  }
  
  .page-header { 
    display: flex; 
    align-items: center; 
    justify-content: space-between; 
    padding-bottom: var(--sp-3);
    border-bottom: 1px solid var(--clr-border);
    margin-bottom: var(--sp-3);
    flex-shrink: 0;
  }

  .page-title { 
    font-family: var(--font-heading);
    font-size: var(--fs-xl); 
    font-weight: var(--fw-bold); 
    margin-bottom: var(--sp-1); 
    color: var(--clr-text);
  }

  .page-sub { 
    color: var(--clr-text-muted); 
    font-size: var(--fs-xs); 
  }

  .header-actions { 
    display: flex; 
    align-items: center; 
    gap: var(--sp-4); 
  }

  .last-update { 
    display: flex;
    flex-direction: column;
    text-align: right; 
    font-size: 10px; 
    color: var(--clr-text-dim); 
    padding: var(--sp-2) var(--sp-3);
    background: var(--clr-surface-2);
    border-radius: var(--radius-md);
    border: 1px solid var(--clr-border);
    line-height: 1.3;
  }

  .update-label { 
    font-weight: var(--fw-medium);
  }

  .update-time { 
    color: var(--clr-text-muted);
  }

  .btn-save {
    padding: var(--sp-2) var(--sp-4);
    font-size: var(--fs-sm);
  }

  .saved-msg { 
    color: var(--clr-ok); 
    font-weight: var(--fw-semibold); 
    font-size: var(--fs-sm);
  }

  .error-banner { 
    padding: var(--sp-2) var(--sp-3); 
    background: var(--clr-ng-bg); 
    color: var(--clr-ng); 
    border: 1px solid var(--clr-ng-border); 
    border-radius: var(--radius-md); 
    font-size: var(--fs-xs); 
    margin-bottom: var(--sp-3); 
    flex-shrink: 0;
  }

  .loading-center { 
    display: flex; 
    flex-direction: column; 
    align-items: center; 
    justify-content: center;
    flex: 1;
    color: var(--clr-text-muted); 
  }

  .spinner-lg { 
    width: 24px; 
    height: 24px; 
    border: 2px solid var(--clr-border); 
    border-top-color: var(--clr-accent); 
    border-radius: 50%; 
    animation: spin 0.6s linear infinite; 
  }

  .spinner { 
    display: inline-block; 
    width: 12px; 
    height: 12px; 
    border: 2px solid rgba(255,255,255,0.4); 
    border-top-color: #fff; 
    border-radius: 50%; 
    animation: spin 0.6s linear infinite; 
  }

  @keyframes spin { to { transform: rotate(360deg); } }

  /* DASHBOARD GRID - 3 COLUMNS FIT TO SCREEN */
  .cal-dashboard-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: var(--sp-4);
    flex: 1;
    min-height: 0; /* Critical for scroll prevention */
  }

  .cal-column {
    display: flex;
    flex-direction: column;
    gap: var(--sp-4);
    height: 100%;
    min-height: 0;
  }

  .card {
    background: var(--clr-surface);
    border: 1px solid var(--clr-border);
    border-radius: var(--radius-md);
    padding: var(--sp-4);
    display: flex;
    flex-direction: column;
    min-height: 0;
    box-shadow: 0 1px 3px rgba(0,0,0,0.02);
  }

  .flex-1 {
    flex: 1;
  }

  .card-title { 
    font-size: var(--fs-sm); 
    font-weight: var(--fw-semibold); 
    margin-bottom: var(--sp-3);
    padding-bottom: var(--sp-2);
    border-bottom: 1px solid var(--clr-border);
    color: var(--clr-text);
    flex-shrink: 0;
  }

  .form-group {
    margin-bottom: var(--sp-3);
    display: flex;
    flex-direction: column;
    flex-shrink: 0;
  }

  .form-group:last-child {
    margin-bottom: 0;
  }

  .form-row {
    display: flex;
    gap: var(--sp-3);
    flex-shrink: 0;
  }

  .label { 
    font-size: var(--fs-xs); 
    font-weight: var(--fw-medium);
    color: var(--clr-text-muted);
  }

  .label-sm {
    font-size: 10px;
    font-weight: var(--fw-medium);
    color: var(--clr-text-dim);
    margin-bottom: 4px;
  }

  .hint-text {
    font-size: 10px;
    color: var(--clr-text-dim);
  }

  .mono { 
    font-family: 'Courier New', monospace; 
  }

  .input {
    width: 100%;
    height: 34px;
    padding: 6px var(--sp-3);
    font-size: var(--fs-sm);
    border: 1px solid var(--clr-border);
    border-radius: var(--radius-sm);
    background: var(--clr-bg);
    color: var(--clr-text);
    box-sizing: border-box;
  }

  .input.compact {
    height: 30px;
    padding: 4px var(--sp-2);
    font-size: var(--fs-xs);
  }

  /* LABEL TOOLTIP STYLE */
  .label-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 4px;
  }

  .info-tooltip-trigger {
    position: relative;
    display: inline-flex;
    align-items: center;
    cursor: pointer;
    color: var(--clr-text-dim);
    transition: color 0.2s;
  }

  .info-tooltip-trigger:hover {
    color: var(--clr-accent);
  }

  .info-tooltip-content {
    visibility: hidden;
    position: absolute;
    bottom: 125%;
    right: 0;
    background-color: var(--clr-surface);
    color: var(--clr-text);
    text-align: left;
    padding: var(--sp-2) var(--sp-3);
    border-radius: var(--radius-sm);
    border: 1px solid var(--clr-border);
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    width: 240px;
    z-index: 100;
    font-size: 10px;
    line-height: 1.4;
    opacity: 0;
    transition: opacity 0.2s ease, visibility 0.2s;
    pointer-events: none;
    font-weight: normal;
  }

  .info-tooltip-trigger:hover .info-tooltip-content {
    visibility: visible;
    opacity: 1;
  }

  /* SLIDER STYLE */
  .slider-row { 
    display: flex; 
    align-items: center; 
    gap: var(--sp-3);
    padding: var(--sp-2) var(--sp-3);
    background: var(--clr-surface-2);
    border-radius: var(--radius-sm);
    height: 34px;
    box-sizing: border-box;
  }

  .range-input { 
    flex: 1; 
    accent-color: var(--clr-accent);
    height: 4px;
    cursor: pointer;
  }

  .range-val { 
    min-width: 40px; 
    font-size: var(--fs-sm); 
    font-weight: var(--fw-bold); 
    color: var(--clr-accent);
    text-align: right;
  }

  /* ROI GRID */
  .roi-grid { 
    display: grid; 
    grid-template-columns: repeat(2, 1fr); 
    gap: var(--sp-3); 
    margin-bottom: var(--sp-2);
  }

  /* ROI Preview Area */
  .flex-col-preview {
    justify-content: space-between;
  }

  .roi-preview { 
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--clr-surface-2);
    border-radius: var(--radius-sm);
    padding: var(--sp-2);
    margin-bottom: var(--sp-3);
    min-height: 0;
  }

  .roi-frame {
    position: relative;
    width: 100%;
    aspect-ratio: 16/9;
    max-height: 100%;
    background: linear-gradient(135deg, var(--clr-surface) 0%, var(--clr-surface-2) 100%);
    border: 1px solid var(--clr-border);
    border-radius: var(--radius-sm);
    overflow: hidden;
  }

  .roi-box {
    position: absolute;
    border: 2px solid var(--clr-accent);
    background: rgba(59, 130, 246, 0.15);
    transition: all 0.3s ease;
    box-shadow: 0 0 10px rgba(59, 130, 246, 0.2);
  }

  .roi-label {
    position: absolute;
    bottom: var(--sp-2);
    left: 50%;
    transform: translateX(-50%);
    font-size: 8px;
    font-weight: var(--fw-semibold);
    color: var(--clr-text-muted);
    background: var(--clr-surface);
    padding: 2px var(--sp-2);
    border-radius: 2px;
    border: 1px solid var(--clr-border);
  }

  /* Compact Info box */
  .info-box-compact {
    padding: var(--sp-3);
    background: var(--clr-surface-2);
    border: 1px solid var(--clr-border);
    border-left: 2px solid var(--clr-accent);
    border-radius: var(--radius-sm);
    font-size: 10px;
    color: var(--clr-text-muted);
    line-height: 1.5;
    flex-shrink: 0;
  }

  .info-title-sm { 
    font-weight: var(--fw-semibold); 
    margin-bottom: var(--sp-1); 
    font-size: 11px;
    color: var(--clr-text);
  }

  .info-desc {
    margin-bottom: 4px;
  }

  .endpoint-compact {
    display: block;
    padding: 4px var(--sp-2);
    background: var(--clr-surface);
    border-radius: var(--radius-sm);
    border: 1px solid var(--clr-border);
    font-family: 'Courier New', monospace;
    font-size: 9px;
    color: var(--clr-accent);
    font-weight: var(--fw-medium);
    word-break: break-all;
  }

  .inline-icon {
    display: inline-block;
    vertical-align: middle;
    margin-top: -2px;
  }
  .mr-2 { margin-right: 8px; }
  .mr-1 { margin-right: 4px; }
  .text-primary { color: var(--clr-accent); }
  .text-warning { color: var(--clr-warning); }

  /* For Medium Screens (Tablets / small laptops) */
  @media (max-width: 1200px) {
    .page {
      overflow-y: auto;
    }
    .cal-dashboard-grid {
      grid-template-columns: repeat(2, 1fr);
      height: auto;
    }
    .cal-column {
      height: auto;
      min-height: auto;
    }
    .card {
      flex: none !important;
      height: auto !important;
    }
    .roi-preview {
      flex: none;
    }
  }

  /* For Mobile Screens */
  @media (max-width: 768px) {
    .page-header {
      flex-direction: column;
      align-items: flex-start;
      gap: var(--sp-3);
    }
    .header-actions {
      width: 100%;
      justify-content: space-between;
    }
    .cal-dashboard-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
