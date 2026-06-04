<script>
  import '../app.css';
  import { auth } from '$lib/stores/auth.js';

  import { onMount } from 'svelte';

  let { children } = $props();
  let restored = $state(false);

  onMount(async () => {
    await auth.restore();
    restored = true;
  });
</script>

{#if restored}
  {@render children()}
{:else}
  <div class="restoring-loader">
    <div class="spinner"></div>
    <p>Memulihkan sesi...</p>
  </div>
{/if}

<style>
  .restoring-loader {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    background: var(--clr-bg);
    color: var(--clr-text-muted);
    gap: var(--sp-4);
  }
  .spinner {
    width: 32px;
    height: 32px;
    border: 3px solid var(--clr-border);
    border-top-color: var(--clr-accent);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
</style>
