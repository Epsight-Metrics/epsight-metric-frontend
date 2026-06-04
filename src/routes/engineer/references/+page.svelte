<script>
  import { onMount, onDestroy } from "svelte";
  import {
    getReferences,
    saveReference,
    deleteReference,
    clearAllReferences,
    saveReferenceFromImage,
    saveReferenceFromStream,
  } from "$lib/api/reference.js";
  import { getCalibration } from "$lib/api/engineer.js";
  import { connectSSE } from "$lib/api/notifications.js";
  import { isAuthenticated } from "$lib/stores/auth.js";
  import {
    Database,
    Plus,
    Trash2,
    Upload,
    AlertCircle,
    Check,
  } from "@lucide/svelte";

  let loading = $state(true);
  let saving = $state(false);
  let error = $state("");
  let success = $state("");
  let references = $state([]);
  let cvConfig = $state(null);
  let eventSource = null;

  let showAddForm = $state(false);
  let imageFile = $state(null);
  let referenceName = $state("");
  let uploadProgress = $state("");
  let useStream = $state(false); // Toggle between upload image or capture from stream

  async function loadReferences() {
    // Wait for auth to be ready
    if (!$isAuthenticated) {
      console.log("Waiting for authentication...");
      return;
    }

    loading = true;
    error = "";

    try {
      const data = await getReferences();
      references = data.references || [];
    } catch (err) {
      error = err.message;
    } finally {
      loading = false;
    }
  }

  async function loadCvConfig() {
    try {
      cvConfig = await getCalibration();
    } catch (err) {
      console.error("Failed to load CV config:", err);
    }
  }

  onMount(() => {
    loadReferences();
    loadCvConfig();

    eventSource = connectSSE(
      (eventType, data) => {
        if (eventType === "reference-update") {
          loadReferences();

          if (data.action === "created") {
            success = `Reference "${data.reference.name}" created`;
            setTimeout(() => (success = ""), 3000);
          }
        }
      },
      (err) => console.error("SSE error:", err),
    );
  });

  onDestroy(() => {
    if (eventSource) eventSource.close();
  });

  function handleFileSelect(event) {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith("image/")) {
      imageFile = file;
      error = "";
    } else {
      error = "Please select a valid image file";
      imageFile = null;
    }
  }

  async function handleSaveFromStream() {
    if (!referenceName.trim()) {
      error = "Please provide reference name";
      return;
    }

    if (!cvConfig) {
      error = "CV configuration not loaded";
      return;
    }

    saving = true;
    error = "";
    uploadProgress = "Capturing from stream...";

    try {
      const cvResult = await saveReferenceFromStream(
        referenceName.trim(),
        cvConfig,
      );

      if (!cvResult.success) {
        throw new Error(cvResult.error || "Failed to capture from stream");
      }

      uploadProgress = "Saving to database...";

      const ref = cvResult.reference;
      await saveReference({
        name: ref.name,
        shape: ref.shape,
        vertices: ref.vertices,
        diameterMm: ref.diameter_mm,
        widthMm: ref.width_mm,
        heightMm: ref.height_mm,
        toleranceMm: ref.tolerance_mm,
      });

      showAddForm = false;
      referenceName = "";
      uploadProgress = "";

      success = `Reference "${ref.name}" saved from stream!`;
      setTimeout(() => (success = ""), 3000);

      await loadReferences();
    } catch (err) {
      error = err.message;
      uploadProgress = "";
    } finally {
      saving = false;
    }
  }

  async function handleSaveFromImage() {
    if (!imageFile || !referenceName.trim()) {
      error = "Please provide both image and reference name";
      return;
    }

    if (!cvConfig) {
      error = "CV configuration not loaded";
      return;
    }

    saving = true;
    error = "";
    uploadProgress = "Processing image...";

    try {
      const cvResult = await saveReferenceFromImage(
        imageFile,
        referenceName.trim(),
        cvConfig,
      );

      if (!cvResult.success) {
        throw new Error(cvResult.error || "Failed to process image");
      }

      uploadProgress = "Saving to database...";

      const ref = cvResult.reference;
      await saveReference({
        name: ref.name,
        shape: ref.shape,
        vertices: ref.vertices,
        diameterMm: ref.diameter_mm,
        widthMm: ref.width_mm,
        heightMm: ref.height_mm,
        toleranceMm: ref.tolerance_mm,
      });

      showAddForm = false;
      imageFile = null;
      referenceName = "";
      uploadProgress = "";

      success = `Reference "${ref.name}" saved successfully!`;
      setTimeout(() => (success = ""), 3000);

      await loadReferences();
    } catch (err) {
      error = err.message;
      uploadProgress = "";
    } finally {
      saving = false;
    }
  }

  async function handleDelete(name) {
    if (!confirm(`Delete reference "${name}"?`)) return;

    try {
      await deleteReference(name);
      await loadReferences();
    } catch (err) {
      error = err.message;
    }
  }

  async function handleClearAll() {
    if (!confirm("Delete ALL references? This cannot be undone!")) return;

    try {
      await clearAllReferences();
      await loadReferences();
      success = "All references cleared";
      setTimeout(() => (success = ""), 3000);
    } catch (err) {
      error = err.message;
    }
  }
