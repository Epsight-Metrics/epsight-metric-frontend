<script>
  import { onMount } from "svelte";
  import { t } from "$lib/i18n.js";
  import { getParts } from "$lib/api/operator.js";
  import { createPart, updatePart, deletePart } from "$lib/api/manager.js";
  import {
    Plus,
    Edit,
    Trash2,
    AlertCircle,
    Check,
    X,
    Database,
  } from "@lucide/svelte";

  let parts = $state([]);
  let filterText = $state("");
  let loading = $state(true);
  let error = $state("");
  let success = $state("");

  // Modal / form state
  let showModal = $state(false);
  let isEditMode = $state(false);
  let selectedPartId = $state(null);

  // Form inputs
  let partCode = $state("");
  let partName = $state("");
  let vendorName = $state("");
  let saving = $state(false);

  // Derived state to filter parts by code, name, or vendor
  let filteredParts = $derived.by(() => {
    if (!filterText.trim()) return parts;
    const query = filterText.toLowerCase();
    return parts.filter(
      (part) =>
        (part.partCode || "").toLowerCase().includes(query) ||
        (part.partName || "").toLowerCase().includes(query) ||
        (part.vendorName || "").toLowerCase().includes(query)
    );
  });

  async function loadParts() {
    loading = true;
    error = "";
    try {
      const data = await getParts();
      parts = data || [];
    } catch (err) {
      error = err.message || "Gagal memuat daftar part";
    } finally {
      loading = false;
    }
  }

  function openAddModal() {
    isEditMode = false;
    selectedPartId = null;
    partCode = "";
    partName = "";
    vendorName = "";
    error = "";
    showModal = true;
  }

  function openEditModal(part) {
    isEditMode = true;
    selectedPartId = part.id;
    partCode = part.partCode;
    partName = part.partName;
    vendorName = part.vendorName;
    error = "";
    showModal = true;
  }

  async function handleSave() {
    if (!partName.trim() || !vendorName.trim()) {
      error = "Nama Part dan Nama Vendor wajib diisi";
      return;
    }

    saving = true;
    error = "";
    try {
      const payload = {
        partCode: partCode.trim() || undefined,
        partName: partName.trim(),
        vendorName: vendorName.trim(),
      };

      if (isEditMode) {
        await updatePart(selectedPartId, payload);
        success = `Part "${partName}" berhasil diperbarui!`;
      } else {
        const newPart = await createPart(payload);
        success = `Part "${newPart.partName}" berhasil ditambahkan dengan kode "${newPart.partCode}"!`;
      }

      showModal = false;
      await loadParts();
      setTimeout(() => (success = ""), 3000);
    } catch (err) {
      error = err.message || "Gagal menyimpan part";
    } finally {
      saving = false;
    }
  }

  async function handleDelete(part) {
    if (
      !confirm(
        `Apakah Anda yakin ingin menghapus part "${part.partName}" (${part.partCode})?`
      )
    ) {
      return;
    }

    error = "";
    success = "";
    try {
      await deletePart(part.id);
      success = `Part "${part.partName}" berhasil dihapus!`;
      await loadParts();
      setTimeout(() => (success = ""), 3000);
    } catch (err) {
      error = err.message || "Gagal menghapus part. Part mungkin sudah memiliki log inspeksi.";
    }
  }

  onMount(() => {
    loadParts();
  });
</script>

<svelte:head>
  <title>Kelola Part — EPSON QC</title>
</svelte:head>

