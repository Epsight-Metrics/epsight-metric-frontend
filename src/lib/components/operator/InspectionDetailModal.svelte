<script>
  import { t } from "$lib/i18n.js";
  import { CheckCircle, XCircle, AlertTriangle } from "@lucide/svelte";
  import { getInspectionDetail } from "$lib/api/operator.js";

  let { show = false, inspectionId = null, onClose = () => {} } = $props();

  let loading = $state(false);
  let error = $state("");
  let inspection = $state(null);

  // Load inspection details dynamically when the modal is opened
  $effect(() => {
    if (show && inspectionId) {
      fetchDetail(inspectionId);
    }
  });

  async function fetchDetail(id) {
    loading = true;
    error = "";
    try {
      const data = await getInspectionDetail(id);
      inspection = data.inspection || data;
    } catch (err) {
      console.error("Failed to load inspection detail:", err);
      error = "Gagal memuat detail inspeksi";
    } finally {
      loading = false;
    }
  }

  function flattenDimensions(dims) {
    if (!dims) return {};
    if (
      dims.diameter_mm !== undefined ||
      dims.width_mm !== undefined ||
      dims.height_mm !== undefined
    ) {
      return dims;
    }

    const flat = {};
    const measurements = dims.measurements || {};
    const deviations = dims.deviations || {};

    if (measurements.diameter_mm !== undefined) flat.diameter_mm = measurements.diameter_mm;
    if (measurements.width_mm !== undefined) flat.width_mm = measurements.width_mm;
    if (measurements.height_mm !== undefined) flat.height_mm = measurements.height_mm;
    if (measurements.area_mm2 !== undefined) flat.area_mm2 = measurements.area_mm2;
    if (measurements.perimeter_mm !== undefined) flat.perimeter_mm = measurements.perimeter_mm;

    if (deviations.diameter_mm !== undefined) flat.deviation_diameter_mm = deviations.diameter_mm;
    if (deviations.width_mm !== undefined) flat.deviation_width_mm = deviations.width_mm;
    if (deviations.height_mm !== undefined) flat.deviation_height_mm = deviations.height_mm;

    if (flat.diameter_mm !== undefined && flat.deviation_diameter_mm !== undefined) {
      flat.reference_diameter_mm = flat.diameter_mm - flat.deviation_diameter_mm;
    }
    if (flat.width_mm !== undefined && flat.deviation_width_mm !== undefined) {
      flat.reference_width_mm = flat.width_mm - flat.deviation_width_mm;
    }
    if (flat.height_mm !== undefined && flat.deviation_height_mm !== undefined) {
      flat.reference_height_mm = flat.height_mm - flat.deviation_height_mm;
    }

    return flat;
  }

  let dimensions = $derived(flattenDimensions(inspection?.nilaiDimensi || {}));
  let statusText = $derived(
    inspection
      ? (!inspection.matchedRef || inspection.matchedRef === "-" || inspection.matchedRef === "No matched reference")
        ? "NO REF"
        : (inspection.status === "GOOD" || inspection.status === "OK" ? "OK" : "NG")
      : ""
  );
</script>

