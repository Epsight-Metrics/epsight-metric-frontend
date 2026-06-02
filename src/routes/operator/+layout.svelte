<script>
  import Header from "$lib/components/shared/Header.svelte";
  import { t } from "$lib/i18n.js";
  import { page } from '$app/stores';
  import { Camera, Sliders, Database } from '@lucide/svelte';

  let { children } = $props();
  
  let currentPath = $derived($page.url.pathname);
  let isInspect = $derived(currentPath === '/operator' || currentPath === '/operator/');
  let isCalibration = $derived(currentPath.includes('/calibration'));
  let isReferences = $derived(currentPath.includes('/references'));
</script>

<div class="operator-layout">
  <Header role="operator" title={$t("nav.live_inspect")} />
  
  <nav class="sub-nav">
    <a href="/operator" class="nav-item" class:active={isInspect}>
      <Camera size={18} /> Inspeksi
    </a>
    <a href="/operator/calibration" class="nav-item" class:active={isCalibration}>
      <Sliders size={18} /> Kalibrasi
    </a>
    <a href="/operator/references" class="nav-item" class:active={isReferences}>
      <Database size={18} /> Reference
    </a>
  </nav>
  
  <main class="operator-main">
    {@render children()}
  </main>
</div>

<style>
  .operator-layout {
    height: 100vh;
    display: flex;
    flex-direction: column;
    background: var(--clr-bg);
    overflow: hidden;
  }
  
  .sub-nav {
    display: flex;
    gap: var(--sp-2);
    padding: var(--sp-3) var(--sp-5);
    background: var(--clr-surface);
    border-bottom: 2px solid var(--clr-border);
  }
  
  .nav-item {
    display: flex;
    align-items: center;
    gap: var(--sp-2);
    padding: var(--sp-2) var(--sp-4);
    font-size: var(--fs-sm);
    font-weight: var(--fw-medium);
    color: var(--clr-text-muted);
    text-decoration: none;
    border-radius: var(--radius-md);
    transition: all var(--transition-base);
  }
  
  .nav-item:hover {
    background: var(--clr-surface-2);
    color: var(--clr-text);
  }
  
  .nav-item.active {
    background: var(--clr-accent);
    color: white;
  }
  
  .operator-main {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    min-height: 0;
  }
</style>