<div class="page animate-fade-in">
  <!-- PAGE HEADER -->
  <div class="page-header">
    <div>
      <h1 class="page-title">
        <Database class="inline-icon mr-2 text-primary" size={24} /> Kelola Part
      </h1>
      <p class="page-sub">
        Kelola master data part dan produsen vendor untuk proses inspeksi QC
      </p>
    </div>
    <div class="header-actions">
      <button class="btn btn-primary" onclick={openAddModal}>
        <Plus size={16} class="inline-icon mr-2" /> Tambah Part Baru
      </button>
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

  <!-- SEARCH/FILTER ROW -->
  <div class="filter-row">
    <input
      type="text"
      class="input filter-input"
      placeholder="Cari kode, nama, atau vendor..."
      bind:value={filterText}
    />
  </div>

  <!-- MAIN LIST VIEW -->
  {#if loading}
    <div class="loading-state">
      <span class="spinner-lg"></span>
      <p>{$t("common.loading")}</p>
    </div>
  {:else if parts.length === 0}
    <div class="empty-state">
      <Database size={48} class="empty-icon" />
      <h3>Belum ada data part</h3>
      <p>
        Daftarkan part baru terlebih dahulu agar operator dapat memilih part untuk inspeksi
      </p>
      <button class="btn btn-primary mt-4" onclick={openAddModal}>
        <Plus size={16} class="inline-icon mr-2" /> Tambah Sekarang
      </button>
    </div>
  {:else if filteredParts.length === 0}
    <div class="empty-state">
      <Database size={48} class="empty-icon" />
      <h3>Part tidak ditemukan</h3>
      <p>Tidak ada data part yang cocok dengan pencarian "{filterText}"</p>
      <button class="btn btn-secondary mt-4" onclick={() => (filterText = "")}>
        Clear Pencarian
      </button>
    </div>
  {:else}
    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th>Kode Part</th>
            <th>Nama Part</th>
            <th>Nama Vendor</th>
            <th class="actions-col">Aksi</th>
          </tr>
        </thead>
        <tbody>
          {#each filteredParts as part (part.id)}
            <tr class="animate-fade-in">
              <td class="mono"><code>{part.partCode}</code></td>
              <td style="font-weight: 500;">{part.partName}</td>
              <td>{part.vendorName}</td>
              <td class="actions-col">
                <div class="action-buttons">
                  <button
                    class="btn-icon btn-edit"
                    onclick={() => openEditModal(part)}
                    title="Edit Part"
                  >
                    <Edit size={14} />
                  </button>
                  <button
                    class="btn-icon btn-danger-compact"
                    onclick={() => handleDelete(part)}
                    title="Hapus Part"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
</div>

<!-- ADD/EDIT MODAL -->
{#if showModal}
  <div
    class="modal-overlay"
    onclick={() => (showModal = false)}
    onkeydown={(e) => e.key === "Escape" && (showModal = false)}
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
          <Database class="inline-icon mr-2 text-primary" size={20} />
          {isEditMode ? "Edit Part" : "Tambah Part Baru"}
        </h3>
        <button class="modal-close" onclick={() => (showModal = false)}>
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
          <label class="label" for="partCode">
            Kode Part {isEditMode ? "" : "(Opsional)"}
          </label>
          <input
            class="input"
            id="partCode"
            type="text"
            placeholder={isEditMode
              ? "Masukkan kode part"
              : "Kosongkan untuk auto-increment (contoh: PT-002)"}
            bind:value={partCode}
            disabled={saving}
          />
        </div>

        <div class="form-group">
          <label class="label" for="partName">Nama Part *</label>
          <input
            class="input"
            id="partName"
            type="text"
            placeholder="Contoh: Gear Kecil A"
            bind:value={partName}
            disabled={saving}
          />
        </div>

        <div class="form-group">
          <label class="label" for="vendorName">Nama Vendor *</label>
          <input
            class="input"
            id="vendorName"
            type="text"
            placeholder="Contoh: PT Epson Batam"
            bind:value={vendorName}
            disabled={saving}
          />
        </div>
      </div>

      <div class="modal-footer-bar">
        <button
          class="btn btn-primary flex-1 btn-save"
          onclick={handleSave}
          disabled={saving || !partName.trim() || !vendorName.trim()}
        >
          {#if saving}
            <span class="spinner"></span> Menyimpan...
          {:else}
            <Check size={16} class="inline-icon mr-2" /> Simpan Part
          {/if}
        </button>
        <button
          class="btn btn-secondary btn-cancel"
          onclick={() => (showModal = false)}
          disabled={saving}
        >
          Batal
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .page {
    display: flex;
    flex-direction: column;
    flex: 1;
    overflow: hidden;
    height: 100%;
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
    font-size: var(--fs-xl);
    font-weight: var(--fw-semibold);
    color: var(--clr-text);
  }

  .page-sub {
    font-size: var(--fs-sm);
    color: var(--clr-text-dim);
    margin-top: 2px;
  }

  .header-actions {
    display: flex;
    gap: var(--sp-2);
  }

  .filter-row {
    display: flex;
    gap: var(--sp-3);
    margin-bottom: var(--sp-4);
    align-items: center;
    flex-shrink: 0;
  }

  .filter-input {
    max-width: 320px;
    height: 40px;
  }

  .alert {
    padding: var(--sp-3) var(--sp-4);
    border-radius: var(--radius-md);
    font-size: var(--fs-sm);
    margin-bottom: var(--sp-4);
    display: flex;
    align-items: center;
    flex-shrink: 0;
  }

  .alert-error {
    background: var(--clr-ng-bg);
    color: var(--clr-ng);
    border: 1px solid rgba(239, 68, 68, 0.2);
  }

  .alert-success {
    background: var(--clr-ok-bg);
    color: var(--clr-ok);
    border: 1px solid rgba(16, 185, 129, 0.2);
  }

  .loading-state {
    padding: var(--sp-12);
    text-align: center;
    color: var(--clr-text-muted);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--sp-3);
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

  .empty-icon {
    opacity: 0.4;
    margin-bottom: var(--sp-4);
  }

  .empty-state h3 {
    font-size: var(--fs-md);
    font-weight: var(--fw-semibold);
    color: var(--clr-text);
    margin-bottom: var(--sp-2);
  }

  .empty-state p {
    font-size: var(--fs-sm);
    color: var(--clr-text-dim);
    max-width: 400px;
  }

  /* Table styling */
  .table-container {
    flex: 1;
    overflow-y: auto;
    background: var(--clr-surface);
    border: 1px solid var(--clr-border);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-card);
  }

  table {
    width: 100%;
    border-collapse: collapse;
    text-align: left;
  }

  th {
    background: var(--clr-surface-2);
    padding: var(--sp-3) var(--sp-4);
    font-size: var(--fs-xs);
    font-weight: var(--fw-semibold);
    color: var(--clr-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    border-bottom: 1px solid var(--clr-border);
    position: sticky;
    top: 0;
    z-index: 10;
  }

  td {
    padding: var(--sp-3) var(--sp-4);
    font-size: var(--fs-sm);
    color: var(--clr-text);
    border-bottom: 1px solid var(--clr-border);
  }

  tr:hover td {
    background: var(--clr-surface-2);
  }

  .mono {
    font-family: var(--font-mono);
  }

  .actions-col {
    width: 100px;
    text-align: right;
  }

  .action-buttons {
    display: flex;
    gap: var(--sp-2);
    justify-content: flex-end;
  }

  .btn-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border-radius: var(--radius-md);
    border: 1px solid var(--clr-border);
    background: var(--clr-surface);
    color: var(--clr-text-muted);
    cursor: pointer;
    transition: all 0.2s;
  }

  .btn-icon:hover {
    color: var(--clr-text);
    background: var(--clr-border-light);
  }

  .btn-edit:hover {
    color: var(--clr-accent);
    border-color: var(--clr-accent);
    background: var(--clr-accent-subtle);
  }

  .btn-danger-compact:hover {
    color: var(--clr-ng);
    border-color: var(--clr-ng);
    background: var(--clr-ng-bg);
  }

  /* Modal overlay and card styling */
  .modal-overlay {
    position: fixed;
    inset: 0;
    z-index: 1000;
    background: rgba(15, 23, 42, 0.65);
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

  .form-group {
    margin-bottom: var(--sp-4);
  }

  .form-group:last-child {
    margin-bottom: 0;
  }

  .label {
    display: block;
    font-size: var(--fs-sm);
    font-weight: var(--fw-medium);
    color: var(--clr-text);
    margin-bottom: var(--sp-2);
  }

  .input {
    width: 100%;
    padding: var(--sp-2) var(--sp-3);
    font-family: var(--font-family);
    font-size: var(--fs-sm);
    color: var(--clr-text);
    background: var(--clr-surface);
    border: 1px solid var(--clr-border);
    border-radius: var(--radius-md);
    box-sizing: border-box;
    transition: all var(--transition-fast);
  }

  .input:focus {
    outline: none;
    border-color: var(--clr-accent);
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  .btn-cancel {
    padding: 0 var(--sp-5);
    font-size: var(--fs-sm);
    height: 38px;
  }

  .btn-save {
    height: 38px;
    font-size: var(--fs-sm);
  }

  .spinner {
    display: inline-block;
    width: 16px;
    height: 16px;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-top-color: #fff;
    border-radius: 50%;
    animation: spin 0.6s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

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
