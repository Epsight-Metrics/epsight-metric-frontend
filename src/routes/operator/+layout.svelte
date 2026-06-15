<script>
  import Header from "$lib/components/shared/Header.svelte";
  import { t } from "$lib/i18n.js";
  import { page } from "$app/stores";
  import { Camera, Sliders, X } from "@lucide/svelte";

  let { children } = $props();

  let currentPath = $derived($page.url.pathname);
  let isInspect = $derived(
    currentPath === "/operator" || currentPath === "/operator/",
  );
  let isCalibration = $derived(currentPath.includes("/calibration"));

  let sidebarOpen = $state(false);

  function toggleSidebar() {
    sidebarOpen = !sidebarOpen;
  }

  function closeSidebar() {
    sidebarOpen = false;
  }
</script>

<div class="operator-layout">
  <Header
    role="operator"
    title={$t("nav.live_inspect")}
    onMenuClick={toggleSidebar}
  >
    {#snippet navigation()}
      <nav class="header-nav">
        <a href="/operator" class="nav-item" class:active={isInspect}>
          <Camera size={16} /> Inspeksi
        </a>
        <a
          href="/operator/calibration"
          class="nav-item"
          class:active={isCalibration}
        >
          <Sliders size={16} /> Kalibrasi
        </a>
      </nav>
    {/snippet}
  </Header>

  <!-- Sidebar Backdrop (only visible on mobile/tablet when sidebar is open) -->
  <button
    class="sidebar-backdrop"
    class:visible={sidebarOpen}
    onclick={closeSidebar}
    aria-label="Close navigation sidebar"
  ></button>

  <!-- Sidebar Drawer (only active/visible on mobile/tablet) -->
  <aside class="sidebar-drawer" class:open={sidebarOpen}>
    <div class="sidebar-header">
      <div class="sidebar-brand">
        <div class="brand-mark">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        </div>
        <span class="brand-text">EPSON QC</span>
      </div>
      <button
        class="sidebar-close-btn"
        onclick={closeSidebar}
        aria-label="Close sidebar"
      >
        <X size={18} />
      </button>
    </div>

    <nav class="sidebar-nav">
      <a
        href="/operator"
        class="sidebar-nav-item"
        class:active={isInspect}
        onclick={closeSidebar}
      >
        <Camera size={18} /> <span>Inspeksi</span>
      </a>
      <a
        href="/operator/calibration"
        class="sidebar-nav-item"
        class:active={isCalibration}
        onclick={closeSidebar}
      >
        <Sliders size={18} /> <span>Kalibrasi</span>
      </a>
    </nav>
  </aside>

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
  }

  .header-nav {
    display: flex;
    gap: var(--sp-2);
    align-items: center;
  }

  .nav-item {
    display: flex;
    align-items: center;
    gap: var(--sp-2);
    padding: var(--sp-2) var(--sp-3);
    font-size: var(--fs-xs);
    font-weight: var(--fw-semibold);
    color: var(--clr-text-muted);
    text-decoration: none;
    border-radius: var(--radius-md);
    transition: all var(--transition-base);
    height: 32px;
    box-sizing: border-box;
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
    overflow-y: auto;
    min-height: 0;
  }

  .sidebar-backdrop {
    display: none;
  }

  .sidebar-drawer {
    display: none;
  }

  @media (max-width: 768px) {
    .sidebar-backdrop {
      display: block;
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.4);
      backdrop-filter: blur(2px);
      z-index: 999;
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.3s ease;
      border: none;
      padding: 0;
      cursor: default;
    }
    .sidebar-backdrop.visible {
      opacity: 1;
      pointer-events: auto;
    }

    .sidebar-drawer {
      display: flex;
      flex-direction: column;
      position: fixed;
      top: 0;
      left: 0;
      bottom: 0;
      width: 280px;
      background: var(--clr-surface);
      border-right: 1px solid var(--clr-border);
      box-shadow: var(--shadow-lg);
      z-index: 1000;
      transform: translateX(-100%);
      transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .sidebar-drawer.open {
      transform: translateX(0);
    }

    .sidebar-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      height: var(--header-height);
      padding: 0 var(--sp-4);
      border-bottom: 1px solid var(--clr-border);
      flex-shrink: 0;
    }

    .sidebar-brand {
      display: flex;
      align-items: center;
      gap: var(--sp-2);
    }

    .brand-mark {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 30px;
      height: 30px;
      background: var(--clr-accent);
      color: #fff;
      border-radius: var(--radius-md);
    }

    .brand-text {
      font-family: var(--font-heading);
      font-size: var(--fs-md);
      font-weight: var(--fw-bold);
      color: var(--clr-accent);
      letter-spacing: 1px;
    }

    .sidebar-close-btn {
      border: none;
      background: transparent;
      cursor: pointer;
      color: var(--clr-text-muted);
      padding: var(--sp-1);
      border-radius: var(--radius-sm);
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all var(--transition-fast);
    }
    .sidebar-close-btn:hover {
      background: var(--clr-surface-2);
      color: var(--clr-text);
    }

    .sidebar-nav {
      display: flex;
      flex-direction: column;
      gap: var(--sp-1);
      padding: var(--sp-4);
    }

    .sidebar-nav-item {
      display: flex;
      align-items: center;
      gap: var(--sp-3);
      padding: var(--sp-3) var(--sp-4);
      font-size: var(--fs-sm);
      font-weight: var(--fw-semibold);
      color: var(--clr-text-muted);
      text-decoration: none;
      border-radius: var(--radius-md);
      transition: all var(--transition-base);
    }
    .sidebar-nav-item:hover {
      background: var(--clr-surface-2);
      color: var(--clr-text);
    }
    .sidebar-nav-item.active {
      background: var(--clr-accent);
      color: white;
    }
  }
</style>
