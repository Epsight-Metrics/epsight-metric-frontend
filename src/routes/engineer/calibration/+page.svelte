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

  // ROI helper - bind ke input terpisah
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
    {#if lastUpdatedAt !== '-'}
      <div class="last-update">
        <span class="update-label">Terakhir diubah oleh</span>
        <strong>{lastUpdatedBy}</strong>
        <span class="update-time">{lastUpdatedAt}</span>
      </div>
    {/if}
  </div>

  {#if error}
    <div class="error-banner">{error}</div>
  {/if}

  {#if loading}
    <div class="loading-center"><span class="spinner-lg"></span><p>Memuat konfigurasi...</p></div>
  {:else}
    <div class="cal-grid">

      <!-- SKALA & TOLERANSI -->
      <div class="card">
        <h3 class="card-title"><Ruler class="inline-icon mr-2 text-primary" size={20} /> Skala & Toleransi</h3>
        <div class="form-group">
          <label class="label" for="ppm">Pixel per mm (kalibrasi skala)</label>
          <p class="hint">Rumus: pixel benda / ukuran benda (mm) · Contoh: koin 27mm = 250px → 250/27 = 9.26</p>
          <input class="input mono" id="ppm" type="number" step="0.01" min="0.1" max="1000" bind:value={cfg.pixelPerMm} />
        </div>
        <div class="form-group">
          <label class="label" for="tol">Toleransi GOOD/NG (mm)</label>
          <p class="hint">Selisih dimensi maksimum yang masih dianggap GOOD</p>
          <input class="input mono" id="tol" type="number" step="0.1" min="0" max="100" bind:value={cfg.toleranceMm} />
        </div>
      </div>

      <!-- DETEKSI KONTUR -->
      <div class="card">
        <h3 class="card-title"><Eye class="inline-icon mr-2 text-primary" size={20} /> Deteksi Kontur</h3>
        <div class="form-group">
          <label class="label" for="thresh">Threshold Binarisasi Awal (10–250)</label>
          <p class="hint">Bisa diubah real-time saat inspeksi dengan tombol +/−</p>
          <div class="slider-row">
            <input class="range-input" id="thresh" type="range" min="10" max="250" step="5" bind:value={cfg.contourThresh} />
            <span class="range-val mono">{cfg.contourThresh}</span>
          </div>
        </div>
        <div class="form-group">
          <label class="label" for="area">Area Kontur Minimum (px²)</label>
          <p class="hint">Kontur lebih kecil dari nilai ini diabaikan — naikkan jika banyak noise</p>
          <input class="input mono" id="area" type="number" step="100" min="100" bind:value={cfg.contourMinArea} />
        </div>
        <div class="form-group">
          <label class="label" for="minmm">Dimensi Minimum (mm)</label>
          <p class="hint">Objek dengan dimensi di bawah nilai ini diabaikan</p>
          <input class="input mono" id="minmm" type="number" step="0.5" min="0.1" bind:value={cfg.minFeatureMm} />
        </div>
      </div>

      <!-- ROI -->
      <div class="card">
        <h3 class="card-title"><Crop class="inline-icon mr-2 text-primary" size={20} /> Area Inspeksi (ROI)</h3>
        <p class="hint mb">Nilai 0.0–1.0 sebagai persentase dari ukuran frame kamera</p>
        <div class="roi-grid">
          <div class="form-group">
            <label class="label" for="roi_x1">X Mulai (kiri)</label>
            <input class="input mono" id="roi_x1" type="number" step="0.01" min="0" max="0.9" bind:value={roi.x1} />
          </div>
          <div class="form-group">
            <label class="label" for="roi_y1">Y Mulai (atas)</label>
            <input class="input mono" id="roi_y1" type="number" step="0.01" min="0" max="0.9" bind:value={roi.y1} />
          </div>
          <div class="form-group">
            <label class="label" for="roi_x2">X Selesai (kanan)</label>
            <input class="input mono" id="roi_x2" type="number" step="0.01" min="0.1" max="1" bind:value={roi.x2} />
          </div>
          <div class="form-group">
            <label class="label" for="roi_y2">Y Selesai (bawah)</label>
            <input class="input mono" id="roi_y2" type="number" step="0.01" min="0.1" max="1" bind:value={roi.y2} />
          </div>
        </div>
        <!-- Preview ROI visual -->
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
      </div>

      <!-- SISTEM -->
      <div class="card">
        <h3 class="card-title"><AlertTriangle class="inline-icon mr-2 text-warning" size={20} /> Sistem & Alert</h3>
        <div class="form-group">
          <label class="label" for="warn">Durasi Warning NG (detik)</label>
          <p class="hint">Berapa lama overlay merah berkedip saat ada part NG</p>
          <div class="slider-row">
            <input class="range-input" id="warn" type="range" min="1" max="30" step="1" bind:value={cfg.warningDuration} />
            <span class="range-val mono">{cfg.warningDuration}s</span>
          </div>
        </div>

        <!-- Info box - bagaimana CV menggunakan config ini -->
        <div class="info-box">
          <p class="info-title"><Info class="inline-icon mr-2 text-primary" size={16} /> Cara Kerja</p>
          <p>CV program mengambil konfigurasi ini dari server saat startup melalui endpoint publik:</p>
          <code class="endpoint">GET /api/engineer/calibration/public</code>
          <p>Perubahan akan aktif saat CV di-restart berikutnya.</p>
        </div>
      </div>
    </div>

    <div class="save-bar">
      <button class="btn btn-primary btn-lg" onclick={handleSave} disabled={saving}>
        {#if saving}
          <span class="spinner"></span> Menyimpan...
        {:else}
          <Save size={16} class="inline-icon mr-2" /> Simpan Kalibrasi
        {/if}
      </button>
      {#if saved}
        <span class="saved-msg animate-fade-in"><Check size={16} class="inline-icon mr-2" /> Kalibrasi berhasil disimpan!</span>
      {/if}
    </div>
  {/if}
</div>

<style>
  .page { max-width: 1400px; margin: 0 auto; padding: var(--sp-6); }
  .page-header { 
    display: flex; 
    align-items: flex-start; 
    justify-content: space-between; 
    margin-bottom: var(--sp-6); 
    padding-bottom: var(--sp-4);
    border-bottom: 1px solid var(--clr-border);
    flex-wrap: wrap; 
    gap: var(--sp-4); 
  }
  .page-title { 
    font-family: var(--font-heading);
    font-size: var(--fs-2xl); 
    font-weight: var(--fw-bold); 
    margin-bottom: var(--sp-2); 
    color: var(--clr-text);
  }
  .page-sub { 
    color: var(--clr-text-muted); 
    font-size: var(--fs-sm); 
    line-height: 1.5;
  }
  .last-update { 
    text-align: right; 
    font-size: var(--fs-xs); 
    color: var(--clr-text-dim); 
    line-height: 1.8;
    padding: var(--sp-3);
    background: var(--clr-surface);
    border-radius: var(--radius-md);
    border: 1px solid var(--clr-border);
  }
  .update-label { 
    display: block; 
    font-weight: var(--fw-medium);
    margin-bottom: var(--sp-1);
  }
  .update-time { 
    display: block; 
    color: var(--clr-text-muted);
  }

  .loading-center { display: flex; flex-direction: column; align-items: center; gap: var(--sp-4); padding: var(--sp-12); color: var(--clr-text-muted); }
  .spinner-lg { display: inline-block; width: 32px; height: 32px; border: 3px solid var(--clr-border); border-top-color: var(--clr-accent); border-radius: 50%; animation: spin 0.6s linear infinite; }
  .spinner { display: inline-block; width: 16px; height: 16px; border: 2px solid rgba(255,255,255,0.4); border-top-color: #fff; border-radius: 50%; animation: spin 0.6s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }

  .error-banner { padding: var(--sp-3) var(--sp-4); background: var(--clr-ng-bg); color: var(--clr-ng); border: 1px solid var(--clr-ng-border); border-radius: var(--radius-md); font-size: var(--fs-sm); margin-bottom: var(--sp-4); }

  .cal-grid { 
    display: grid; 
    grid-template-columns: repeat(2, 1fr); 
    gap: var(--sp-5); 
    margin-bottom: var(--sp-6); 
  }

  .card-title { 
    font-size: var(--fs-lg); 
    font-weight: var(--fw-semibold); 
    margin-bottom: var(--sp-5);
    padding-bottom: var(--sp-3);
    border-bottom: 1px solid var(--clr-border);
    color: var(--clr-text);
  }
  .hint { 
    font-size: var(--fs-xs); 
    color: var(--clr-text-dim); 
    margin-bottom: var(--sp-3); 
    line-height: 1.6;
    padding: var(--sp-2) var(--sp-3);
    background: var(--clr-surface-2);
    border-radius: var(--radius-sm);
    border-left: 2px solid var(--clr-accent);
  }
  .hint.mb { margin-bottom: var(--sp-4); }

  .mono { font-family: 'Courier New', monospace; }

  .slider-row { 
    display: flex; 
    align-items: center; 
    gap: var(--sp-4);
    padding: var(--sp-3);
    background: var(--clr-surface-2);
    border-radius: var(--radius-md);
  }
  .range-input { 
    flex: 1; 
    accent-color: var(--clr-accent);
    height: 6px;
    cursor: pointer;
  }
  .range-val { 
    min-width: 60px; 
    font-family: 'Courier New', monospace; 
    font-size: var(--fs-xl); 
    font-weight: var(--fw-bold); 
    color: var(--clr-accent);
    text-align: right;
  }

  .roi-grid { 
    display: grid; 
    grid-template-columns: repeat(2, 1fr); 
    gap: var(--sp-4); 
    margin-bottom: var(--sp-5); 
  }

  /* ROI Preview */
  .roi-preview { 
    margin-top: var(--sp-4);
    padding: var(--sp-4);
    background: var(--clr-surface-2);
    border-radius: var(--radius-md);
  }
  .roi-frame {
    position: relative;
    width: 100%;
    aspect-ratio: 16/9;
    background: linear-gradient(135deg, var(--clr-surface) 0%, var(--clr-surface-2) 100%);
    border: 2px solid var(--clr-border);
    border-radius: var(--radius-md);
    overflow: hidden;
    box-shadow: inset 0 2px 8px rgba(0,0,0,0.05);
  }
  .roi-box {
    position: absolute;
    border: 3px solid var(--clr-accent);
    background: rgba(59, 130, 246, 0.15);
    transition: all 0.3s ease;
    box-shadow: 0 0 20px rgba(59, 130, 246, 0.3);
  }
  .roi-label {
    position: absolute;
    bottom: var(--sp-3);
    left: 50%;
    transform: translateX(-50%);
    font-size: var(--fs-xs);
    font-weight: var(--fw-semibold);
    color: var(--clr-text-muted);
    background: var(--clr-surface);
    padding: var(--sp-1) var(--sp-3);
    border-radius: var(--radius-sm);
    border: 1px solid var(--clr-border);
  }

  /* Info box */
  .info-box {
    margin-top: var(--sp-5);
    padding: var(--sp-5);
    background: var(--clr-surface-2);
    border: 1px solid var(--clr-border);
    border-left: 3px solid var(--clr-accent);
    border-radius: var(--radius-md);
    font-size: var(--fs-sm);
    color: var(--clr-text-muted);
    line-height: 1.8;
  }
  .info-title { 
    font-weight: var(--fw-semibold); 
    margin-bottom: var(--sp-3); 
    font-size: var(--fs-md);
    color: var(--clr-text);
  }
  .endpoint {
    display: block;
    margin: var(--sp-3) 0;
    padding: var(--sp-3) var(--sp-4);
    background: var(--clr-surface);
    border-radius: var(--radius-md);
    border: 1px solid var(--clr-border);
    font-family: 'Courier New', monospace;
    font-size: var(--fs-sm);
    color: var(--clr-accent);
    font-weight: var(--fw-medium);
  }

  .save-bar { 
    display: flex; 
    align-items: center; 
    gap: var(--sp-4); 
    padding: var(--sp-5) 0;
    border-top: 1px solid var(--clr-border);
    margin-top: var(--sp-6);
  }
  .saved-msg { 
    color: var(--clr-ok); 
    font-weight: var(--fw-semibold); 
    font-size: var(--fs-md);
    padding: var(--sp-3) var(--sp-4);
    background: var(--clr-ok-bg);
    border-radius: var(--radius-md);
    border: 1px solid rgba(34, 197, 94, 0.2);
  }

  .inline-icon {
    display: inline-block;
    vertical-align: middle;
    margin-top: -2px;
  }
  .mr-2 {
    margin-right: 8px;
  }
  .text-primary {
    color: var(--clr-accent);
  }
  .text-warning {
    color: var(--clr-warning);
  }

  @media (max-width: 1024px) {
    .cal-grid { grid-template-columns: 1fr; }
  }
  
  @media (max-width: 768px) {
    .page { padding: var(--sp-4); }
    .roi-grid { grid-template-columns: 1fr; }
    .page-header { flex-direction: column; }
    .last-update { text-align: left; }
  }
</style>