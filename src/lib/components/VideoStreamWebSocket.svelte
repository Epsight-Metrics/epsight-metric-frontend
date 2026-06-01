<script>
  import { onMount, onDestroy } from 'svelte';
  import { io } from 'socket.io-client';

  let {
    streamUrl = 'http://localhost:5000',
    onConnect = () => {},
    onDisconnect = () => {},
    onError = () => {},
    class: className = '',
  } = $props();

  let canvas = $state(null);
  let ctx = $state(null);
  let socket = $state(null);
  let connected = $state(false);
  let frameCount = $state(0);
  let fps = $state(0);
  let lastFrameTime = $state(0);

  function initCanvas() {
    if (!canvas) return;
    ctx = canvas.getContext('2d');
  }

  function connectWebSocket() {
    socket = io(streamUrl, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 10,
    });

    socket.on('connect', () => {
      connected = true;
      console.log('[VideoStream-WS] Connected');
      onConnect();
    });

    socket.on('disconnect', () => {
      connected = false;
      console.log('[VideoStream-WS] Disconnected');
      onDisconnect();
    });

    socket.on('frame', (data) => {
      if (!ctx || !canvas) return;

      // Convert binary data to Blob
      const blob = new Blob([data], { type: 'image/jpeg' });
      const url = URL.createObjectURL(blob);

      // Create image and draw to canvas
      const img = new Image();
      img.onload = () => {
        // Auto-resize canvas to match image
        if (canvas.width !== img.width || canvas.height !== img.height) {
          canvas.width = img.width;
          canvas.height = img.height;
        }
        
        ctx.drawImage(img, 0, 0);
        URL.revokeObjectURL(url);

        // Calculate FPS
        frameCount++;
        const now = performance.now();
        if (lastFrameTime > 0) {
          const delta = now - lastFrameTime;
          fps = Math.round(1000 / delta);
        }
        lastFrameTime = now;
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        console.error('[VideoStream-WS] Failed to decode frame');
      };
      img.src = url;
    });

    socket.on('status', (data) => {
      console.log('[VideoStream-WS] Status:', data);
    });

    socket.on('connect_error', (error) => {
      console.error('[VideoStream-WS] Connection error:', error);
      onError(error);
    });
  }

  onMount(() => {
    initCanvas();
    connectWebSocket();
  });

  onDestroy(() => {
    if (socket) {
      socket.disconnect();
      socket = null;
    }
  });
</script>

<div class="video-stream-container {className}">
  <canvas bind:this={canvas} class="video-canvas"></canvas>
  
  <div class="stream-badge" class:connected>
    <span class="dot"></span>
    {connected ? 'Connected' : 'Disconnected'}
    {#if connected && fps > 0}
      <span class="fps">• {fps} FPS</span>
    {/if}
  </div>

  {#if !connected}
    <div class="stream-overlay">
      <div class="spinner"></div>
      <p>Connecting to camera...</p>
    </div>
  {/if}
</div>

<style>
  .video-stream-container {
    position: relative;
    width: 100%;
    height: 100%;
    background: var(--clr-surface);
    border-radius: var(--radius-lg);
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .video-canvas {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }

  .stream-badge {
    position: absolute;
    top: var(--sp-3);
    right: var(--sp-3);
    display: flex;
    align-items: center;
    gap: var(--sp-1);
    padding: 4px var(--sp-2);
    background: rgba(0, 0, 0, 0.7);
    border-radius: var(--radius-full);
    font-size: var(--fs-xs);
    color: var(--clr-text-muted);
    backdrop-filter: blur(4px);
    z-index: 10;
  }

  .stream-badge.connected {
    color: var(--clr-ok);
  }

  .dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--clr-ng);
  }

  .stream-badge.connected .dot {
    background: var(--clr-ok);
    box-shadow: 0 0 6px var(--clr-ok);
    animation: pulse 2s ease-in-out infinite;
  }

  .fps {
    font-size: var(--fs-xs);
    opacity: 0.8;
  }

  .stream-overlay {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--sp-3);
    background: rgba(0, 0, 0, 0.5);
    color: var(--clr-text-muted);
    z-index: 5;
  }

  .spinner {
    width: 32px;
    height: 32px;
    border: 3px solid rgba(255, 255, 255, 0.3);
    border-top-color: var(--clr-accent);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }
</style>