{#if show && inspection}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="modal-overlay" onclick={onClose} role="presentation">
    <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
    <div
      class="modal-card"
      onclick={(e) => e.stopPropagation()}
      onkeydown={(e) => e.stopPropagation()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      tabindex="-1"
    >
      <div class="modal-header">
        <div>
          <h3 id="modal-title">Detail Inspeksi #{inspection.id}</h3>
          <p class="modal-subtitle">
            {inspection.part?.partName || "-"} ({inspection.part?.partCode || inspection.idPart || "-"})
          </p>
        </div>
        <button
          class="modal-close"
          onclick={onClose}
          aria-label="Tutup modal"
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      <div class="modal-body">
        {#if loading}
          <div class="loading-detail">
            <span class="spinner"></span>
            <p>Memuat detail inspeksi...</p>
          </div>
        {:else if error}
          <div class="error-detail">
            <p>{error}</p>
          </div>
        {:else}
          <div
            class="detail-status"
            class:ok={statusText === "OK"}
            class:ng={statusText === "NG"}
            class:noref={statusText === "NO REF"}
          >
            {#if statusText === "OK"}
              <CheckCircle size={32} />
            {:else if statusText === "NO REF"}
              <AlertTriangle size={32} />
            {:else}
              <XCircle size={32} />
            {/if}
            <span>{statusText}</span>
          </div>

          <div class="detail-meta">
            <div class="meta-item">
              <span class="meta-label">Waktu:</span>
              <span class="meta-value"
                >{new Date(inspection.timestamp).toLocaleString(
                  "id-ID",
                )}</span
              >
            </div>
            <div class="meta-item">
              <span class="meta-label">Shape:</span>
              <span class="meta-value">{inspection.shape || "-"}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">Reference:</span>
              <span class="meta-value"
                >{inspection.matchedRef || "-"}</span
              >
            </div>
          </div>

          <div class="measurements-table">
            <div class="table-header">
              <span class="col-dimension">Dimensi</span>
              <span class="col-actual">Aktual (mm)</span>
              <span class="col-reference">Reference (mm)</span>
              <span class="col-deviation">Deviasi (mm)</span>
            </div>

            {#if inspection.shape === "circle" && dimensions.diameter_mm !== undefined}
              <div
                class="table-row"
                class:deviation-alert={Math.abs(
                  dimensions.deviation_diameter_mm || 0,
                ) > 0.5}
              >
                <span class="col-dimension">Diameter</span>
                <span class="col-actual"
                  >{dimensions.diameter_mm?.toFixed(2) ||
                    "-"}</span
                >
                <span class="col-reference"
                  >{dimensions.reference_diameter_mm?.toFixed(
                    2,
                  ) || "-"}</span
                >
                <span
                  class="col-deviation"
                  class:positive={(dimensions.deviation_diameter_mm || 0) > 0}
                >
                  {dimensions.deviation_diameter_mm !== undefined
                    ? (dimensions.deviation_diameter_mm >= 0 ? "+" : "") +
                      dimensions.deviation_diameter_mm.toFixed(2)
                    : "-"}
                </span>
              </div>
            {/if}

            {#if inspection.shape !== "circle" && dimensions.width_mm !== undefined}
              <div
                class="table-row"
                class:deviation-alert={Math.abs(
                  dimensions.deviation_width_mm || 0,
                ) > 0.5}
              >
                <span class="col-dimension">Width</span>
                <span class="col-actual"
                  >{dimensions.width_mm?.toFixed(2) ||
                    "-"}</span
                >
                <span class="col-reference"
                  >{dimensions.reference_width_mm?.toFixed(
                    2,
                  ) || "-"}</span
                >
                <span
                  class="col-deviation"
                  class:positive={(dimensions.deviation_width_mm || 0) > 0}
                >
                  {dimensions.deviation_width_mm !== undefined
                    ? (dimensions.deviation_width_mm >= 0 ? "+" : "") +
                      dimensions.deviation_width_mm.toFixed(2)
                    : "-"}
                </span>
              </div>
            {/if}

            {#if inspection.shape !== "circle" && dimensions.height_mm !== undefined}
              <div
                class="table-row"
                class:deviation-alert={Math.abs(
                  dimensions.deviation_height_mm || 0,
                ) > 0.5}
              >
                <span class="col-dimension">Height</span>
                <span class="col-actual"
                  >{dimensions.height_mm?.toFixed(2) ||
                    "-"}</span
                >
                <span class="col-reference"
                  >{dimensions.reference_height_mm?.toFixed(
                    2,
                  ) || "-"}</span
                >
                <span
                  class="col-deviation"
                  class:positive={(dimensions.deviation_height_mm || 0) > 0}
                >
                  {dimensions.deviation_height_mm !== undefined
                    ? (dimensions.deviation_height_mm >= 0 ? "+" : "") +
                      dimensions.deviation_height_mm.toFixed(2)
                    : "-"}
                </span>
              </div>
            {/if}
          </div>
        {/if}
      </div>
    </div>
  </div>
{/if}

<style>
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    backdrop-filter: blur(4px);
  }
  .modal-card {
    background: var(--clr-surface);
    border: 1px solid var(--clr-border);
    border-radius: var(--radius-lg);
    width: 90%;
    max-width: 500px;
    box-shadow: var(--shadow-xl);
    display: flex;
    flex-direction: column;
    max-height: 90vh;
  }
  .modal-header {
    padding: var(--sp-4);
    border-bottom: 1px solid var(--clr-border);
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
  }
  #modal-title {
    margin: 0;
    font-size: var(--fs-lg);
    font-weight: 600;
    color: var(--clr-text);
  }
  .modal-subtitle {
    margin: var(--sp-1) 0 0 0;
    font-size: var(--fs-sm);
    color: var(--clr-text-muted);
  }
  .modal-close {
    background: none;
    border: none;
    color: var(--clr-text-muted);
    cursor: pointer;
    padding: var(--sp-1);
    border-radius: var(--radius-md);
  }
  .modal-close:hover {
    background: var(--clr-bg-hover);
    color: var(--clr-text);
  }
  .modal-body {
    padding: var(--sp-4);
    overflow-y: auto;
  }
  .detail-status {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--sp-2);
    padding: var(--sp-4);
    border-radius: var(--radius-md);
    font-weight: 700;
    font-size: var(--fs-xl);
    margin-bottom: var(--sp-4);
  }
  .detail-status.ok {
    background: rgba(34, 197, 94, 0.1);
    color: var(--clr-ok);
  }
  .detail-status.ng {
    background: rgba(239, 68, 68, 0.1);
    color: var(--clr-ng);
  }
  .detail-status.noref {
    background: rgba(245, 158, 11, 0.1);
    color: var(--clr-warning);
  }
  .detail-meta {
    background: var(--clr-surface-2);
    padding: var(--sp-3);
    border-radius: var(--radius-md);
    display: flex;
    flex-direction: column;
    gap: var(--sp-2);
    margin-bottom: var(--sp-4);
    border: 1px solid var(--clr-border);
  }
  .meta-item {
    display: flex;
    justify-content: space-between;
    font-size: var(--fs-sm);
  }
  .meta-label {
    color: var(--clr-text-muted);
  }
  .meta-value {
    font-weight: 500;
    color: var(--clr-text);
  }
  .measurements-table {
    display: flex;
    flex-direction: column;
    border: 1px solid var(--clr-border);
    border-radius: var(--radius-md);
    overflow: hidden;
  }
  .table-header {
    display: grid;
    grid-template-columns: 1.5fr 1fr 1fr 1fr;
    background: var(--clr-surface-2);
    padding: var(--sp-2);
    font-size: var(--fs-xs);
    font-weight: 600;
    color: var(--clr-text-muted);
    border-bottom: 1px solid var(--clr-border);
  }
  .table-row {
    display: grid;
    grid-template-columns: 1.5fr 1fr 1fr 1fr;
    padding: var(--sp-3) var(--sp-2);
    font-size: var(--fs-sm);
    border-bottom: 1px solid var(--clr-border);
  }
  .table-row:last-child {
    border-bottom: none;
  }
  .table-row.deviation-alert {
    background: rgba(239, 68, 68, 0.05);
  }
  .col-dimension {
    font-weight: 500;
    color: var(--clr-text);
  }
  .col-actual, .col-reference, .col-deviation {
    text-align: right;
    color: var(--clr-text);
  }
  .col-deviation {
    color: var(--clr-ng);
  }
  .col-deviation.positive {
    color: var(--clr-ok);
  }
  .loading-detail {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: var(--sp-8);
    gap: var(--sp-2);
    color: var(--clr-text-muted);
  }
  .spinner {
    width: 24px;
    height: 24px;
    border: 2px solid var(--clr-border);
    border-top-color: var(--clr-accent);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
</style>
