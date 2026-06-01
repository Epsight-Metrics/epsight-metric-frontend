<script>
  import { Camera, X } from '@lucide/svelte';
  
  let { onCapture, disabled = false } = $props();
  
  let videoElement = $state(null);
  let canvasElement = $state(null);
  let stream = $state(null);
  let showCamera = $state(false);
  let capturing = $state(false);
  
  async function startCamera() {
    try {
      showCamera = true;
      
      // Request camera access (prefer back camera on mobile)
      stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment', // Back camera
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      });
      
      if (videoElement) {
        videoElement.srcObject = stream;
      }
    } catch (err) {
      console.error('Camera access error:', err);
      alert('Tidak bisa akses kamera. Pastikan izin kamera sudah diberikan.');
      showCamera = false;
    }
  }
  
  function stopCamera() {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      stream = null;
    }
    showCamera = false;
  }
  
  async function capturePhoto() {
    if (!videoElement || !canvasElement) return;
    
    capturing = true;
    
    // Draw video frame to canvas
    const context = canvasElement.getContext('2d');
    canvasElement.width = videoElement.videoWidth;
    canvasElement.height = videoElement.videoHeight;
    context.drawImage(videoElement, 0, 0);
    
    // Convert canvas to blob
    canvasElement.toBlob(async (blob) => {
      if (blob && onCapture) {
        await onCapture(blob);
      }
      capturing = false;
      stopCamera();
    }, 'image/jpeg', 0.9);
  }
</script>

<button
  class="camera-btn"
  onclick={startCamera}
  disabled={disabled || showCamera}
>
  <Camera size={22} />
  Ambil Foto dari HP
</button>

{#if showCamera}
  <div class="camera-modal">
    <div class="camera-modal-content">
      <div class="camera-header">
        <h3>Ambil Foto Part</h3>
        <button class="close-btn" onclick={stopCamera}>
          <X size={24} />
        </button>
      </div>
      
      <div class="camera-preview">
        <video
          bind:this={videoElement}
          autoplay
          playsinline
          class="camera-video"
        ></video>
        
        <div class="camera-overlay">
          <div class="frame-guide"></div>
          <p class="camera-hint">Posisikan part di tengah frame</p>
        </div>
      </div>
      
      <div class="camera-actions">
        <button class="btn btn-secondary" onclick={stopCamera}>
          Batal
        </button>
        <button
          class="btn btn-primary btn-lg"
          onclick={capturePhoto}
          disabled={capturing}
        >
          {#if capturing}
            <span class="spinner"></span> Memproses...
          {:else}
            <Camera size={24} /> Ambil Foto
          {/if}
        </button>
      </div>
    </div>
  </div>
  
  <canvas bind:this={canvasElement} style="display: none;"></canvas>
{/if}

<style>
  .camera-btn {
    padding: 12px 24px;
    background: var(--clr-surface);
    border: 2px solid var(--clr-border);
    border-radius: var(--radius-md);
    font-size: var(--fs-base);
    font-weight: var(--fw-medium);
    color: var(--clr-text);
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: var(--sp-2);
    transition: all var(--transition-base);
  }
  
  .camera-btn:hover:not(:disabled) {
    background: var(--clr-accent);
    color: #fff;
    border-color: var(--clr-accent);
  }
  
  .camera-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  .camera-modal {
    position: fixed;
    inset: 0;
    z-index: 1000;
    background: rgba(0, 0, 0, 0.95);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: var(--sp-4);
  }
  
  .camera-modal-content {
    width: 100%;
    max-width: 800px;
    background: var(--clr-surface);
    border-radius: var(--radius-lg);
    overflow: hidden;
    display: flex;
    flex-direction: column;
    max-height: 90vh;
  }
  
  .camera-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--sp-4);
    border-bottom: 1px solid var(--clr-border);
  }
  
  .camera-header h3 {
    margin: 0;
    font-size: var(--fs-lg);
    font-weight: var(--fw-semibold);
  }
  
  .close-btn {
    background: none;
    border: none;
    color: var(--clr-text-muted);
    cursor: pointer;
    padding: var(--sp-2);
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: var(--radius-sm);
    transition: all var(--transition-base);
  }
  
  .close-btn:hover {
    background: var(--clr-surface-2);
    color: var(--clr-text);
  }
  
  .camera-preview {
    position: relative;
    flex: 1;
    background: #000;
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 400px;
  }
  
  .camera-video {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }
  
  .camera-overlay {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    pointer-events: none;
  }
  
  .frame-guide {
    width: 80%;
    max-width: 400px;
    aspect-ratio: 4/3;
    border: 3px dashed rgba(255, 255, 255, 0.5);
    border-radius: var(--radius-md);
  }
  
  .camera-hint {
    position: absolute;
    bottom: var(--sp-4);
    color: #fff;
    font-size: var(--fs-sm);
    background: rgba(0, 0, 0, 0.7);
    padding: var(--sp-2) var(--sp-4);
    border-radius: var(--radius-full);
  }
  
  .camera-actions {
    display: flex;
    gap: var(--sp-3);
    padding: var(--sp-4);
    border-top: 1px solid var(--clr-border);
  }
  
  .camera-actions button {
    flex: 1;
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
    to { transform: rotate(360deg); }
  }
  
  @media (max-width: 768px) {
    .camera-modal-content {
      max-width: 100%;
      max-height: 100vh;
      border-radius: 0;
    }
    
    .camera-preview {
      min-height: 60vh;
    }
  }
</style>
