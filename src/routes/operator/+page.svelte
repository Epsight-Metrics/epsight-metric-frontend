<script>
  import { t } from '$lib/i18n.js';
  import { Scan, AlertTriangle, Volume2, ClipboardList, CheckCircle, CircleDot, Circle, Check } from '@lucide/svelte';
  import { onMount, onDestroy } from 'svelte';
  import { getSession, startSession, stopSession, submitInspection, getParts } from '$lib/api/operator.js';
  import { connectSSE } from '$lib/api/notifications.js';

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
  let selectedPartId = $state(null);
  let parts = $state([]);
  let recentInspections = $state([]);
  let todayInspected = $state(0);
  let todayNg = $state(0);
  let cvLastSeen = $state(null);
  let eventSource = null;

  // Mode Online state
  let inspectionMode = $state('local');
  let videoElement = $state(null);
  let stream = $state(null);
  let capturedImage = $state(null);
  let onlineProcessing = $state(false);
  let referenceName = $state('');
  let availableCameras = $state([]);
  let selectedCamera = $state('');

  // Derived state untuk status CV online/offline
  let cvOnline = $derived(cvLastSeen && (Date.now() - cvLastSeen) < 60_000);

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
    };
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
      const devices = await navigator.mediaDevices.enumerateDevices();
      availableCameras = devices.filter(device => device.kind === 'videoinput');
      if (availableCameras.length > 0) {
        selectedCamera = availableCameras[availableCameras.length - 1].deviceId; // Default to last camera (usually USB)
      }
    } catch (err) {
      error = 'Gagal load daftar kamera: ' + err.message;
    }
  }

  async function startCamera() {
    try {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      
      stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          deviceId: selectedCamera ? { exact: selectedCamera } : undefined,
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      });
      
      if (videoElement) {
        videoElement.srcObject = stream;
      }
    } catch (err) {
      error = 'Gagal akses kamera: ' + err.message;
    }
  }

  function stopCamera() {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      stream = null;
    }
  }

  async function capturePhoto() {
    if (!videoElement) return;
    
    const canvas = document.createElement('canvas');
    canvas.width = 1920;
    canvas.height = 1080;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
    
    const blob = await new Promise(resolve => 
      canvas.toBlob(resolve, 'image/jpeg', 0.85)
    );
    
    capturedImage = URL.createObjectURL(blob);
  }

  async function submitOnlineInspection() {
    if (!selectedPartId || !activeSession || !referenceName || !capturedImage) {
      error = 'Pilih part dan reference terlebih dahulu';
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
      formData.append('referenceName', referenceName);

      const apiResponse = await fetch('/api/operator/inspect/online', {
        method: 'POST',
        credentials: 'include',
        body: formData
      });

      if (!apiResponse.ok) {
        const errorData = await apiResponse.json();
        throw new Error(errorData.message || 'Inspeksi gagal');
      }

      // Reset state
      capturedImage = null;
      referenceName = '';
      
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
        measurements = mapped.dimensions;
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
  });
</script>

<svelte:head>
  <title>{$t('operator.live_camera')} - EPSON QC</title>
