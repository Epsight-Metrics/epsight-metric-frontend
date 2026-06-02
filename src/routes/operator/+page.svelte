<script>
  import { t } from '$lib/i18n.js';
  import { Scan, AlertTriangle, Volume2, ClipboardList, CheckCircle, XCircle, CircleDot, Circle, Check, Monitor, Smartphone, Database } from '@lucide/svelte';
  import { onMount, onDestroy } from 'svelte';
  import { getSession, startSession, stopSession, submitInspection, getParts } from '$lib/api/operator.js';
  import { connectSSE } from '$lib/api/notifications.js';
  import { getToken } from '$lib/api/client.js';

  // Session state
  let activeSession = $state(null);
  let sessionLoading = $state(false);

  // Inspection state
  let inspecting = $state(false);
  let hasResult = $state(false);
  let resultStatus = $state('');
  let showNgOverlay = $state(false);
  let manualInspectionId = $state(null);  // Track manual inspection ID

  // Data
  let measurements = $state({});
  let deviations = $state({});
  let referenceMatched = $state('');
  let selectedPartId = $state(null);
  let parts = $state([]);
  let recentInspections = $state([]);
  let todayInspected = $state(0);
  let todayNg = $state(0);
  let cvLastSeen = $state(null);
  let eventSource = null;
  let detections = $state({ objects: [], results: [], timestamp: null });
  let detectionInterval = null;
  let videoStreamSize = $state({ width: 1920, height: 1080 }); // Default size

  // CV Stream URL
  if (!import.meta.env.VITE_CV_STREAM_URL) {
    console.warn('VITE_CV_STREAM_URL not set, CV stream will not work');
  }
  const CV_STREAM_URL = import.meta.env.VITE_CV_STREAM_URL;
  let inspectionMode = $state('local');
  let videoElement = $state(null);
  let imgElement = $state(null);
  let stream = $state(null);
  let capturedImage = $state(null);
  let onlineProcessing = $state(false);
  let availableCameras = $state([]);
  let selectedCamera = $state('');
  let useIpCamera = $state(false);
  let ipCameraUrl = $state('http://192.168.1.100:8080/video');
  
  // Detail modal state
  let selectedInspection = $state(null);
  let showDetailModal = $state(false);
  let loadingDetail = $state(false);

  // Derived state untuk status CV online/offline
  let cvOnline = $derived(cvLastSeen && (Date.now() - cvLastSeen) < 60_000);

  // Fetch detections from CV API
  async function fetchDetections() {
    try {
      const CV_API_URL = import.meta.env.VITE_CV_API_URL || 'http://localhost:8000';
      const res = await fetch(`${CV_API_URL}/detections`);
      if (res.ok) {
        const data = await res.json();
        if (data.timestamp) {
          detections = data;
        }
      }
    } catch (err) {
      // Silent fail
    }
  }

  // Auto-attach stream when videoElement is recreated after taking a photo
  $effect(() => {
    if (videoElement && stream && videoElement.srcObject !== stream) {
      videoElement.srcObject = stream;
      videoElement.play().catch(err => console.error('Auto-play error:', err));
    }
  });

  // Loading & error
  let pageLoading = $state(true);
  let error = $state('');

  async function loadInitialData() {
    pageLoading = true;
    error = '';
    try {
      const [sessionData, partsData] = await Promise.all([
        getSession(),
        getParts(),
      ]);

      parts = partsData || [];
      if (parts.length > 0 && !selectedPartId) {
        selectedPartId = parts[0].id;
      }

      activeSession = sessionData.activeSession || null;
      const initialInspections = (sessionData.recent || []).map(mapInspection);
      // Deduplikasi berdasarkan ID
      const uniqueMap = new Map();
      initialInspections.forEach(item => uniqueMap.set(item.id, item));
      recentInspections = Array.from(uniqueMap.values());

      // Count today's stats from recent inspections
      const today = new Date().toDateString();
      const todayItems = (sessionData.recent || []).filter(
        (r) => new Date(r.timestamp).toDateString() === today
      );
      todayInspected = todayItems.length;
      todayNg = todayItems.filter((r) => r.status === 'NG' || r.status === 'NO GOOD').length;
    } catch (err) {
      error = err.message;
    } finally {
      pageLoading = false;
    }
  }

  function mapInspection(item) {
    const dims = item.nilaiDimensi || {};
    return {
      id: item.id,
      part: item.part?.partCode || item.idPart || '-',
      partName: item.part?.partName || '-',
      status: item.status === 'GOOD' ? 'OK' : item.status === 'NO GOOD' ? 'NG' : item.status,
      time: new Date(item.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      dimensions: dims,
      timestamp: item.timestamp,
      shape: item.shape,
      matchedRef: item.matchedRef,
    };
  }
  
  function openDetailModal(inspection) {
    selectedInspection = inspection;
    showDetailModal = true;
    
    // ALWAYS fetch detail untuk memastikan data lengkap
    console.log('[DEBUG] Opening modal for inspection:', inspection);
    fetchInspectionDetail(inspection.id);
  }
  
  async function fetchInspectionDetail(inspectionId) {
    loadingDetail = true;
    console.log('[DEBUG] Fetching detail for inspection ID:', inspectionId);
    
    try {
      const API_BASE = import.meta.env.VITE_API_URL 
        ? `${import.meta.env.VITE_API_URL}/api` 
        : '/api';
      
      const res = await fetch(`${API_BASE}/operator/inspections/${inspectionId}`, {
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${getToken()}`
        }
      });
      
      console.log('[DEBUG] Response status:', res.status);
      
      if (!res.ok) {
        const errorText = await res.text();
        console.error('[DEBUG] Error response:', errorText);
        throw new Error('Failed to fetch detail');
      }
      
      const data = await res.json();
      console.log('[DEBUG] Received data:', data);
      
      const inspection = data.inspection || data;
      console.log('[DEBUG] Inspection object:', inspection);
      console.log('[DEBUG] nilaiDimensi:', inspection.nilaiDimensi);
      console.log('[DEBUG] matchedRef:', inspection.matchedRef);
      
      // Update selectedInspection dengan data lengkap
      selectedInspection = {
        ...selectedInspection,
        dimensions: inspection.nilaiDimensi || {},
        matchedRef: inspection.matchedRef || selectedInspection.matchedRef,
        shape: inspection.shape || selectedInspection.shape,
        timestamp: inspection.timestamp || selectedInspection.timestamp
      };
      
      console.log('[DEBUG] Updated selectedInspection:', selectedInspection);
      
      // Update recentInspections juga
      recentInspections = recentInspections.map(item =>
        item.id === inspectionId
          ? {
              ...item,
              dimensions: inspection.nilaiDimensi || item.dimensions,
              matchedRef: inspection.matchedRef || item.matchedRef,
              shape: inspection.shape || item.shape
            }
          : item
      );
    } catch (err) {
      console.error('[DEBUG] Failed to fetch inspection detail:', err);
      error = 'Gagal memuat detail inspeksi';
    } finally {
      loadingDetail = false;
    }
  }
  
  function closeDetailModal() {
    showDetailModal = false;
    setTimeout(() => selectedInspection = null, 300);
  }

  async function handleStartSession() {
    sessionLoading = true;
    error = '';
    try {
      const session = await startSession();
      activeSession = session;
    } catch (err) {
      error = err.message;
    } finally {
      sessionLoading = false;
    }
  }

  async function handleStopSession() {
    if (!activeSession) return;
    sessionLoading = true;
    error = '';
    try {
      await stopSession(activeSession.sessionId);
      activeSession = null;
    } catch (err) {
      error = err.message;
    } finally {
      sessionLoading = false;
    }
  }

  async function startInspection() {
    if (inspecting || !selectedPartId || !activeSession) return;
    inspecting = true;
    error = '';

    try {
      // Kirim command ke backend untuk trigger CV
      const response = await fetch('/api/operator/trigger-cv', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          sessionId: activeSession.sessionId
        })
      });

      if (!response.ok) {
        throw new Error('Failed to trigger CV inspection');
      }

      // Hasil akan datang via SSE (inspection-update event)
      // UI sudah handle di onMount → connectSSE

    } catch (err) {
      error = err.message;
      inspecting = false;
    }
  }

  // Online mode functions
  async function loadCameras() {
    try {
      // Request permission first
      await navigator.mediaDevices.getUserMedia({ video: true });
      
      const devices = await navigator.mediaDevices.enumerateDevices();
      availableCameras = devices.filter(device => device.kind === 'videoinput');
      if (availableCameras.length > 0) {
        selectedCamera = availableCameras[availableCameras.length - 1].deviceId; // Default to last camera (usually USB)
        await startCamera(); // Auto start camera
      }
    } catch (err) {
      error = 'Gagal load daftar kamera: ' + err.message;
    }
  }

  async function startCamera() {
    try {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
        stream = null;
      }
      
      // Small delay to ensure previous stream is fully stopped
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const constraints = {
        video: { 
          deviceId: selectedCamera ? { exact: selectedCamera } : undefined,
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 }
        }
      };
      
      stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      if (videoElement) {
        videoElement.srcObject = stream;
        // Force play after srcObject is set
        videoElement.onloadedmetadata = () => {
          videoElement.play().catch(err => {
            console.error('Error playing video:', err);
            error = 'Gagal memutar video: ' + err.message;
          });
        };
      }
    } catch (err) {
      error = 'Gagal akses kamera: ' + err.message;
      console.error('Camera error:', err);
    }
  }

  function stopCamera() {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      stream = null;
    }
  }

  async function capturePhoto() {
    const sourceElement = useIpCamera ? imgElement : videoElement;
    if (!sourceElement) return;
    
    const canvas = document.createElement('canvas');
    canvas.width = 1920;
    canvas.height = 1080;
    const ctx = canvas.getContext('2d');
    
    // Check if it's a video element to get dimensions if available, else fallback
    const width = sourceElement.videoWidth || sourceElement.naturalWidth || canvas.width;
    const height = sourceElement.videoHeight || sourceElement.naturalHeight || canvas.height;
    
    // Draw the image
    ctx.drawImage(sourceElement, 0, 0, width, height, 0, 0, canvas.width, canvas.height);
    
    const blob = await new Promise(resolve => 
      canvas.toBlob(resolve, 'image/jpeg', 0.85)
    );
    
    capturedImage = URL.createObjectURL(blob);
  }

  async function submitOnlineInspection() {
    if (!selectedPartId || !activeSession || !capturedImage) {
      error = 'Pilih part terlebih dahulu';
      return;
    }

    onlineProcessing = true;
    error = '';

    try {
      // Convert captured image back to blob
      const response = await fetch(capturedImage);
      const imageBlob = await response.blob();

      const formData = new FormData();
      formData.append('image', imageBlob, 'inspection.jpg');
      formData.append('partId', selectedPartId);
      formData.append('sessionId', activeSession.sessionId);

      const part = parts.find((p) => p.id == selectedPartId);
      const refName = part ? part.partCode : '';
      formData.append('referenceName', refName);  

      const API_BASE = import.meta.env.VITE_API_URL 
        ? `${import.meta.env.VITE_API_URL}/api` 
        : '/api';

      const apiResponse = await fetch(`${API_BASE}/operator/inspect/online`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${getToken()}`
        },
        body: formData
      });

      if (!apiResponse.ok) {
        const errorData = await apiResponse.json();
        const errDetail = errorData.error ? (typeof errorData.error === 'string' ? errorData.error : JSON.stringify(errorData.error)) : '';
        throw new Error(`${errorData.message || 'Inspeksi gagal'} ${errDetail}`);
      }

      // Reset state
      capturedImage = null;
      
      // Hasil akan muncul via SSE seperti mode lokal

    } catch (err) {
      error = err.message;
    } finally {
      onlineProcessing = false;
    }
  }

  function switchMode(newMode) {
    inspectionMode = newMode;
    if (newMode === 'online') {
      loadCameras();
    } else {
      stopCamera();
      capturedImage = null;
    }
  }

  function playAlarm() {
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 800;
      osc.type = 'square';
      gain.gain.value = 0.3;
      osc.start();
      setTimeout(() => { osc.stop(); ctx.close(); }, 1500);
    } catch (e) { /* Audio not supported */ }
  }

  function confirmNgAndContinue() {
    showNgOverlay = false;
    resultStatus = '';
    hasResult = false;
  }

  function getSelectedPartCode() {
    const p = parts.find((p) => p.id === selectedPartId);
    return p?.partCode || '-';
  }

  onMount(() => {
    loadInitialData();

    // Start polling detections for bounding box overlay
    detectionInterval = setInterval(fetchDetections, 500);

    // Subscribe SSE - terima hasil inspeksi dari CV secara real-time
    eventSource = connectSSE((eventType, data) => {
      if (eventType === 'inspection-update') {
        cvLastSeen = Date.now();  // Update CV last seen timestamp
        
        const mapped = {
          id:           data.inspectionId,
          part:         data.partCode || data.idPart || '-',
          partName:     data.partName || '-',
          status:       (data.status === 'OK' || data.status === 'GOOD') ? 'OK' : 'NG',
          time:         new Date(data.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
          dimensions:   data.nilaiDimensi || {},
          operatorName: data.operatorName || '-',
          sessionId:    data.sessionId || '-',
          batchId:      data.batchId   || null,
          matchedRef:   data.matchedRef || '-',
          shape:        data.shape || '-',
          fromCV:       true,
        };
        
        // Skip jika ini adalah hasil dari manual inspection
        if (mapped.id === manualInspectionId) return;
        
        // Cek duplikasi berdasarkan ID
        if (!recentInspections.some(item => item.id === mapped.id)) {
          recentInspections = [mapped, ...recentInspections.slice(0, 19)];
          todayInspected++;
          if (mapped.status === 'NG') todayNg++;
        }
        
        // Update measurements, deviations, dan reference
        const dims = data.nilaiDimensi || {};
        measurements = dims.measurements || dims;
        deviations = dims.deviations || {};
        referenceMatched = dims.referenceMatched || data.matchedRef || '';
        
        resultStatus  = mapped.status;
        hasResult     = true;
        inspecting    = false;
      }
      if (eventType === 'ng-alert') {
        showNgOverlay = true;
        playAlarm();
      }
    });
  });
  onDestroy(() => {
    eventSource?.close();
    stopCamera();
    if (detectionInterval) clearInterval(detectionInterval);
  });
</script>

<svelte:head>
  <title>{$t('operator.live_camera')} - EPSON QC</title>
</svelte:head>

<!-- Detail Modal -->
{#if showDetailModal && selectedInspection}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="modal-overlay" onclick={closeDetailModal} role="presentation">
    <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
    <div class="modal-card" onclick={(e) => e.stopPropagation()} onkeydown={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="modal-title" tabindex="-1">
      <div class="modal-header">
        <div>
          <h3 id="modal-title">Detail Inspeksi #{selectedInspection.id}</h3>
          <p class="modal-subtitle">{selectedInspection.partName} ({selectedInspection.part})</p>
        </div>
        <button class="modal-close" onclick={closeDetailModal} aria-label="Tutup modal">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
      
      <div class="modal-body">
        {#if loadingDetail}
          <div class="loading-detail">
            <span class="spinner"></span>
            <p>Memuat detail inspeksi...</p>
          </div>
        {:else}
          <div class="detail-status" class:ok={selectedInspection.status === 'OK'} class:ng={selectedInspection.status === 'NG'}>
          {#if selectedInspection.status === 'OK'}
            <CheckCircle size={32} />
          {:else}
            <XCircle size={32} />
          {/if}
          <span>{selectedInspection.status}</span>
        </div>
        
        <div class="detail-meta">
          <div class="meta-item">
            <span class="meta-label">Waktu:</span>
            <span class="meta-value">{new Date(selectedInspection.timestamp).toLocaleString('id-ID')}</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">Shape:</span>
            <span class="meta-value">{selectedInspection.shape || '-'}</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">Reference:</span>
            <span class="meta-value">{selectedInspection.matchedRef || '-'}</span>
          </div>
        </div>

        <div class="measurements-table">
          <div class="table-header">
            <span class="col-dimension">Dimensi</span>
            <span class="col-actual">Aktual (mm)</span>
            <span class="col-reference">Reference (mm)</span>
            <span class="col-deviation">Deviasi (mm)</span>
          </div>
          
          {#if selectedInspection.dimensions.diameter_mm !== undefined}
            <div class="table-row" class:deviation-alert={Math.abs(selectedInspection.dimensions.deviation_diameter_mm || 0) > 0.5}>
              <span class="col-dimension">Diameter</span>
              <span class="col-actual">{selectedInspection.dimensions.diameter_mm?.toFixed(2) || '-'}</span>
              <span class="col-reference">{selectedInspection.dimensions.reference_diameter_mm?.toFixed(2) || '-'}</span>
              <span class="col-deviation" class:positive={(selectedInspection.dimensions.deviation_diameter_mm || 0) > 0}>
                {selectedInspection.dimensions.deviation_diameter_mm !== undefined 
                  ? (selectedInspection.dimensions.deviation_diameter_mm >= 0 ? '+' : '') + selectedInspection.dimensions.deviation_diameter_mm.toFixed(2)
                  : '-'}
              </span>
            </div>
          {/if}
          
          {#if selectedInspection.dimensions.width_mm !== undefined}
            <div class="table-row" class:deviation-alert={Math.abs(selectedInspection.dimensions.deviation_width_mm || 0) > 0.5}>
              <span class="col-dimension">Width</span>
              <span class="col-actual">{selectedInspection.dimensions.width_mm?.toFixed(2) || '-'}</span>
              <span class="col-reference">{selectedInspection.dimensions.reference_width_mm?.toFixed(2) || '-'}</span>
              <span class="col-deviation" class:positive={(selectedInspection.dimensions.deviation_width_mm || 0) > 0}>
                {selectedInspection.dimensions.deviation_width_mm !== undefined 
                  ? (selectedInspection.dimensions.deviation_width_mm >= 0 ? '+' : '') + selectedInspection.dimensions.deviation_width_mm.toFixed(2)
                  : '-'}
              </span>
            </div>
          {/if}
          
          {#if selectedInspection.dimensions.height_mm !== undefined}
            <div class="table-row" class:deviation-alert={Math.abs(selectedInspection.dimensions.deviation_height_mm || 0) > 0.5}>
              <span class="col-dimension">Height</span>
              <span class="col-actual">{selectedInspection.dimensions.height_mm?.toFixed(2) || '-'}</span>
              <span class="col-reference">{selectedInspection.dimensions.reference_height_mm?.toFixed(2) || '-'}</span>
              <span class="col-deviation" class:positive={(selectedInspection.dimensions.deviation_height_mm || 0) > 0}>
                {selectedInspection.dimensions.deviation_height_mm !== undefined 
                  ? (selectedInspection.dimensions.deviation_height_mm >= 0 ? '+' : '') + selectedInspection.dimensions.deviation_height_mm.toFixed(2)
                  : '-'}
              </span>
            </div>
          {/if}
          
          {#if selectedInspection.dimensions.area_mm2 !== undefined}
            <div class="table-row">
              <span class="col-dimension">Area</span>
              <span class="col-actual">{selectedInspection.dimensions.area_mm2?.toFixed(2) || '-'}</span>
              <span class="col-reference">-</span>
              <span class="col-deviation">-</span>
            </div>
          {/if}
          
          {#if selectedInspection.dimensions.perimeter_mm !== undefined}
            <div class="table-row">
              <span class="col-dimension">Perimeter</span>
              <span class="col-actual">{selectedInspection.dimensions.perimeter_mm?.toFixed(2) || '-'}</span>
              <span class="col-reference">-</span>
              <span class="col-deviation">-</span>
            </div>
          {/if}
        </div>
        
        {#if selectedInspection.dimensions.within_tolerance !== undefined}
          <div class="tolerance-badge" class:within={selectedInspection.dimensions.within_tolerance}>
            {selectedInspection.dimensions.within_tolerance ? '✓ Dalam Toleransi' : '⚠ Di Luar Toleransi'}
          </div>
        {/if}
        {/if}
      </div>
    </div>
  </div>
{/if}

<!-- NG Full-screen overlay -->
{#if showNgOverlay}
  <div class="ng-overlay animate-fade-in">
    <div class="ng-content">
      <div class="ng-header-bar"><AlertTriangle size={28} strokeWidth={2.5} />{$t('operator.ng_alert_title')}</div>
      <div class="ng-body">
        <div class="ng-big-text">NG</div>
        <p class="ng-alarm"><Volume2 size={22} />{$t('operator.ng_alarm')}</p>

        <div class="sop-box">
          <p class="sop-title"><ClipboardList size={16} />{$t('operator.sop_title')}</p>
          <p>{$t('operator.sop_1')}</p>
          <p>{$t('operator.sop_2')}</p>
          <p>{$t('operator.sop_3')}</p>
          <p>{$t('operator.sop_4')}</p>
        </div>

        <button class="btn btn-primary btn-lg confirm-btn" onclick={confirmNgAndContinue}>
          <CheckCircle size={20} />{$t('operator.confirm_next')}
        </button>
      </div>
    </div>
  </div>
{/if}

{#if pageLoading}
  <div class="loading-page">
    <span class="spinner-lg"></span>
    <p>{$t('common.loading')}</p>
  </div>
{:else}
  <div class="operator-page">
    {#if error}
      <div class="error-banner">{error}</div>
    {/if}

    <!-- Session Control Bar -->
    <div class="session-bar">
      <div class="session-info">
        {#if activeSession}
          <span class="session-badge active"><CircleDot size={14} /> Sesi Aktif: <strong>{activeSession.sessionId}</strong></span>
          <button class="btn btn-secondary" onclick={handleStopSession} disabled={sessionLoading}>
            {$t('operator.stop_session')}
          </button>
        {:else}
          <span class="session-badge inactive"><Circle size={14} /> {$t('operator.no_session')}</span>
          <button class="btn btn-primary" onclick={handleStartSession} disabled={sessionLoading}>
            {$t('operator.start_session')}
          </button>
        {/if}
      </div>
      <div class="part-selector">
        <label class="label" for="partSelect">{$t('operator.select_part')}</label>
        <select id="partSelect" class="select" bind:value={selectedPartId}>
          {#each parts as part}
            <option value={part.id}>{part.partCode} — {part.partName}</option>
          {/each}
        </select>
      </div>
    </div>

    <!-- Main Content -->
    <div class="inspect-grid">
      <!-- Left: Camera Feed -->
      <div class="camera-section">
        <div class="section-label">{$t('operator.live_camera')}</div>
        
        {#if inspectionMode === 'local'}
          <!-- Local Mode: CV Camera Feed -->
          <div class="camera-feed">
            <div class="camera-placeholder">
              <img 
                src={CV_STREAM_URL} 
                alt="CV Camera Feed"
                class="camera-video"
                onerror={(e) => { e.target.style.display='none'; e.target.nextElementSibling.style.display='flex'; }}
                onload={(e) => { e.target.style.display='block'; e.target.nextElementSibling.style.display='none'; }}
              />
              <!-- Bounding Box Overlay Canvas -->
              {#if detections.objects && detections.objects.length > 0}
                <svg class="bbox-overlay" viewBox="0 0 {videoStreamSize.width} {videoStreamSize.height}" preserveAspectRatio="none">
                  <defs>
                    <!-- Define filters for glow effects -->
                    <filter id="glow">
                      <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                      <feMerge>
                        <feMergeNode in="coloredBlur"/>
                        <feMergeNode in="SourceGraphic"/>
                      </feMerge>
                    </filter>
                  </defs>
                  
                  {#each detections.objects as obj, i}
                    {@const result = detections.results[i]}
                    {@const status = result?.status || 'NO REF'}
                    {@const matchedRef = result?.matched_ref || null}
                    {@const color = status === 'GOOD' ? '#32DC32' : status === 'NO GOOD' ? '#2828DC' : '#FFA500'}
                    {@const yellowColor = '#00D2FF'}
                    {@const purpleColor = '#C832C8'}
                    {@const tealColor = '#78DCB4'}
                    
                    <!-- Contour (teal outline) -->
                    {#if obj.contour && obj.contour.length > 0}
                      <polyline
                        points="{obj.contour.map(p => `${p[0][0]},${p[0][1]}`).join(' ')}"
                        fill="none"
                        stroke={tealColor}
                        stroke-width="1"
                        opacity="0.8"
                      />
                    {/if}
                    
                    <!-- Main Bounding Box -->
                    {#if obj.shape === 'circle'}
                      <!-- Circle with radius -->
                      <circle
                        cx={obj.center[0]}
                        cy={obj.center[1]}
                        r={obj.radius_px}
                        fill="none"
                        stroke={color}
                        stroke-width="2"
                        opacity="0.9"
                      />
                      
                      <!-- Diameter dimension line -->
                      {@const cx = obj.center[0]}
                      {@const cy = obj.center[1]}
                      {@const r = obj.radius_px}
                      {@const offset = 28}
                      
                      <!-- Horizontal diameter line with arrows -->
                      <line x1={cx - r} y1={cy - offset} x2={cx + r} y2={cy - offset} stroke={yellowColor} stroke-width="1" />
                      <line x1={cx - r} y1={cy} x2={cx - r} y2={cy - offset} stroke={yellowColor} stroke-width="1" />
                      <line x1={cx + r} y1={cy} x2={cx + r} y2={cy - offset} stroke={yellowColor} stroke-width="1" />
                      
                      <!-- Arrow heads -->
                      <polygon points="{cx - r},{cy - offset} {cx - r - 6},{cy - offset - 6} {cx - r - 6},{cy - offset + 6}" fill={yellowColor} />
                      <polygon points="{cx + r},{cy - offset} {cx + r + 6},{cy - offset - 6} {cx + r + 6},{cy - offset + 6}" fill={yellowColor} />
                      
                      <!-- Dimension text with background -->
                      <rect x={cx - 30} y={cy - offset - 20} width="60" height="16" fill="#121212" opacity="0.8" rx="2" />
                      <text x={cx} y={cy - offset - 8} fill={yellowColor} font-size="14" font-weight="bold" text-anchor="middle" font-family="Arial">
                        Ø{obj.diameter_mm.toFixed(1)}mm
                      </text>
                      
                      {@const topY = cy - r - 14}
                      
                      <!-- Object label with background -->
                      <rect x={obj.bbox[0] - 5} y={topY - 18} width="150" height="16" fill="#141414" opacity="0.8" rx="2" />
                      <text x={obj.bbox[0]} y={topY - 6} fill={color} font-size="14" font-weight="bold" font-family="Arial">
                        #{i+1} {obj.shape.toUpperCase()}
                      </text>
                      
                      <!-- Status label with background -->
                      {@const statusText = matchedRef ? `${status}  [${matchedRef}]` : status}
                      <rect x={obj.bbox[0] - 5} y={topY - 38} width="{statusText.length * 8 + 10}" height="18" fill="#141414" opacity="0.8" rx="2" />
                      <text x={obj.bbox[0]} y={topY - 24} fill={color} font-size="16" font-weight="bold" font-family="Arial">
                        {statusText}
                      </text>
                    {:else}
                      <!-- Rotated Rectangle Bounding Box -->
                      {#if obj.rot_box && obj.rot_box.length === 4}
                        <polygon
                          points="{obj.rot_box.map(p => `${p[0]},${p[1]}`).join(' ')}"
                          fill="none"
                          stroke={color}
                          stroke-width="2"
                          opacity="0.9"
                        />
                        
                        <!-- Dimension lines -->
                        {@const box = obj.rot_box}
                        {@const dist = (p1, p2) => Math.sqrt((p2[0]-p1[0])**2 + (p2[1]-p1[1])**2)}
                        {@const sa = dist(box[0], box[1])}
                        {@const sb = dist(box[1], box[2])}
                        {@const [lp1, lp2, sp1, sp2] = sa >= sb ? [box[0], box[1], box[1], box[2]] : [box[1], box[2], box[0], box[1]]}
                        {@const offset = 28}
                        
                        <!-- Width dimension line (yellow) -->
                        {@const dx1 = lp2[0] - lp1[0]}
                        {@const dy1 = lp2[1] - lp1[1]}
                        {@const len1 = Math.sqrt(dx1*dx1 + dy1*dy1)}
                        {@const nx1 = -dy1 / len1 * offset}
                        {@const ny1 = dx1 / len1 * offset}
                        {@const op1_1 = [lp1[0] + nx1, lp1[1] + ny1]}
                        {@const op1_2 = [lp2[0] + nx1, lp2[1] + ny1]}
                        {@const mid1 = [(op1_1[0] + op1_2[0])/2, (op1_1[1] + op1_2[1])/2]}
                        
                        <line x1={lp1[0]} y1={lp1[1]} x2={op1_1[0]} y2={op1_1[1]} stroke={yellowColor} stroke-width="1" />
                        <line x1={lp2[0]} y1={lp2[1]} x2={op1_2[0]} y2={op1_2[1]} stroke={yellowColor} stroke-width="1" />
                        <line x1={op1_1[0]} y1={op1_1[1]} x2={op1_2[0]} y2={op1_2[1]} stroke={yellowColor} stroke-width="1" />
                        
                        <!-- Width text -->
                        <rect x={mid1[0] - 30} y={mid1[1] - 18} width="60" height="16" fill="#121212" opacity="0.8" rx="2" />
                        <text x={mid1[0]} y={mid1[1] - 6} fill={yellowColor} font-size="14" font-weight="bold" text-anchor="middle" font-family="Arial">
                          {obj.width_mm.toFixed(1)}mm
                        </text>
                        
                        <!-- Height dimension line (purple) -->
                        {@const dx2 = sp2[0] - sp1[0]}
                        {@const dy2 = sp2[1] - sp1[1]}
                        {@const len2 = Math.sqrt(dx2*dx2 + dy2*dy2)}
                        {@const nx2 = -dy2 / len2 * offset}
                        {@const ny2 = dx2 / len2 * offset}
                        {@const op2_1 = [sp1[0] + nx2, sp1[1] + ny2]}
                        {@const op2_2 = [sp2[0] + nx2, sp2[1] + ny2]}
                        {@const mid2 = [(op2_1[0] + op2_2[0])/2, (op2_1[1] + op2_2[1])/2]}
                        
                        <line x1={sp1[0]} y1={sp1[1]} x2={op2_1[0]} y2={op2_1[1]} stroke={purpleColor} stroke-width="1" />
                        <line x1={sp2[0]} y1={sp2[1]} x2={op2_2[0]} y2={op2_2[1]} stroke={purpleColor} stroke-width="1" />
                        <line x1={op2_1[0]} y1={op2_1[1]} x2={op2_2[0]} y2={op2_2[1]} stroke={purpleColor} stroke-width="1" />
                        
                        <!-- Height text -->
                        <rect x={mid2[0] - 30} y={mid2[1] - 18} width="60" height="16" fill="#121212" opacity="0.8" rx="2" />
                        <text x={mid2[0]} y={mid2[1] - 6} fill={purpleColor} font-size="14" font-weight="bold" text-anchor="middle" font-family="Arial">
                          {obj.height_mm.toFixed(1)}mm
                        </text>
                      {/if}
                      
                      {@const topY = obj.bbox[1] - 14}
                      
                      <!-- Object label with background -->
                      <rect x={obj.bbox[0] - 5} y={topY - 18} width="180" height="16" fill="#141414" opacity="0.8" rx="2" />
                      <text x={obj.bbox[0]} y={topY - 6} fill={color} font-size="14" font-weight="bold" font-family="Arial">
                        #{i+1} {obj.shape.toUpperCase()} {obj.width_mm.toFixed(1)}×{obj.height_mm.toFixed(1)}mm
                      </text>
                      
                      <!-- Status label with background -->
                      {@const statusText = matchedRef ? `${status}  [${matchedRef}]` : status}
                      <rect x={obj.bbox[0] - 5} y={topY - 38} width="{statusText.length * 8 + 10}" height="18" fill="#141414" opacity="0.8" rx="2" />
                      <text x={obj.bbox[0]} y={topY - 24} fill={color} font-size="16" font-weight="bold" font-family="Arial">
                        {statusText}
                      </text>
                    {/if}
                  {/each}
                </svg>
              {/if}
              <div class="camera-fallback" style="display: flex;">
                <div class="camera-circle"></div>
                <div class="crosshair h"></div>
                <div class="crosshair v"></div>
                <div class="corner tl"></div>
                <div class="corner tr"></div>
                <div class="corner bl"></div>
                <div class="corner br"></div>
                {#if !inspecting && !hasResult}
                  <p class="camera-hint">{$t('operator.align_part')}</p>
                {/if}
                {#if inspecting}
                  <div class="scan-line"></div>
                {/if}
              </div>
            </div>
            <div class="camera-badge" class:connected={cvOnline}>
              <span class="dot"></span>
              {cvOnline ? 'CV Online' : 'CV Offline'}
            </div>
          </div>

          <!-- Local Mode Inspect Button -->
          <button
            class="inspect-btn"
            class:inspecting
            onclick={startInspection}
            disabled={inspecting || !selectedPartId || !activeSession || !cvOnline}
          >
            {#if inspecting}
              <span class="spinner"></span> Triggering CV...
            {:else}
              <Scan size={22} /> {$t('operator.inspect_btn')}
            {/if}
          </button>
        {:else}
          <!-- Online Mode -->
          <div style="display: {capturedImage ? 'none' : 'flex'}; flex-direction: column; flex: 1; gap: var(--sp-3);">
            {#if useIpCamera}
              <div class="camera-feed">
                <div class="camera-placeholder">
                  <img 
                    bind:this={imgElement}
                    src={ipCameraUrl}
                    alt="IP Camera Feed"
                    class="camera-video"
                    crossorigin="anonymous"
                    style="display: block;"
                    onerror={(e) => { e.target.style.display='none'; e.target.nextElementSibling.querySelector('.error-text').style.display='block'; }}
                    onload={(e) => { e.target.style.display='block'; e.target.nextElementSibling.querySelector('.error-text').style.display='none'; }}
                  />
                  <div class="camera-fallback" style="display: flex; pointer-events: none;">
                    <div class="camera-circle"></div>
                    <div class="crosshair h"></div>
                    <div class="crosshair v"></div>
                    <div class="corner tl"></div>
                    <div class="corner tr"></div>
                    <div class="corner bl"></div>
                    <div class="corner br"></div>
                    <p class="camera-hint error-text" style="display: none; color: var(--clr-ng); background: rgba(0,0,0,0.7); padding: 4px 8px; border-radius: 4px; margin-bottom: 30px;">Tidak dapat terhubung ke IP Camera</p>
                    <p class="camera-hint">Posisikan part di tengah</p>
                  </div>
                </div>
              </div>
            {:else}
              <div class="camera-feed">
                <div class="camera-placeholder">
                  <video 
                    bind:this={videoElement}
                    class="camera-video"
                    autoplay
                    playsinline
                    muted
                    style="display: block;"
                    onplaying={(e) => { e.target.style.display='block'; }}
                    onerror={(e) => { e.target.style.display='none'; }}
                  ></video>
                  <div class="camera-fallback" style="display: flex; pointer-events: none;">
                    <div class="camera-circle"></div>
                    <div class="crosshair h"></div>
                    <div class="crosshair v"></div>
                    <div class="corner tl"></div>
                    <div class="corner tr"></div>
                    <div class="corner bl"></div>
                    <div class="corner br"></div>
                    <p class="camera-hint">{$t('operator.align_part')}</p>
                  </div>
                </div>
              </div>
            {/if}

            <button
              class="inspect-btn"
              style="width: 100%; margin-top: auto;"
              onclick={capturePhoto}
              disabled={!selectedPartId || !activeSession}
            >
              <Scan size={22} /> Ambil Foto
            </button>
          </div>

          {#if capturedImage}
            <!-- Preview Mode setelah foto diambil -->
            <div class="camera-feed">
              <div class="camera-placeholder">
                <img src={capturedImage} alt="Preview" class="camera-video" style="display: block;" />
              </div>
            </div>
            
            <div style="display: flex; gap: var(--sp-3); margin-top: var(--sp-3);">
              <button
                class="btn btn-secondary"
                style="flex: 1; min-height: 64px; font-family: var(--font-heading); font-size: 1.1rem; font-weight: bold; border-radius: var(--radius-lg);"
                onclick={() => capturedImage = null}
                disabled={onlineProcessing}
              >
                Ulangi
              </button>
              <button
                class="inspect-btn"
                style="flex: 2; margin: 0;"
                class:inspecting={onlineProcessing}
                onclick={submitOnlineInspection}
                disabled={onlineProcessing}
              >
                {#if onlineProcessing}
                  <span class="spinner"></span> Mengirim...
                {:else}
                  <CheckCircle size={22} /> Kirim Inspeksi
                {/if}
              </button>
            </div>
          {/if}
        {/if}
      </div>

      <!-- Right: Results + History -->
      <div class="results-section">
        <div class="section-label">{$t('operator.result')}</div>

        {#if hasResult}
          <!-- Reference Info (jika ada) -->
          {#if referenceMatched}
            <div class="reference-info animate-fade-in">
              <div class="ref-badge">
                <Database size={14} /> Reference: <strong>{referenceMatched}</strong>
              </div>
            </div>
          {/if}

          <div class="measurements animate-fade-in">
            {#each Object.entries(measurements) as [key, val]}
              {@const deviation = deviations[key]}
              {@const hasDeviation = deviation !== undefined && deviation !== null}
              {@const isOverTolerance = hasDeviation && Math.abs(deviation) > 0.1}
              
              <div class="measure-row" class:has-deviation={hasDeviation} class:over-tolerance={isOverTolerance}>
                <span class="measure-label">{key}</span>
                <div class="measure-values">
                  <span class="measure-value">{val} mm</span>
                  {#if hasDeviation}
                    <span class="deviation" class:negative={deviation < 0} class:positive={deviation > 0}>
                      ({deviation > 0 ? '+' : ''}{deviation} mm)
                    </span>
                  {/if}
                </div>
                <span class="measure-check" class:warning={isOverTolerance}>
                  {#if isOverTolerance}
                    <AlertTriangle size={16} />
                  {:else}
                    <Check size={16} />
                  {/if}
                </span>
              </div>
            {/each}
          </div>

          <div class="status-card animate-fade-in" class:ok={resultStatus === 'OK'} class:ng={resultStatus === 'NG'}>
            <span class="status-icon">
              {#if resultStatus === 'OK'}
                <CheckCircle size={48} />
              {:else}
                <XCircle size={48} />
              {/if}
            </span>
            <span class="status-text">STATUS: {resultStatus}</span>
          </div>
        {/if}

        {#if !hasResult && !inspecting}
          <div class="no-result">
            <span class="no-result-icon"><svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg></span>
            <p>{$t('operator.waiting')}</p>
          </div>
        {/if}

        <!-- Mode Toggle -->
        <div class="mode-toggle">
          <button 
            class="mode-btn"
            class:active={inspectionMode === 'local'}
            onclick={() => switchMode('local')}
          >
            <Monitor size={18} /> Mode Lokal
          </button>
          <button 
            class="mode-btn"
            class:active={inspectionMode === 'online'}
            onclick={() => switchMode('online')}
          >
            <Smartphone size={18} /> Mode Online
          </button>
        </div>

        {#if inspectionMode === 'online'}
          <div class="online-header-row">
            <div class="online-mode-options">
              <label class="radio-option">
                <input type="radio" bind:group={useIpCamera} value={false} />
                Webcam/USB Camera
              </label>
              <label class="radio-option">
                <input type="radio" bind:group={useIpCamera} value={true} />
                IP Camera (HP)
              </label>
            </div>

            {#if useIpCamera}
              <div class="online-controls">
                <input 
                  type="text" 
                  class="input" 
                  bind:value={ipCameraUrl}
                  placeholder="URL IP Camera (contoh: http://192.168.1.100:8080/video)"
                  title="URL IP Camera"
                />
              </div>
            {:else}
              <div class="online-controls">
                <select 
                  class="select" 
                  bind:value={selectedCamera}
                  onchange={async () => await startCamera()}
                  title="Pilih Kamera"
                >
                  {#each availableCameras as camera}
                    <option value={camera.deviceId}>
                      {camera.label || `Camera ${availableCameras.indexOf(camera) + 1}`}
                    </option>
                  {/each}
                </select>
              </div>
            {/if}
          </div>
        {/if}

        <!-- Session History -->
        <div class="history-section">
          <div class="section-label">{$t('operator.session_history')} ({recentInspections.length})</div>
          <div class="history-list">
            {#each recentInspections as item (item.id)}
              <button class="history-row" onclick={() => openDetailModal(item)}>
                <span class="history-id">#{item.id}</span>
                <span class="history-part">{item.part}</span>
                <span class="badge" class:badge-ok={item.status === 'OK'} class:badge-ng={item.status === 'NG'}>
                  {item.status}
                </span>
                <span class="history-time">{item.time}</span>
              </button>
            {/each}
            {#if recentInspections.length === 0}
              <p class="no-data-text">{$t('common.no_data')}</p>
            {/if}
          </div>
        </div>
      </div>
    </div>

    <!-- Status Bar -->
    <div class="status-bar">
      <span class="status-item">
        <span class="dot" class:connected={cvOnline}></span>
        {cvOnline ? 'CV Online' : 'CV Offline'}
        {#if cvLastSeen}
          <span style="font-size: 10px; opacity: 0.7;">({Math.floor((Date.now() - cvLastSeen) / 1000)}s ago)</span>
        {/if}
      </span>
      <span class="status-item">{$t('operator.inspected_today')}: <strong>{todayInspected}</strong></span>
      <span class="status-item">NG: <strong>{todayNg}</strong> ({todayInspected > 0 ? ((todayNg/todayInspected)*100).toFixed(1) : 0}%)</span>
      <span class="status-item">Part: <strong>{getSelectedPartCode()}</strong></span>
    </div>
  </div>
{/if}

<style>
  .loading-page {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--sp-4);
    color: var(--clr-text-muted);
    min-height: 60vh;
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
  .error-banner {
    padding: var(--sp-3) var(--sp-4);
    background: var(--clr-ng-bg);
    color: var(--clr-ng);
    border: 1px solid var(--clr-ng-border);
    border-radius: var(--radius-md);
    font-size: var(--fs-sm);
    margin: var(--sp-3) var(--sp-4) 0;
  }
  .no-data-text {
    color: var(--clr-text-dim);
    font-size: var(--fs-sm);
    padding: var(--sp-4);
    text-align: center;
  }

  .session-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--sp-4);
    padding: var(--sp-4) var(--sp-5);
    background: var(--clr-surface);
    border-bottom: 2px solid var(--clr-border);
    flex-wrap: wrap;
  }
  .session-info {
    display: flex;
    align-items: center;
    gap: var(--sp-3);
  }
  .session-badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: var(--fs-base);
    font-weight: var(--fw-medium);
  }
  .session-badge.active { color: var(--clr-ok); }
  .session-badge.inactive { color: var(--clr-text-dim); }
  .part-selector {
    display: flex;
    align-items: center;
    gap: var(--sp-2);
  }
  .part-selector .select {
    width: auto;
    min-width: 220px;
    min-height: 48px;
    font-size: var(--fs-md);
  }
  .part-selector .label {
    margin-bottom: 0;
    white-space: nowrap;
  }

  .operator-page {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow-y: auto;
    min-height: 0;
  }
  .inspect-grid {
    display: grid;
    grid-template-columns: 3fr 2fr;
    gap: var(--sp-5);
    padding: var(--sp-5);
    min-height: calc(100vh - 200px);
    max-height: calc(100vh - 200px);
  }
  .section-label {
    font-family: var(--font-heading);
    font-size: var(--fs-xs);
    font-weight: var(--fw-semibold);
    color: var(--clr-text-muted);
    text-transform: uppercase;
    letter-spacing: 1px;
    margin-bottom: var(--sp-3);
  }

  .camera-section {
    display: flex;
    flex-direction: column;
    gap: var(--sp-3);
    min-height: 0;
    max-height: 100%;
  }
  .camera-feed { 
    position: relative;
    flex: 1;
    min-height: 0;
    max-height: 100%;
    display: flex;
    flex-direction: column;
  }
  .camera-placeholder {
    width: 100%;
    aspect-ratio: 16 / 9;
    height: auto;
    border: 2px solid var(--clr-border);
    border-radius: var(--radius-lg);
    position: relative;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: var(--shadow-card);
    background:
      radial-gradient(circle at center, rgba(0,51,153,0.03) 0%, transparent 70%),
      var(--clr-surface);
  }
  .camera-video {
    width: 100%;
    height: 100%;
    object-fit: fill;
    display: none;
  }
  .bbox-overlay {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 10;
  }
  .camera-fallback {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .camera-circle {
    width: 120px;
    height: 120px;
    border: 2px dashed var(--clr-border-light);
    border-radius: 50%;
    animation: pulse 3s infinite;
  }
  .crosshair {
    position: absolute;
    background: rgba(0,51,153,0.15);
  }
  .crosshair.h { width: 100%; height: 1px; top: 50%; }
  .crosshair.v { width: 1px; height: 100%; left: 50%; }
  .corner {
    position: absolute;
    width: 24px;
    height: 24px;
    border-color: var(--clr-accent);
    border-style: solid;
  }
  .corner.tl { top: 16px; left: 16px; border-width: 3px 0 0 3px; }
  .corner.tr { top: 16px; right: 16px; border-width: 3px 3px 0 0; }
  .corner.bl { bottom: 16px; left: 16px; border-width: 0 0 3px 3px; }
  .corner.br { bottom: 16px; right: 16px; border-width: 0 3px 3px 0; }
  .camera-hint {
    position: absolute;
    bottom: 16px;
    font-size: var(--fs-sm);
    color: var(--clr-text-dim);
  }
  .scan-line {
    position: absolute;
    left: 0;
    right: 0;
    height: 2px;
    background: linear-gradient(90deg, transparent, var(--clr-accent), transparent);
    animation: scanDown 1.5s ease-in-out infinite;
  }
  @keyframes scanDown {
    0% { top: 0; }
    50% { top: 100%; }
    100% { top: 0; }
  }
  .camera-badge {
    position: absolute;
    top: var(--sp-3);
    right: var(--sp-3);
    display: flex;
    align-items: center;
    gap: var(--sp-1);
    padding: 2px var(--sp-2);
    background: var(--clr-surface-2);
    border-radius: var(--radius-full);
    font-size: var(--fs-xs);
    color: var(--clr-text-muted);
  }
  .dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--clr-ng);
  }
  .dot.connected, .camera-badge.connected .dot {
    background: var(--clr-ok);
    box-shadow: 0 0 6px var(--clr-ok);
  }

  /* Inspect Button - XL touch target for factory operators */
  .inspect-btn {
    padding: 20px var(--sp-12);
    font-family: var(--font-heading);
    font-size: 1.35rem;
    font-weight: var(--fw-bold);
    color: #fff;
    background: var(--clr-accent);
    border: none;
    border-radius: var(--radius-lg);
    cursor: pointer;
    transition: all var(--transition-base);
    letter-spacing: 1.5px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--sp-3);
    min-height: 64px;
  }
  .inspect-btn:hover:not(:disabled) {
    background: var(--clr-accent-hover);
    transform: translateY(-2px);
    box-shadow: var(--shadow-glow-accent);
  }
  .inspect-btn:active:not(:disabled) {
    transform: scale(0.97);
  }
  .inspect-btn:disabled {
    opacity: 0.7;
    cursor: wait;
  }
  .inspect-btn.inspecting {
    background: var(--clr-accent-hover);
  }
  .spinner {
    display: inline-block;
    width: 20px;
    height: 20px;
    border: 3px solid rgba(255,255,255,0.3);
    border-top-color: #fff;
    border-radius: 50%;
    animation: spin 0.6s linear infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }

  /* Results */
  .results-section {
    display: flex;
    flex-direction: column;
    gap: var(--sp-3);
    min-height: 0;
    max-height: 100%;
    overflow-y: auto;
  }
  
  .reference-info {
    padding: var(--sp-3);
    background: var(--clr-surface);
    border: 1px solid var(--clr-accent);
    border-radius: var(--radius-md);
    margin-bottom: var(--sp-2);
  }
  
  .ref-badge {
    display: flex;
    align-items: center;
    gap: var(--sp-2);
    font-size: var(--fs-sm);
    color: var(--clr-accent);
  }
  
  .measurements {
    display: flex;
    flex-direction: column;
    gap: var(--sp-2);
  }
  .measure-row {
    display: flex;
    align-items: center;
    padding: var(--sp-3) var(--sp-4);
    background: var(--clr-surface);
    border: 1px solid var(--clr-border);
    border-radius: var(--radius-md);
    gap: var(--sp-3);
    transition: all 0.2s ease;
  }
  
  .measure-row.over-tolerance {
    border-color: var(--clr-warning);
    background: rgba(251, 191, 36, 0.05);
  }
  
  .measure-label {
    flex: 1;
    font-size: var(--fs-sm);
    color: var(--clr-text-muted);
    text-transform: capitalize;
  }
  
  .measure-values {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: var(--sp-1);
  }
  
  .measure-value {
    font-family: var(--font-heading);
    font-size: var(--fs-xl);
    font-weight: var(--fw-bold);
    font-variant-numeric: tabular-nums;
  }
  
  .deviation {
    font-size: var(--fs-xs);
    font-weight: var(--fw-semibold);
    font-family: 'Courier New', monospace;
  }
  
  .deviation.positive {
    color: var(--clr-warning);
  }
  
  .deviation.negative {
    color: var(--clr-ng);
  }
  
  .measure-check {
    color: var(--clr-ok);
    font-size: var(--fs-lg);
  }
  
  .measure-check.warning {
    color: var(--clr-warning);
    animation: pulse 2s infinite;
  }

  /* Status Card */
  .status-card {
    padding: var(--sp-6);
    border-radius: var(--radius-lg);
    text-align: center;
    font-family: var(--font-heading);
    font-size: var(--fs-3xl);
    font-weight: var(--fw-bold);
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--sp-3);
    letter-spacing: 3px;
  }
  .status-card.ok {
    background: var(--clr-ok-bg);
    color: var(--clr-ok);
    border: 2px solid var(--clr-ok-border);
  }
  .status-card.ng {
    background: var(--clr-ng-bg);
    color: var(--clr-ng);
    border: 2px solid var(--clr-ng-border);
    animation: blink 1s ease infinite;
  }
  .status-icon { font-size: var(--fs-3xl); }

  .no-result {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: var(--sp-12);
    color: var(--clr-text-dim);
    gap: var(--sp-3);
  }
  .no-result-icon { display: flex; opacity: 0.5; }

  /* History */
  .history-section {
    margin-top: auto;
    display: flex;
    flex-direction: column;
    min-height: 0;
    overflow: hidden;
  }
  .history-list {
    display: flex;
    flex-direction: column;
    gap: var(--sp-1);
    overflow-y: auto;
    max-height: 300px;
    padding-right: var(--sp-1);
  }
  .history-list::-webkit-scrollbar {
    width: 6px;
  }
  .history-list::-webkit-scrollbar-track {
    background: var(--clr-surface);
    border-radius: var(--radius-sm);
  }
  .history-list::-webkit-scrollbar-thumb {
    background: var(--clr-border);
    border-radius: var(--radius-sm);
  }
  .history-list::-webkit-scrollbar-thumb:hover {
    background: var(--clr-text-dim);
  }
  .history-row {
    display: flex;
    align-items: center;
    gap: var(--sp-3);
    padding: var(--sp-2) var(--sp-3);
    background: var(--clr-surface);
    border: 1px solid var(--clr-border);
    border-radius: var(--radius-sm);
    font-size: var(--fs-sm);
    cursor: pointer;
    transition: all 0.2s;
    width: 100%;
    text-align: left;
  }
  .history-row:hover {
    background: var(--clr-surface-2);
    border-color: var(--clr-accent);
    transform: translateX(4px);
  }
  .history-id {
    font-weight: var(--fw-semibold);
    color: var(--clr-text-muted);
    min-width: 40px;
  }
  .history-part { flex: 1; }
  .history-time { color: var(--clr-text-dim); font-size: var(--fs-xs); }

  /* Status Bar */
  .status-bar {
    display: flex;
    align-items: center;
    gap: var(--sp-6);
    padding: var(--sp-3) var(--sp-6);
    background: var(--clr-surface);
    border-top: 1px solid var(--clr-border);
    font-size: var(--fs-xs);
    color: var(--clr-text-muted);
  }
  .status-item {
    display: flex;
    align-items: center;
    gap: var(--sp-2);
  }

  /* NG Overlay */
  .ng-overlay {
    position: fixed;
    inset: 0;
    z-index: 1000;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(239,68,68,0.95);
  }
  .ng-content {
    max-width: 600px;
    width: 90%;
    text-align: center;
  }
  .ng-header-bar {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--sp-2);
    font-size: var(--fs-2xl);
    font-weight: var(--fw-bold);
    color: #fff;
    margin-bottom: var(--sp-6);
    letter-spacing: 2px;
  }
  .ng-body { color: #fff; }
  .ng-big-text {
    font-size: 6rem;
    font-weight: var(--fw-bold);
    letter-spacing: 16px;
    animation: blink 0.8s ease infinite;
    margin-bottom: var(--sp-4);
    text-shadow: 0 0 40px rgba(255,255,255,0.5);
  }
  .ng-alarm {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--sp-2);
    font-size: var(--fs-lg);
    margin-bottom: var(--sp-6);
    opacity: 0.9;
  }
  .sop-box {
    text-align: left;
    background: rgba(0,0,0,0.2);
    padding: var(--sp-5);
    border-radius: var(--radius-lg);
    margin-bottom: var(--sp-6);
    line-height: 2;
  }
  .sop-title {
    font-weight: var(--fw-semibold);
    margin-bottom: var(--sp-2);
    font-size: var(--fs-md);
  }
  .confirm-btn {
    background: #fff;
    color: var(--clr-ng);
    border: none;
    font-size: var(--fs-lg);
    font-weight: var(--fw-bold);
    padding: 20px var(--sp-12);
    min-height: 64px;
  }
  .confirm-btn:hover {
    background: #f0f0f0;
    box-shadow: none;
  }

  @media (max-width: 1024px) {
    .inspect-grid { 
      grid-template-columns: 1fr;
      grid-template-rows: auto;
      height: auto;
      min-height: auto;
      max-height: none;
    }
    .camera-section {
      max-height: none;
      min-height: auto;
    }
    .results-section {
      max-height: none;
      min-height: auto;
      overflow-y: visible;
    }
    .history-section {
      min-height: auto;
      max-height: none;
      overflow: visible;
      margin-top: var(--sp-4);
    }
    .history-list { 
      max-height: 350px; 
      overflow-y: auto;
    }
    .camera-placeholder { 
      height: auto; 
      min-height: auto; 
    }
  }

  @media (max-width: 768px) {
    .session-bar {
      flex-direction: column;
      align-items: stretch;
      gap: var(--sp-3);
      padding: var(--sp-3);
    }
    .session-info {
      justify-content: space-between;
      width: 100%;
    }
    .part-selector {
      width: 100%;
      flex-direction: column;
      align-items: stretch;
      gap: var(--sp-1);
    }
    .part-selector .select {
      width: 100%;
      min-width: 0;
      min-height: 44px;
    }
    .inspect-grid {
      padding: var(--sp-3);
      gap: var(--sp-4);
    }
  }
  
  @media (max-height: 768px) and (min-width: 1025px) {
    .session-bar {
      padding: var(--sp-2) var(--sp-4);
    }
    .inspect-grid {
      padding: var(--sp-3);
      gap: var(--sp-3);
    }
    .camera-placeholder { min-height: 200px; }
    .history-list { max-height: 150px; }
    .inspect-btn {
      min-height: 48px;
      padding: 12px var(--sp-8);
      font-size: 1.1rem;
    }
  }

  /* Mode Toggle */
  .mode-toggle {
    display: flex;
    gap: 8px;
    margin-bottom: var(--sp-3);
  }

  .mode-btn {
    flex: 1;
    padding: 12px 16px;
    font-size: 14px;
    font-weight: var(--fw-semibold);
    background: var(--clr-surface);
    border: 2px solid var(--clr-border);
    border-radius: var(--radius-md);
    cursor: pointer;
    transition: all 0.2s;
  }

  .mode-btn:hover {
    background: var(--clr-surface-2);
  }

  .mode-btn.active {
    background: var(--clr-accent);
    color: white;
    border-color: var(--clr-accent);
  }

  /* Online Header Row — radio + dropdown side-by-side */
  .online-header-row {
    display: flex;
    gap: 12px;
    align-items: center;
    margin-bottom: var(--sp-3);
  }
  .online-mode-options {
    display: flex;
    gap: 16px;
    align-items: center;
    padding: 0 16px;
    min-height: 44px;
    background: var(--clr-surface);
    border: 1px solid var(--clr-border);
    border-radius: var(--radius-md);
    white-space: nowrap;
  }

  .radio-option {
    display: flex;
    align-items: center;
    gap: var(--sp-2);
    cursor: pointer;
    font-size: var(--fs-sm);
  }

  .radio-option input[type="radio"] {
    cursor: pointer;
  }

  .online-controls {
    flex: 1;
    display: flex;
    align-items: center;
  }
  .online-controls .select,
  .online-controls .input {
    width: 100%;
    margin-bottom: 0;
    min-height: 44px;
    padding: 10px 12px;
    font-size: 14px;
    border: 1px solid var(--clr-border);
    border-radius: var(--radius-md);
  }

  /* Detail Modal */
  .modal-overlay {
    position: fixed;
    inset: 0;
    z-index: 999;
    background: rgba(0, 0, 0, 0.75);
    display: flex;
    align-items: center;
    justify-content: center;
    animation: fadeIn 0.2s ease;
    padding: var(--sp-4);
  }
  
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  
  .modal-card {
    background: var(--clr-bg);
    border: 2px solid var(--clr-border);
    border-radius: var(--radius-lg);
    max-width: 700px;
    width: 100%;
    max-height: 90vh;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    animation: slideUp 0.3s ease;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  }
  
  @keyframes slideUp {
    from { transform: translateY(20px); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
  }
  
  .modal-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    padding: var(--sp-5);
    border-bottom: 2px solid var(--clr-border);
    background: var(--clr-surface);
  }
  
  .modal-header h3 {
    font-family: var(--font-heading);
    font-size: var(--fs-xl);
    font-weight: var(--fw-bold);
    margin: 0;
    color: var(--clr-text);
  }
  
  .modal-subtitle {
    font-size: var(--fs-sm);
    color: var(--clr-text-muted);
    margin: var(--sp-1) 0 0 0;
  }
  
  .modal-close {
    background: none;
    border: none;
    color: var(--clr-text-muted);
    cursor: pointer;
    padding: var(--sp-1);
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: var(--radius-sm);
    transition: all 0.2s;
  }
  
  .modal-close:hover {
    background: var(--clr-surface-2);
    color: var(--clr-text);
  }
  
  .modal-body {
    padding: var(--sp-5);
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: var(--sp-4);
  }
  
  .detail-status {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--sp-3);
    padding: var(--sp-4);
    border-radius: var(--radius-md);
    font-family: var(--font-heading);
    font-size: var(--fs-2xl);
    font-weight: var(--fw-bold);
    letter-spacing: 2px;
  }
  
  .detail-status.ok {
    background: var(--clr-ok-bg);
    color: var(--clr-ok);
    border: 2px solid var(--clr-ok-border);
  }
  
  .detail-status.ng {
    background: var(--clr-ng-bg);
    color: var(--clr-ng);
    border: 2px solid var(--clr-ng-border);
  }
  
  .detail-meta {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: var(--sp-3);
    padding: var(--sp-4);
    background: var(--clr-surface);
    border: 1px solid var(--clr-border);
    border-radius: var(--radius-md);
  }
  
  .meta-item {
    display: flex;
    flex-direction: column;
    gap: var(--sp-1);
  }
  
  .meta-label {
    font-size: var(--fs-xs);
    color: var(--clr-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  
  .meta-value {
    font-size: var(--fs-base);
    font-weight: var(--fw-semibold);
    color: var(--clr-text);
  }
  
  .measurements-table {
    display: flex;
    flex-direction: column;
    border: 1px solid var(--clr-border);
    border-radius: var(--radius-md);
    overflow: hidden;
  }
  
  .table-header,
  .table-row {
    display: grid;
    grid-template-columns: 1.2fr 1fr 1fr 1fr;
    gap: var(--sp-2);
    padding: var(--sp-3);
    align-items: center;
  }
  
  .table-header {
    background: var(--clr-surface);
    font-size: var(--fs-xs);
    font-weight: var(--fw-bold);
    color: var(--clr-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    border-bottom: 2px solid var(--clr-border);
  }
  
  .table-row {
    background: var(--clr-bg);
    font-size: var(--fs-sm);
    border-bottom: 1px solid var(--clr-border-light);
    transition: background 0.2s;
  }
  
  .table-row:last-child {
    border-bottom: none;
  }
  
  .table-row:hover {
    background: var(--clr-surface);
  }
  
  .table-row.deviation-alert {
    background: rgba(239, 68, 68, 0.05);
  }
  
  .col-dimension {
    font-weight: var(--fw-semibold);
  }
  
  .col-actual {
    font-family: var(--font-heading);
    font-weight: var(--fw-bold);
    color: var(--clr-accent);
    font-variant-numeric: tabular-nums;
  }
  
  .col-reference {
    font-family: var(--font-heading);
    font-variant-numeric: tabular-nums;
  }
  
  .col-deviation {
    font-family: var(--font-heading);
    font-weight: var(--fw-bold);
    font-variant-numeric: tabular-nums;
    color: var(--clr-text-muted);
  }
  
  .col-deviation.positive {
    color: var(--clr-ng);
  }
  
  .tolerance-badge {
    padding: var(--sp-3) var(--sp-4);
    border-radius: var(--radius-md);
    text-align: center;
    font-weight: var(--fw-semibold);
    font-size: var(--fs-sm);
  }
  
  .tolerance-badge.within {
    background: var(--clr-ok-bg);
    color: var(--clr-ok);
    border: 1px solid var(--clr-ok-border);
  }
  
  .tolerance-badge:not(.within) {
    background: var(--clr-ng-bg);
    color: var(--clr-ng);
    border: 1px solid var(--clr-ng-border);
  }
  
  .loading-detail {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: var(--sp-12);
    gap: var(--sp-3);
    color: var(--clr-text-muted);
  }
</style>

