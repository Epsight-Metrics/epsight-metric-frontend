<script>
  import { onMount } from 'svelte';
  import { getReferences, saveReference, deleteReference } from '$lib/api/reference.js';
  import { getCalibration } from '$lib/api/engineer.js';
  import { Database, Plus, Trash2, Check } from '@lucide/svelte';

  let loading = $state(true);
  let saving = $state(false);
  let error = $state('');
  let success = $state('');
  let references = $state([]);
  let cvConfig = $state(null);
  let showAddForm = $state(false);
  let useStream = $state(false);
  let referenceName = $state('');
  let imageFile = $state(null);

  async function loadReferences() {
    loading = true;
    try {
      const data = await getReferences();
      references = data.references || [];
      cvConfig = await getCalibration();
    } catch (err) {
      error = err.message;
    } finally {
      loading = false;
    }
  }

  onMount(() => loadReferences());

  function handleFileSelect(event) {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      imageFile = file;
      error = '';
    } else {
      error = 'Format gambar tidak valid';
      imageFile = null;
    }
  }

  async function handleSave() {
    if (!referenceName.trim()) {
      error = 'Nama reference harus diisi';
      return;
    }

    saving = true;
    error = '';

    try {
      // Simplified - manual input for now
      // TODO: Integrate with CV API for auto-measurement
      const ref = {
        name: referenceName.trim(),
        shape: 'circle',
        vertices: 0,
        diameterMm: 10.0,
        widthMm: 10.0,
        heightMm: 10.0,
        toleranceMm: cvConfig?.toleranceMm || 1.0
      };

      await saveReference(ref);
      
      showAddForm = false;
      referenceName = '';
      imageFile = null;
      
      success = 'Reference tersimpan!';
      setTimeout(() => success = '', 3000);
      
      await loadReferences();
    } catch (err) {
      error = err.message;
    } finally {
      saving = false;
    }
  }

  async function handleDelete(name) {
    if (!confirm(`Hapus reference "${name}"?`)) return;
    try {
      await deleteReference(name);
      await loadReferences();
    } catch (err) {
      error = err.message;
    }
  }
</script>

<svelte:head><title>Reference — EPSON QC</title></svelte:head>

<div class="page animate-fade-in">
  <div class="page-header">
    <h1 class="page-title"><Database class="inline-icon" size={24} /> Reference</h1>
    <button class="btn btn-primary" onclick={() => showAddForm = !showAddForm}>
      <Plus size={16} /> {showAddForm ? 'Batal' : 'Tambah'}
    </button>
  </div>

  {#if error}
    <div class="alert alert-error">{error}</div>
  {/if}

  {#if success}
    <div class="alert alert-success">{success}</div>
  {/if}

  {#if showAddForm}
    <div class="card add-form">
      <h3 class="card-title">Tambah Reference</h3>
      
      <div class="form-group">
        <label class="label">Nama Reference</label>
        <input class="input" type="text" placeholder="e.g., PT-001" bind:value={referenceName} disabled={saving} />
      </div>

      <div class="form-actions">
        <button class="btn btn-primary" onclick={handleSave} disabled={saving || !referenceName.trim()}>
          {#if saving}
            <span class="spinner"></span> Menyimpan...
          {:else}
            <Check size={16} /> Simpan
          {/if}
        </button>
        <button class="btn btn-secondary" onclick={() => { showAddForm = false; referenceName = ''; }} disabled={saving}>
          Batal
        </button>
      </div>
    </div>
  {/if}

  {#if loading}
    <div class="loading-center"><span class="spinner-lg"></span><p>Loading...</p></div>
  {:else if references.length === 0}
    <div class="empty-state">
      <Database size={48} />
      <h3>Belum ada reference</h3>
      <p>Tambahkan reference untuk inspeksi otomatis</p>
    </div>
  {:else}
    <div class="references-grid">
      {#each references as ref (ref.id)}
        <div class="ref-card">
          <div class="ref-header">
            <h4 class="ref-name">{ref.name}</h4>
            <button class="btn-icon" onclick={() => handleDelete(ref.name)}>
              <Trash2 size={16} />
            </button>
          </div>
          
          <div class="ref-details">
            <div class="ref-row">
              <span class="ref-label">Shape:</span>
              <span class="ref-value">{ref.shape}</span>
            </div>
            
            {#if ref.shape === 'circle'}
              <div class="ref-row">
                <span class="ref-label">Diameter:</span>
                <span class="ref-value">{ref.diameterMm.toFixed(2)} mm</span>
              </div>
            {:else}
              <div class="ref-row">
                <span class="ref-label">W × H:</span>
                <span class="ref-value">{ref.widthMm.toFixed(2)} × {ref.heightMm.toFixed(2)} mm</span>
              </div>
            {/if}
            
            <div class="ref-row">
              <span class="ref-label">Toleransi:</span>
              <span class="ref-value">±{ref.toleranceMm.toFixed(2)} mm</span>
            </div>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .page { padding: var(--sp-6); }
  .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--sp-6); padding-bottom: var(--sp-4); border-bottom: 1px solid var(--clr-border); }
  .page-title { font-size: var(--fs-2xl); font-weight: var(--fw-bold); }
  .inline-icon { display: inline-block; vertical-align: middle; margin-right: 8px; }
  .alert { padding: var(--sp-3); border-radius: var(--radius-md); margin-bottom: var(--sp-4); }
  .alert-error { background: var(--clr-ng-bg); color: var(--clr-ng); }
  .alert-success { background: var(--clr-ok-bg); color: var(--clr-ok); }
  .add-form { margin-bottom: var(--sp-6); }
  .card-title { font-size: var(--fs-lg); font-weight: var(--fw-semibold); margin-bottom: var(--sp-4); }
  .form-actions { display: flex; gap: var(--sp-3); margin-top: var(--sp-4); }
  .loading-center { display: flex; flex-direction: column; align-items: center; gap: var(--sp-4); padding: var(--sp-12); }
  .spinner-lg { width: 32px; height: 32px; border: 3px solid var(--clr-border); border-top-color: var(--clr-accent); border-radius: 50%; animation: spin 0.6s linear infinite; }
  .spinner { display: inline-block; width: 16px; height: 16px; border: 2px solid rgba(255,255,255,0.4); border-top-color: #fff; border-radius: 50%; animation: spin 0.6s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }
  .empty-state { text-align: center; padding: var(--sp-12); color: var(--clr-text-muted); }
  .references-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: var(--sp-4); }
  .ref-card { background: var(--clr-surface); border: 1px solid var(--clr-border); border-radius: var(--radius-md); padding: var(--sp-4); }
  .ref-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--sp-3); padding-bottom: var(--sp-3); border-bottom: 1px solid var(--clr-border); }
  .ref-name { font-size: var(--fs-md); font-weight: var(--fw-semibold); }
  .btn-icon { padding: var(--sp-2); border: none; background: transparent; cursor: pointer; border-radius: var(--radius-sm); }
  .btn-icon:hover { background: var(--clr-ng-bg); color: var(--clr-ng); }
  .ref-details { display: flex; flex-direction: column; gap: var(--sp-2); }
  .ref-row { display: flex; justify-content: space-between; font-size: var(--fs-sm); }
  .ref-label { color: var(--clr-text-muted); }
  .ref-value { color: var(--clr-text); font-weight: var(--fw-medium); }
  @media (max-width: 768px) { .references-grid { grid-template-columns: 1fr; } }
</style>