</svelte:head>

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
        <!-- Mode Toggle -->
        <div class="mode-toggle">
          <button 
            class="mode-btn"
            class:active={inspectionMode === 'local'}
            onclick={() => switchMode('local')}
          >
            🖥️ Mode Lokal
          </button>
          <button 
            class="mode-btn"
            class:active={inspectionMode === 'online'}
            onclick={() => switchMode('online')}
          >
            📱 Mode Online
          </button>
        </div>

        <div class="section-label">{$t('operator.live_camera')}</div>
        
        {#if inspectionMode === 'local'}
          <!-- Local Mode: CV Camera Feed -->
          <div class="camera-feed">
            <div class="camera-placeholder">
              <img 
                src="http://localhost:5000/video_feed" 
                alt="CV Camera Feed"
                class="camera-video"
                onerror="this.style.display='none'; this.nextElementSibling.style.display='flex'"
                onload="this.style.display='block'; this.nextElementSibling.style.display='none'"
              />
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
          <!-- Online Mode: USB/Webcam Camera -->
          <div class="online-mode-container">
            {#if !capturedImage}
              <div class="online-controls" style="margin-bottom: var(--sp-3);">
                <label class="label">Pilih Kamera</label>
                <select 
                  class="select" 
                  bind:value={selectedCamera}
                  onchange={startCamera}
                  style="width: 100%; padding: 12px; font-size: 14px; margin-bottom: 8px;"
                >
                  {#each availableCameras as camera}
                    <option value={camera.deviceId}>
                      {camera.label || `Camera ${availableCameras.indexOf(camera) + 1}`}
                    </option>
                  {/each}
                </select>
              </div>

              <div class="camera-feed">
                <div class="camera-placeholder">
                  <video 
                    bind:this={videoElement}
                    autoplay 
                    playsinline
                    class="camera-video"
                    style="display: block;"
                  ></video>
                  <div class="camera-badge connected">
                    <span class="dot"></span>
                    Kamera Aktif
                  </div>
                </div>
              </div>
              
              <div class="online-controls">
                <input 
                  type="text" 
                  class="input" 
                  bind:value={referenceName}
                  placeholder="Nama Reference (contoh: Bearing_50mm)"
                  style="width: 100%; padding: 12px; font-size: 14px; border: 1px solid var(--clr-border); border-radius: 8px;"
                />
                <button
                  class="inspect-btn"
                  onclick={capturePhoto}
                  disabled={!selectedPartId || !activeSession || !referenceName}
                >
                  📸 Ambil Foto
                </button>
              </div>
            {:else}
              <div class="camera-feed">
                <div class="camera-placeholder">
                  <img src={capturedImage} alt="Preview" class="camera-video" style="display: block;" />
                </div>
              </div>
              
              <div class="online-actions">
                <button
                  class="inspect-btn"
                  onclick={submitOnlineInspection}
                  disabled={onlineProcessing}
                >
                  {#if onlineProcessing}
                    <span class="spinner"></span> Memproses...
                  {:else}
                    ✅ Kirim Inspeksi
                  {/if}
                </button>
                <button
                  class="btn btn-secondary"
                  onclick={() => capturedImage = null}
                  disabled={onlineProcessing}
                  style="padding: 16px 32px; font-size: 1.1rem; min-height: 56px;"
                >
                  🔄 Foto Ulang
                </button>
              </div>
            {/if}
          </div>
        {/if}
      </div>

      <!-- Right: Results + History -->
      <div class="results-section">
        <div class="section-label">{$t('operator.result')}</div>

        {#if hasResult}
          <div class="measurements animate-fade-in">
            {#each Object.entries(measurements) as [key, val]}
              <div class="measure-row">
                <span class="measure-label">{key}</span>
                <span class="measure-value">{val} mm</span>
                <span class="measure-check"><Check size={16} /></span>
              </div>
            {/each}
          </div>

          <div class="status-card animate-fade-in" class:ok={resultStatus === 'OK'} class:ng={resultStatus === 'NG'}>
            <span class="status-icon">
              {#if resultStatus === 'OK'}
                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--clr-ok)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
              {:else}
                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--clr-ng)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
              {/if}
            </span>
            <span class="status-text">STATUS: {resultStatus}</span>
          </div>
        {:else if !inspecting}
          <div class="no-result">
            <span class="no-result-icon"><svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg></span>
            <p>{$t('operator.waiting')}</p>
          </div>
        {/if}

        <!-- Session History -->
        <div class="history-section">
          <div class="section-label">{$t('operator.session_history')} ({recentInspections.length})</div>
          <div class="history-list">
            {#each recentInspections as item (item.id)}
              <div class="history-row">
                <span class="history-id">#{item.id}</span>
                <span class="history-part">{item.part}</span>
                <span class="badge" class:badge-ok={item.status === 'OK'} class:badge-ng={item.status === 'NG'}>
                  {item.status}
                </span>
                <span class="history-time">{item.time}</span>
              </div>
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
    overflow: hidden;
    min-height: 0;
  }
  .inspect-grid {
    flex: 1;
    display: grid;
    grid-template-columns: 3fr 2fr;
    gap: var(--sp-5);
    padding: var(--sp-5);
    overflow: hidden;
    min-height: 0;
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

  /* Camera */
  .camera-section {
    display: flex;
    flex-direction: column;
    gap: var(--sp-3);
    min-height: 0;
    overflow: hidden;
  }
  .camera-feed { 
    position: relative;
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
  }
  .camera-placeholder {
    flex: 1;
    width: 100%;
    min-height: 300px;
    max-height: 100%;
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
    object-fit: contain;
    display: none;
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
    overflow: hidden;
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
  }
  .measure-label {
    flex: 1;
    font-size: var(--fs-sm);
    color: var(--clr-text-muted);
    text-transform: capitalize;
  }
  .measure-value {
    font-family: var(--font-heading);
    font-size: var(--fs-xl);
    font-weight: var(--fw-bold);
    font-variant-numeric: tabular-nums;
  }
  .measure-check {
    color: var(--clr-ok);
    font-size: var(--fs-lg);
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
  }
  .history-id {
    font-weight: var(--fw-semibold);
    color: var(--clr-text-muted);
    min-width: 40px;
  }
  .history-part { flex: 1; }
  .history-time { color: var(--clr-text-dim); font-size: var(--fs-xs); }
  .from-cv { border-left: 3px solid var(--clr-accent); }
  .cv-badge {
    display: inline-block;
    padding: 0 4px;
    background: var(--clr-accent);
    color: #fff;
    border-radius: 3px;
    font-size: 9px;
    font-weight: var(--fw-bold);
    vertical-align: middle;
    margin-left: 4px;
  }
  .history-meta {
    flex: 1;
    font-size: var(--fs-xs);
    color: var(--clr-text-dim);
    display: flex;
    flex-direction: column;
    gap: 1px;
  }
  .history-session {
    font-family: 'Courier New', monospace;
    font-size: 9px;
    opacity: 0.7;
  }

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
      grid-template-rows: 1fr 1fr;
    }
    .camera-placeholder { min-height: 250px; }
    .history-list { max-height: 200px; }
  }
  
  @media (max-height: 768px) {
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

  /* Online Mode */
  .online-mode-container {
    display: flex;
    flex-direction: column;
    gap: var(--sp-3);
    flex: 1;
  }

  .online-controls {
    display: flex;
    flex-direction: column;
    gap: var(--sp-3);
  }

  .online-actions {
    display: flex;
    gap: var(--sp-3);
  }

  .online-actions button {
    flex: 1;
  }
</style>