</script>

<svelte:head><title>Reference Management — EPSON QC</title></svelte:head>

<div class="page animate-fade-in">
  <div class="page-header">
    <div>
      <h1 class="page-title">
        <Database class="inline-icon mr-2 text-primary" size={24} /> Reference Management
      </h1>
      <p class="page-sub">
        Kelola profil referensi dimensi part untuk inspeksi otomatis
      </p>
    </div>
    <div class="header-actions">
      <button
        class="btn btn-primary"
        onclick={() => (showAddForm = !showAddForm)}
      >
        <Plus size={16} class="inline-icon mr-2" />
        {showAddForm ? "Cancel" : "Add Reference"}
      </button>
      {#if references.length > 0}
        <button class="btn btn-danger" onclick={handleClearAll}>
          <Trash2 size={16} class="inline-icon mr-2" />
          Clear All
        </button>
      {/if}
    </div>
  </div>

  {#if error}
    <div class="alert alert-error">
      <AlertCircle size={16} class="inline-icon mr-2" />
      {error}
    </div>
  {/if}

  {#if success}
    <div class="alert alert-success">
      <Check size={16} class="inline-icon mr-2" />
      {success}
    </div>
  {/if}

  {#if showAddForm}
    <div class="card add-form animate-fade-in">
      <h3 class="card-title">Add New Reference</h3>

      <div class="form-group">
        <label class="label" for="refName">Reference Name</label>
        <input
          class="input"
          id="refName"
          type="text"
          placeholder="e.g., Gear Kecil A"
          bind:value={referenceName}
          disabled={saving}
        />
      </div>

      <!-- Toggle between Upload and Stream -->
      <div class="source-toggle">
        <button
          class="toggle-btn"
          class:active={!useStream}
          onclick={() => {
            useStream = false;
            imageFile = null;
          }}
          disabled={saving}
        >
          <Upload size={16} /> Upload Image
        </button>
        <button
          class="toggle-btn"
          class:active={useStream}
          onclick={() => {
            useStream = true;
            imageFile = null;
          }}
          disabled={saving}
        >
          <Database size={16} /> Capture from Stream
        </button>
      </div>

      {#if !useStream}
        <div class="form-group">
          <label class="label" for="refImage">Upload Image</label>
          <div class="upload-area">
            <input
              type="file"
              id="refImage"
              accept="image/*"
              onchange={handleFileSelect}
              disabled={saving}
              class="file-input"
            />
            <div class="upload-label">
              <Upload size={32} class="upload-icon" />
              <p>
                {imageFile
                  ? imageFile.name
                  : "Click to select image or drag & drop"}
              </p>
              <p class="hint">Ensure only ONE object is visible in the frame</p>
            </div>
          </div>
        </div>
      {:else}
        <div class="stream-preview">
          <div class="stream-container">
            <img
              src="http://localhost:5000/video_feed"
              alt="CV Stream"
              class="stream-video"
              onerror={(e) => {
                e.target.style.display = "none";
                e.target.nextElementSibling.style.display = "flex";
              }}
              onload={(e) => {
                e.target.style.display = "block";
                e.target.nextElementSibling.style.display = "none";
              }}
            />
            <div class="stream-fallback" style="display: flex;">
              <p>CV Stream not available</p>
            </div>
          </div>
          <p class="hint">Position ONE object in the frame, then click Save</p>
        </div>
      {/if}

      {#if uploadProgress}
        <div class="progress-info">
          <span class="spinner"></span>
          {uploadProgress}
        </div>
      {/if}

      <div class="form-actions">
        <button
          class="btn btn-primary"
          onclick={useStream ? handleSaveFromStream : handleSaveFromImage}
          disabled={saving ||
            (!useStream && (!imageFile || !referenceName.trim())) ||
            (useStream && !referenceName.trim())}
        >
          {#if saving}
            <span class="spinner"></span> Saving...
          {:else}
            <Check size={16} class="inline-icon mr-2" /> Save Reference
          {/if}
        </button>
        <button
          class="btn btn-secondary"
          onclick={() => {
            showAddForm = false;
            imageFile = null;
            referenceName = "";
            useStream = false;
          }}
          disabled={saving}
        >
          Cancel
        </button>
      </div>
    </div>
  {/if}

  {#if loading}
    <div class="loading-center">
      <span class="spinner-lg"></span>
      <p>Loading references...</p>
    </div>
  {:else if references.length === 0}
    <div class="empty-state">
      <Database size={48} class="empty-icon" />
      <h3>No References Yet</h3>
      <p>Add your first reference profile to start automated inspection</p>
    </div>
  {:else}
    <div class="references-grid">
      {#each references as ref (ref.id)}
        <div class="ref-card animate-fade-in">
          <div class="ref-header">
            <h4 class="ref-name">{ref.name}</h4>
            <button
              class="btn-icon btn-danger"
              onclick={() => handleDelete(ref.name)}
            >
              <Trash2 size={16} />
            </button>
          </div>

          <div class="ref-details">
            <div class="ref-row">
              <span class="ref-label">Shape:</span>
              <span class="ref-value">{ref.shape}</span>
            </div>

            {#if ref.shape === "circle"}
              <div class="ref-row">
                <span class="ref-label">Diameter:</span>
                <span class="ref-value mono"
                  >{ref.diameterMm.toFixed(2)} mm</span
                >
              </div>
            {:else}
              <div class="ref-row">
                <span class="ref-label">Width:</span>
                <span class="ref-value mono">{ref.widthMm.toFixed(2)} mm</span>
              </div>
              <div class="ref-row">
                <span class="ref-label">Height:</span>
                <span class="ref-value mono">{ref.heightMm.toFixed(2)} mm</span>
              </div>
            {/if}

            <div class="ref-row">
              <span class="ref-label">Tolerance:</span>
              <span class="ref-value mono"
                >±{ref.toleranceMm.toFixed(2)} mm</span
              >
            </div>

            <div class="ref-row">
              <span class="ref-label">Vertices:</span>
              <span class="ref-value">{ref.vertices}</span>
            </div>

            <div class="ref-row">
              <span class="ref-label">Created:</span>
              <span class="ref-value"
                >{new Date(ref.createdAt).toLocaleString("id-ID")}</span
              >
            </div>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .page {
    max-width: 1400px;
    margin: 0 auto;
    padding: var(--sp-6);
  }
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
  }
  .header-actions {
    display: flex;
    gap: var(--sp-3);
  }
  .alert {
    padding: var(--sp-3) var(--sp-4);
    border-radius: var(--radius-md);
    margin-bottom: var(--sp-4);
    font-size: var(--fs-sm);
  }
  .alert-error {
    background: var(--clr-ng-bg);
    color: var(--clr-ng);
    border: 1px solid var(--clr-ng-border);
  }
  .alert-success {
    background: var(--clr-ok-bg);
    color: var(--clr-ok);
    border: 1px solid rgba(34, 197, 94, 0.2);
  }
  .add-form {
    margin-bottom: var(--sp-6);
  }
  .card-title {
    font-size: var(--fs-lg);
    font-weight: var(--fw-semibold);
    margin-bottom: var(--sp-5);
    padding-bottom: var(--sp-3);
    border-bottom: 1px solid var(--clr-border);
  }
  .upload-area {
    position: relative;
    border: 2px dashed var(--clr-border);
    border-radius: var(--radius-md);
    padding: var(--sp-6);
    text-align: center;
    background: var(--clr-surface-2);
    transition: all 0.3s ease;
  }
  .upload-area:hover {
    border-color: var(--clr-accent);
    background: var(--clr-surface);
  }
  .file-input {
    position: absolute;
    inset: 0;
    opacity: 0;
    cursor: pointer;
  }
  .upload-label {
    pointer-events: none;
  }
  .hint {
    font-size: var(--fs-xs);
    color: var(--clr-text-dim);
    margin-top: var(--sp-2);
  }
  .source-toggle {
    display: flex;
    gap: var(--sp-2);
    margin-bottom: var(--sp-4);
  }
  .toggle-btn {
    flex: 1;
    padding: var(--sp-3);
    font-size: var(--fs-sm);
    font-weight: var(--fw-medium);
    background: var(--clr-surface);
    border: 2px solid var(--clr-border);
    border-radius: var(--radius-md);
    cursor: pointer;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--sp-2);
  }
  .toggle-btn:hover {
    background: var(--clr-surface-2);
  }
  .toggle-btn.active {
    background: var(--clr-accent);
    color: white;
    border-color: var(--clr-accent);
  }
  .stream-preview {
    margin-bottom: var(--sp-4);
  }
  .stream-container {
    position: relative;
    width: 100%;
    height: 300px;
    border: 2px solid var(--clr-border);
    border-radius: var(--radius-md);
    overflow: hidden;
    background: var(--clr-surface-2);
  }
  .stream-video {
    width: 100%;
    height: 100%;
    object-fit: contain;
    display: none;
  }
  .stream-fallback {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--clr-text-dim);
    font-size: var(--fs-sm);
  }
  .progress-info {
    display: flex;
    align-items: center;
    gap: var(--sp-3);
    padding: var(--sp-3);
    background: var(--clr-surface-2);
    border-radius: var(--radius-md);
    margin-top: var(--sp-4);
    color: var(--clr-accent);
    font-weight: var(--fw-medium);
  }
  .form-actions {
    display: flex;
    gap: var(--sp-3);
    margin-top: var(--sp-5);
  }
  .loading-center {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--sp-4);
    padding: var(--sp-12);
    color: var(--clr-text-muted);
  }
  .spinner-lg {
    display: inline-block;
    width: 32px;
    height: 32px;
    border: 3px solid var(--clr-border);
    border-top-color: var(--clr-accent);
    border-radius: 50%;
    animation: spin 0.6s linear infinite;
  }
  .spinner {
    display: inline-block;
    width: 16px;
    height: 16px;
    border: 2px solid rgba(255, 255, 255, 0.4);
    border-top-color: #fff;
    border-radius: 50%;
    animation: spin 0.6s linear infinite;
  }
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
  .empty-state {
    text-align: center;
    padding: var(--sp-12);
    color: var(--clr-text-muted);
  }
  .references-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
    gap: var(--sp-4);
  }
  .ref-card {
    background: var(--clr-surface);
    border: 1px solid var(--clr-border);
    border-radius: var(--radius-md);
    padding: var(--sp-4);
    transition: all 0.3s ease;
  }
  .ref-card:hover {
    border-color: var(--clr-accent);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }
  .ref-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--sp-4);
    padding-bottom: var(--sp-3);
    border-bottom: 1px solid var(--clr-border);
  }
  .ref-name {
    font-size: var(--fs-md);
    font-weight: var(--fw-semibold);
    color: var(--clr-text);
  }
  .btn-icon {
    padding: var(--sp-2);
    border: none;
    background: transparent;
    cursor: pointer;
    border-radius: var(--radius-sm);
    transition: all 0.2s ease;
  }
  .btn-icon:hover {
    background: var(--clr-surface-2);
  }
  .btn-icon.btn-danger:hover {
    background: var(--clr-ng-bg);
    color: var(--clr-ng);
  }
  .ref-details {
    display: flex;
    flex-direction: column;
    gap: var(--sp-3);
  }
  .ref-row {
    display: flex;
    justify-content: space-between;
    font-size: var(--fs-sm);
  }
  .ref-label {
    color: var(--clr-text-muted);
    font-weight: var(--fw-medium);
  }
  .ref-value {
    color: var(--clr-text);
  }
  .mono {
    font-family: "Courier New", monospace;
    color: var(--clr-accent);
    font-weight: var(--fw-semibold);
  }
  @media (max-width: 768px) {
    .page {
      padding: var(--sp-4);
    }
    .page-header {
      flex-direction: column;
    }
    .header-actions {
      width: 100%;
    }
    .references-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
