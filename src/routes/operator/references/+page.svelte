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
    Circle,
    Hexagon,
    Calendar,
    Clock,
    X,
    Camera,
    Smartphone,
    Scan,
  } from "@lucide/svelte";

  let loading = $state(true);
  let saving = $state(false);
  let error = $state("");
  let success = $state("");
  let references = $state([]);
  let cvConfig = $state(null);
  let eventSource = null;

  let showAddForm = $state(false); // Default hidden, shown as modal on click
  let imageFile = $state(null);
  let referenceName = $state("");
  let uploadProgress = $state("");
  let useStream = $state(false);
  let useManualInput = $state(false);

  // Manual input fields
  let manualShape = $state("rectangle");
  let manualWidth = $state("13.29");
  let manualHeight = $state("6.29");
  let manualTolerance = $state("1.00");
  let manualVertices = $state("4");
  const CV_STREAM_URL = import.meta.env.VITE_CV_STREAM_URL || "http://localhost:5000/video_feed";

  // Modal camera state variables
  let videoElementModal = $state(null);
  let imgElementModal = $state(null);
  let streamModal = $state(null);
  let capturedImageModal = $state(null);
  let availableCamerasModal = $state([]);
  let selectedCameraModal = $state("");
  let useIpCameraModal = $state(false);
  let ipCameraUrlModal = $state("http://192.168.1.100:8080/video");

  // Auto-attach stream when videoElementModal is recreated
  $effect(() => {
    if (videoElementModal && streamModal && videoElementModal.srcObject !== streamModal) {
      videoElementModal.srcObject = streamModal;
      videoElementModal
        .play()
        .catch((err) => console.error("Auto-play error in modal:", err));
    }
  });

  // Reactive camera control based on modal visibility and source
  $effect(() => {
    if (showAddForm && useStream && !useIpCameraModal) {
      loadCamerasModal();
    } else {
      stopCameraModal();
    }
  });

  async function loadReferences() {
    // Wait for auth to be ready
    if (!$isAuthenticated) {
      console.log('Waiting for authentication...');
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

  // Camera Helper Functions for Modal
  async function loadCamerasModal() {
    try {
      await navigator.mediaDevices.getUserMedia({ video: true });

      const devices = await navigator.mediaDevices.enumerateDevices();
      availableCamerasModal = devices.filter(
        (device) => device.kind === "videoinput",
      );
      if (availableCamerasModal.length > 0) {
        if (!selectedCameraModal) {
          selectedCameraModal = availableCamerasModal[availableCamerasModal.length - 1].deviceId;
        }
        await startCameraModal();
      }
    } catch (err) {
      error = "Gagal load daftar kamera: " + err.message;
    }
  }

  async function startCameraModal() {
    try {
      if (streamModal) {
        streamModal.getTracks().forEach((track) => track.stop());
        streamModal = null;
      }

      await new Promise((resolve) => setTimeout(resolve, 100));

      const constraints = {
        video: {
          deviceId: selectedCameraModal ? { exact: selectedCameraModal } : undefined,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      };

      streamModal = await navigator.mediaDevices.getUserMedia(constraints);

      if (videoElementModal) {
        videoElementModal.srcObject = streamModal;
        videoElementModal.onloadedmetadata = () => {
          videoElementModal.play().catch((err) => {
            console.error("Error playing video:", err);
            error = "Gagal memutar video: " + err.message;
          });
        };
      }
    } catch (err) {
      error = "Gagal akses kamera: " + err.message;
    }
  }

  function stopCameraModal() {
    if (streamModal) {
      streamModal.getTracks().forEach((track) => track.stop());
      streamModal = null;
    }
    capturedImageModal = null;
  }

  async function capturePhotoModal() {
    const sourceElement = useIpCameraModal ? imgElementModal : videoElementModal;
    if (!sourceElement) return;

    const canvas = document.createElement("canvas");
    canvas.width = 1280;
    canvas.height = 720;
    const ctx = canvas.getContext("2d");

    const width = sourceElement.videoWidth || sourceElement.naturalWidth || canvas.width;
    const height = sourceElement.videoHeight || sourceElement.naturalHeight || canvas.height;

    ctx.drawImage(sourceElement, 0, 0, width, height, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.85),
    );

    capturedImageModal = URL.createObjectURL(blob);
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

    if (!capturedImageModal) {
      error = "Silakan ambil foto objek terlebih dahulu";
      return;
    }

    saving = true;
    error = "";
    uploadProgress = "Mengirim gambar ke CV program...";

    try {
      const responseBlob = await fetch(capturedImageModal);
      const imageBlob = await responseBlob.blob();

      const cvResult = await saveReferenceFromImage(
        imageBlob,
        referenceName.trim(),
        cvConfig,
      );

      if (!cvResult.success) {
        throw new Error(cvResult.error || "Failed to process image");
      }

      uploadProgress = "Menyimpan ke database...";

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

      referenceName = "";
      capturedImageModal = null;
      uploadProgress = "";
      showAddForm = false;

      success = `Reference "${ref.name}" saved!`;
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
      error = "Please provide both image and name";
      return;
    }

    if (!cvConfig) {
      error = "CV configuration not loaded";
      return;
    }

    saving = true;
    error = "";
    uploadProgress = "Processing...";

    try {
      const cvResult = await saveReferenceFromImage(
        imageFile,
        referenceName.trim(),
        cvConfig,
      );

      if (!cvResult.success) {
        throw new Error(cvResult.error || "Failed to process image");
      }

      uploadProgress = "Saving...";

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

      imageFile = null;
      referenceName = "";
      uploadProgress = "";
      showAddForm = false;

      success = `Reference "${ref.name}" saved!`;
      setTimeout(() => (success = ""), 3000);

      await loadReferences();
    } catch (err) {
      error = err.message;
      uploadProgress = "";
    } finally {
      saving = false;
    }
  }

  async function handleSaveManual() {
    if (!referenceName.trim()) {
      error = "Please provide reference name";
      return;
    }

    const width = parseFloat(manualWidth);
    const height = parseFloat(manualHeight);
    const tolerance = parseFloat(manualTolerance);
    const vertices = parseInt(manualVertices);

    if (isNaN(width) || isNaN(height) || isNaN(tolerance) || isNaN(vertices)) {
      error = "Please provide valid numeric values";
      return;
    }

    saving = true;
    error = "";
    uploadProgress = "Saving...";

    try {
      await saveReference({
        name: referenceName.trim(),
        shape: manualShape,
        vertices: vertices,
        diameterMm: manualShape === "circle" ? width : null,
        widthMm: manualShape !== "circle" ? width : null,
        heightMm: manualShape !== "circle" ? height : null,
        toleranceMm: tolerance,
      });

      referenceName = "";
      manualWidth = "13.29";
      manualHeight = "6.29";
      manualTolerance = "1.00";
      manualVertices = "4";
      uploadProgress = "";
      showAddForm = false;

      success = `Reference "${referenceName.trim()}" saved!`;
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

<svelte:head><title>Reference Management â€” EPSON QC</title></svelte:head>

<div class="page animate-fade-in">
  <!-- PAGE HEADER -->
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
        class="btn btn-primary btn-action"
        onclick={() => {
          showAddForm = true;
          imageFile = null;
          referenceName = "";
          useStream = false;
          error = "";
        }}
      >
        <Plus size={16} class="inline-icon mr-2" />
        Tambah Referensi
      </button>
      {#if references.length > 0}
        <button class="btn btn-danger btn-action" onclick={handleClearAll}>
          <Trash2 size={16} class="inline-icon mr-2" />
          Hapus Semua
        </button>
      {/if}
    </div>
  </div>

  <!-- ALERTS -->
  {#if error}
    <div class="alert alert-error">
      <AlertCircle size={14} class="inline-icon mr-2" />
      {error}
    </div>
  {/if}

  {#if success}
    <div class="alert alert-success">
      <Check size={14} class="inline-icon mr-2" />
      {success}
    </div>
  {/if}

  <!-- MAIN LIST VIEW (FULL WIDTH) -->
  <div class="ref-dashboard-layout">
    {#if loading}
      <div class="loading-center">
        <span class="spinner-lg"></span>
        <p>Loading references...</p>
      </div>
    {:else if references.length === 0}
      <div class="empty-state">
        <Database size={48} class="empty-icon" />
        <h3>Belum ada referensi</h3>
        <p>
          Tambahkan referensi part pertama Anda untuk memulai inspeksi otomatis
        </p>
        <button
          class="btn btn-primary mt-4"
          onclick={() => {
            showAddForm = true;
            imageFile = null;
            referenceName = "";
            useStream = false;
            error = "";
          }}
        >
          <Plus size={16} class="inline-icon mr-2" /> Tambah Sekarang
        </button>
      </div>
    {:else}
      <div class="references-list-wrapper">
        <div class="references-grid">
          {#each references as ref (ref.id)}
            <div
              class="ref-card animate-fade-in"
              class:circle-card={ref.shape === "circle"}
              class:polygon-card={ref.shape !== "circle"}
            >
              <div class="ref-header">
                <div class="ref-title-group">
                  {#if ref.shape === "circle"}
                    <Circle size={16} class="text-primary mr-2" />
                  {:else}
                    <Hexagon size={16} class="text-purple mr-2" />
                  {/if}
                  <h4 class="ref-name">{ref.name}</h4>
                </div>
                <button
                  class="btn-icon btn-danger-compact"
                  onclick={() => handleDelete(ref.name)}
                >
                  <Trash2 size={14} />
                </button>
              </div>

              <div class="ref-details">
                <div class="ref-row">
                  <span class="ref-label">Shape:</span>
                  <span
                    class="ref-value badge-shape"
                    class:circle-badge={ref.shape === "circle"}
                    >{ref.shape}</span
                  >
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
                    <span class="ref-value mono"
                      >{ref.widthMm.toFixed(2)} mm</span
                    >
                  </div>
                  <div class="ref-row">
                    <span class="ref-label">Height:</span>
                    <span class="ref-value mono"
                      >{ref.heightMm.toFixed(2)} mm</span
                    >
                  </div>
                {/if}

                <div class="ref-row">
                  <span class="ref-label">Tolerance:</span>
                  <span class="ref-value mono-tol"
                    >Â±{ref.toleranceMm.toFixed(2)} mm</span
                  >
                </div>

                <div class="ref-row">
                  <span class="ref-label">Vertices:</span>
                  <span class="ref-value">{ref.vertices}</span>
                </div>

                <div class="ref-row border-top-line">
                  <div class="time-container">
                    <Calendar size={12} class="mr-1 text-dim" />
                    <span class="time-val"
                      >{new Date(ref.createdAt).toLocaleDateString(
                        "id-ID",
                      )}</span
                    >
                    <span class="divider-dot">â€¢</span>
                    <Clock size={12} class="mr-1 text-dim" />
                    <span class="time-val"
                      >{new Date(ref.createdAt).toLocaleTimeString("id-ID", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}</span
                    >
                  </div>
                </div>
              </div>
            </div>
          {/each}
        </div>
      </div>
    {/if}
  </div>
</div>

<!-- ADD NEW REFERENCE MODAL (SHOWN ON TOP OF THE PAGE) -->
{#if showAddForm}
  <div
    class="modal-overlay animate-fade-in"
    onclick={() => (showAddForm = false)}
    onkeydown={(e) => e.key === 'Escape' && (showAddForm = false)}
    role="button"
    tabindex="0"
  >
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
      class="modal-card animate-scale-in"
      onclick={(e) => e.stopPropagation()}
    >
      <div class="modal-header-bar">
        <h3 class="modal-title-text">
          <Database class="inline-icon mr-2 text-primary" size={20} /> Add New Reference
        </h3>
        <button class="modal-close" onclick={() => (showAddForm = false)}>
          <X size={20} />
        </button>
      </div>

      <div class="modal-body-content">
        {#if error}
          <div class="alert alert-error mb-3">
            <AlertCircle size={14} class="inline-icon mr-2" />
            {error}
          </div>
        {/if}

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

        <!-- Toggle between Upload, Stream, and Manual Input -->
        <div class="source-toggle">
          <button
            class="toggle-btn"
            class:active={!useStream && !useManualInput}
            onclick={() => {
              useStream = false;
              useManualInput = false;
              imageFile = null;
            }}
            disabled={saving}
          >
            <Upload size={14} class="mr-2" /> Upload Image
          </button>
          <button
            class="toggle-btn"
            class:active={useStream && !useManualInput}
            onclick={() => {
              useStream = true;
              useManualInput = false;
              imageFile = null;
            }}
            disabled={saving}
          >
            <Camera size={14} class="mr-2" /> Ambil dari Kamera
          </button>
          <button
            class="toggle-btn"
            class:active={useManualInput}
            onclick={() => {
              useManualInput = true;
              useStream = false;
              imageFile = null;
              capturedImageModal = null;
            }}
            disabled={saving}
          >
            <Plus size={14} class="mr-2" /> Input Manual
          </button>
        </div>

        {#if useManualInput}
          <!-- Manual Input Form -->
          <div class="manual-form">
            <div class="form-group">
              <label class="label" for="manualShape">Shape</label>
              <select
                class="input"
                id="manualShape"
                bind:value={manualShape}
                disabled={saving}
              >
                <option value="rectangle">Rectangle</option>
                <option value="circle">Circle</option>
                <option value="polygon">Polygon</option>
              </select>
            </div>

            {#if manualShape === "rectangle" || manualShape === "polygon"}
              <div class="form-row">
                <div class="form-group">
                  <label class="label" for="manualWidth">Width (mm)</label>
                  <input
                    class="input"
                    id="manualWidth"
                    type="number"
                    step="0.01"
                    placeholder="13.29"
                    bind:value={manualWidth}
                    disabled={saving}
                  />
                </div>
                <div class="form-group">
                  <label class="label" for="manualHeight">Height (mm)</label>
                  <input
                    class="input"
                    id="manualHeight"
                    type="number"
                    step="0.01"
                    placeholder="6.29"
                    bind:value={manualHeight}
                    disabled={saving}
                  />
                </div>
              </div>
            {/if}

            <div class="form-row">
              <div class="form-group">
                <label class="label" for="manualTolerance">Tolerance (±mm)</label>
                <input
                  class="input"
                  id="manualTolerance"
                  type="number"
                  step="0.01"
                  placeholder="1.00"
                  bind:value={manualTolerance}
                  disabled={saving}
                />
              </div>
              <div class="form-group">
                <label class="label" for="manualVertices">Vertices</label>
                <input
                  class="input"
                  id="manualVertices"
                  type="number"
                  placeholder="4"
                  bind:value={manualVertices}
                  disabled={saving}
                />
              </div>
            </div>
          </div>
        {:else if !useStream}
          <div class="form-group">
            <label class="label" for="refImage">Select Image</label>
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
                <p class="filename-text">
                  {imageFile ? imageFile.name : "Select file or drag & drop"}
                </p>
                <p class="hint">
                  Ensure only ONE object is visible in the frame
                </p>
              </div>
            </div>
          </div>
        {:else}
          {#if !capturedImageModal}
            <!-- Live Camera Feed Selection (Webcam vs IP Camera) -->
            <div class="mode-toggle" style="margin-bottom: var(--sp-3);">
              <button
                class="mode-btn"
                class:active={useIpCameraModal === false}
                onclick={() => useIpCameraModal = false}
                type="button"
              >
                <Camera size={14} /> Webcam
              </button>
              <button
                class="mode-btn"
                class:active={useIpCameraModal === true}
                onclick={() => useIpCameraModal = true}
                type="button"
              >
                <Smartphone size={14} /> IP Camera
              </button>
            </div>

            {#if useIpCameraModal}
              <!-- IP Camera Feed Preview -->
              <div class="camera-feed" style="position: relative; width: 100%; height: 240px; border: 1px solid var(--clr-border); border-radius: var(--radius-md); overflow: hidden; background: var(--clr-surface-2); margin-bottom: var(--sp-3);">
                <img
                  bind:this={imgElementModal}
                  src={ipCameraUrlModal}
                  alt="IP Camera Modal"
                  style="width: 100%; height: 100%; object-fit: contain; display: block;"
                  onerror={(e) => {
                    e.target.style.display = "none";
                    e.target.nextElementSibling.style.display = "flex";
                  }}
                  onload={(e) => {
                    e.target.style.display = "block";
                    e.target.nextElementSibling.style.display = "none";
                  }}
                />
                <div class="stream-fallback" style="position: absolute; inset: 0; display: none; align-items: center; justify-content: center; color: var(--clr-text-dim); font-size: var(--fs-xs); flex-direction: column; gap: var(--sp-2);">
                  <AlertCircle size={24} />
                  <p>IP Camera tidak terhubung</p>
                </div>
              </div>
              <div class="form-group" style="margin-bottom: var(--sp-3);">
                <input
                  type="text"
                  class="input"
                  bind:value={ipCameraUrlModal}
                  placeholder="URL IP Camera (contoh: http://192.168.1.100:8080/video)"
                  title="URL IP Camera"
                />
              </div>
            {:else}
              <!-- Local Webcam Feed Preview -->
              <div class="camera-feed" style="position: relative; width: 100%; height: 240px; border: 1px solid var(--clr-border); border-radius: var(--radius-md); overflow: hidden; background: var(--clr-surface-2); margin-bottom: var(--sp-3);">
                <video
                  bind:this={videoElementModal}
                  autoplay
                  playsinline
                  muted
                  style="width: 100%; height: 100%; object-fit: contain; display: block;"
                ></video>
              </div>
              {#if availableCamerasModal.length > 0}
                <div class="form-group" style="margin-bottom: var(--sp-3);">
                  <select
                    class="select"
                    bind:value={selectedCameraModal}
                    onchange={async () => await startCameraModal()}
                    title="Pilih Kamera"
                    style="height: 38px; width: 100%; padding: 6px 12px; font-size: 14px; border: 1px solid var(--clr-border); border-radius: var(--radius-sm);"
                  >
                    {#each availableCamerasModal as camera}
                      <option value={camera.deviceId}>
                        {camera.label || `Camera ${availableCamerasModal.indexOf(camera) + 1}`}
                      </option>
                    {/each}
                  </select>
                </div>
              {/if}
            {/if}

            <button
              class="inspect-btn"
              style="width: 100%; margin-bottom: var(--sp-3); margin-top: auto; height: 50px; font-size: 1.1rem; display: flex; align-items: center; justify-content: center; gap: 8px; border-radius: var(--radius-md);"
              onclick={capturePhotoModal}
              type="button"
              disabled={saving}
            >
              <Scan size={20} /> Ambil Foto Objek
            </button>
          {:else}
            <!-- Preview Captured Image -->
            <div class="camera-feed" style="position: relative; width: 100%; height: 240px; border: 1px solid var(--clr-border); border-radius: var(--radius-md); overflow: hidden; background: var(--clr-surface-2); margin-bottom: var(--sp-3);">
              <img
                src={capturedImageModal}
                alt="Preview"
                style="width: 100%; height: 100%; object-fit: contain; display: block;"
              />
            </div>
            <button
              class="btn btn-secondary"
              style="width: 100%; margin-bottom: var(--sp-3); height: 50px; font-size: 1.1rem; display: flex; align-items: center; justify-content: center; gap: 8px;"
              onclick={() => (capturedImageModal = null)}
              type="button"
              disabled={saving}
            >
              Ulangi Foto
            </button>
          {/if}
        {/if}

        {#if uploadProgress}
          <div class="progress-info">
            <span class="spinner"></span>
            {uploadProgress}
          </div>
        {/if}
      </div>

      <div class="modal-footer-bar">
        <button
          class="btn btn-primary flex-1 btn-save"
          onclick={useManualInput ? handleSaveManual : (useStream ? handleSaveFromStream : handleSaveFromImage)}
          disabled={saving ||
            (!useManualInput && !useStream && (!imageFile || !referenceName.trim())) ||
            (!useManualInput && useStream && (!referenceName.trim() || !capturedImageModal)) ||
            (useManualInput && !referenceName.trim())}
        >
          {#if saving}
            <span class="spinner"></span> Saving...
          {:else}
            <Check size={16} class="inline-icon mr-2" /> Save Reference
          {/if}
        </button>
        <button
          class="btn btn-secondary btn-cancel"
          onclick={() => (showAddForm = false)}
          disabled={saving}
        >
          Cancel
        </button>
      </div>
    </div>
  </div>
{/if}

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
    margin-bottom: var(--sp-4);
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
    gap: var(--sp-3);
  }

  .btn-action {
    padding: var(--sp-2) var(--sp-4);
    font-size: var(--fs-sm);
  }

  .alert {
    padding: var(--sp-2) var(--sp-3);
    border-radius: var(--radius-md);
    margin-bottom: var(--sp-3);
    font-size: var(--fs-xs);
    flex-shrink: 0;
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

  /* FULL WIDTH LAYOUT */
  .ref-dashboard-layout {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-height: 0;
    overflow: hidden;
  }

  /* LIST WRAPPER */
  .references-list-wrapper {
    flex: 1;
    overflow-y: auto;
    min-height: 0;
    padding-right: var(--sp-2);
  }

  .references-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: var(--sp-4);
    padding-bottom: var(--sp-4);
  }

  /* PREMIUM CARDS STYLE */
  .ref-card {
    background: var(--clr-surface);
    border: 1px solid var(--clr-border);
    border-radius: var(--radius-md);
    padding: var(--sp-4);
    transition: all 0.3s ease;
    height: fit-content;
    position: relative;
    overflow: hidden;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.02);
  }

  .ref-card::before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    width: 4px;
    height: 100%;
  }

  .ref-card.circle-card::before {
    background: var(--clr-accent);
  }

  .ref-card.polygon-card::before {
    background: #c084fc; /* light purple */
  }

  .ref-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
  }

  .ref-card.circle-card:hover {
    border-color: var(--clr-accent);
  }

  .ref-card.polygon-card:hover {
    border-color: #c084fc;
  }

  .ref-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--sp-3);
    padding-bottom: var(--sp-2);
    border-bottom: 1px solid var(--clr-border);
  }

  .ref-title-group {
    display: flex;
    align-items: center;
    min-width: 0;
  }

  .ref-name {
    font-size: var(--fs-sm);
    font-weight: var(--fw-semibold);
    color: var(--clr-text);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .btn-icon {
    padding: var(--sp-1);
    border: none;
    background: transparent;
    cursor: pointer;
    border-radius: var(--radius-sm);
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .btn-icon.btn-danger-compact {
    color: var(--clr-text-muted);
  }
  .btn-icon.btn-danger-compact:hover {
    background: var(--clr-ng-bg);
    color: var(--clr-ng);
  }

  .ref-details {
    display: flex;
    flex-direction: column;
    gap: var(--sp-2);
  }
  .ref-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: var(--fs-xs);
  }

  .ref-row.border-top-line {
    border-top: 1px dashed var(--clr-border);
    padding-top: var(--sp-2);
    margin-top: var(--sp-1);
  }

  .ref-label {
    color: var(--clr-text-muted);
    font-weight: var(--fw-medium);
  }
  .ref-value {
    color: var(--clr-text);
    font-weight: var(--fw-medium);
  }

  .badge-shape {
    font-size: 10px;
    padding: 2px var(--sp-2);
    border-radius: var(--radius-sm);
    background: rgba(192, 132, 252, 0.15);
    color: #a855f7;
    font-weight: var(--fw-semibold);
    text-transform: capitalize;
  }

  .badge-shape.circle-badge {
    background: rgba(59, 130, 246, 0.15);
    color: var(--clr-accent);
  }

  .time-container {
    display: flex;
    align-items: center;
    color: var(--clr-text-dim);
    font-size: 10px;
    width: 100%;
  }

  .time-val {
    margin-left: 2px;
  }

  .divider-dot {
    margin: 0 var(--sp-2);
    color: var(--clr-border);
  }

  .mono {
    font-family: "Courier New", monospace;
    color: var(--clr-accent);
    font-weight: var(--fw-semibold);
  }
  .mono-tol {
    font-family: "Courier New", monospace;
    color: var(--clr-warning);
    font-weight: var(--fw-semibold);
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
    padding: var(--sp-12) var(--sp-4);
    color: var(--clr-text-muted);
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background: var(--clr-surface);
    border: 1px dashed var(--clr-border);
    border-radius: var(--radius-md);
    margin-bottom: var(--sp-4);
  }


  /* ========================================= */
  /* MODAL OVERLAY OVERRIDE FOR DESKTOP VIEW   */
  /* ========================================= */
  .modal-overlay {
    position: fixed;
    inset: 0;
    z-index: 1000;
    background: rgba(15, 23, 42, 0.65); /* Modern slate backdrop */
    backdrop-filter: blur(4px);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: var(--sp-4);
    animation: fadeIn 0.2s ease;
  }

  .modal-card {
    background: var(--clr-surface);
    border: 1px solid var(--clr-border);
    border-radius: var(--radius-lg);
    width: 500px;
    max-width: 100%;
    max-height: 90vh;
    display: flex;
    flex-direction: column;
    box-shadow:
      0 20px 25px -5px rgba(0, 0, 0, 0.1),
      0 10px 10px -5px rgba(0, 0, 0, 0.04);
    overflow: hidden;
  }

  .modal-header-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--sp-4) var(--sp-5);
    border-bottom: 1px solid var(--clr-border);
    background: var(--clr-surface-2);
    flex-shrink: 0;
  }

  .modal-title-text {
    font-size: var(--fs-md);
    font-weight: var(--fw-semibold);
    color: var(--clr-text);
  }

  .modal-close {
    border: none;
    background: transparent;
    cursor: pointer;
    color: var(--clr-text-muted);
    transition: color 0.2s;
    padding: var(--sp-1);
    border-radius: var(--radius-sm);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .modal-close:hover {
    color: var(--clr-text);
    background: var(--clr-border-light);
  }

  .modal-body-content {
    padding: var(--sp-5);
    overflow-y: auto;
    flex: 1;
  }

  .modal-footer-bar {
    display: flex;
    gap: var(--sp-3);
    padding: var(--sp-4) var(--sp-5);
    border-top: 1px solid var(--clr-border);
    background: var(--clr-surface-2);
    flex-shrink: 0;
  }

  .btn-cancel {
    padding: 0 var(--sp-5);
    font-size: var(--fs-sm);
    height: 38px;
  }

  /* TOGGLE BUTTONS COMPACT */
  .source-toggle {
    display: flex;
    gap: var(--sp-2);
    margin-bottom: var(--sp-4);
  }

  .toggle-btn {
    flex: 1;
    height: 36px;
    font-size: var(--fs-xs);
    font-weight: var(--fw-medium);
    background: var(--clr-bg);
    border: 1px solid var(--clr-border);
    border-radius: var(--radius-sm);
    cursor: pointer;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .toggle-btn:hover {
    background: var(--clr-surface-2);
  }

  .toggle-btn.active {
    background: var(--clr-accent);
    color: white;
    border-color: var(--clr-accent);
  }

  /* MANUAL FORM */
  .manual-form {
    display: flex;
    flex-direction: column;
    gap: var(--sp-3);
  }

  .form-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--sp-3);
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: var(--sp-2);
  }

  /* FILE UPLOAD COMPACT */
  .upload-area {
    position: relative;
    border: 2px dashed var(--clr-border);
    border-radius: var(--radius-md);
    padding: var(--sp-6) var(--sp-4);
    text-align: center;
    background: var(--clr-surface-2);
    transition: all 0.2s ease;
  }

  .file-input {
    position: absolute;
    inset: 0;
    opacity: 0;
    width: 100%;
    height: 100%;
    cursor: pointer;
    z-index: 2;
  }

  .upload-area:hover {
    border-color: var(--clr-accent);
    background: var(--clr-surface);
  }


  .filename-text {
    font-size: var(--fs-sm);
    font-weight: var(--fw-medium);
    margin-bottom: 2px;
    word-break: break-all;
  }

  /* CAPTURE INFO BOX */
  .capture-info-box {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: var(--sp-6) var(--sp-4);
    background: var(--clr-surface-2);
    border: 1px dashed var(--clr-border);
    border-radius: var(--radius-md);
    text-align: center;
    gap: var(--sp-3);
  }
  
  .info-text {
    font-size: var(--fs-sm);
    font-weight: var(--fw-medium);
    color: var(--clr-text);
    margin: 0;
  }

  /* KEYFRAME ANIMATIONS */
  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  @keyframes scaleIn {
    from {
      transform: scale(0.95);
      opacity: 0;
    }
    to {
      transform: scale(1);
      opacity: 1;
    }
  }

  .animate-scale-in {
    animation: scaleIn 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  }

  /* ========================================= */
  /* RESPONSIVE MEDIA QUERIES                  */
  /* ========================================= */
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
    .modal-card {
      width: 100%;
      max-height: 95vh;
    }
  }
</style>

