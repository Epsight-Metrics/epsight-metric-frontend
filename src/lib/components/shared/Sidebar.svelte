<script>
  import { page } from '$app/state';
  import { t } from '$lib/i18n.js';
  import { auth } from '$lib/stores/auth.js';
  import { goto } from '$app/navigation';
  import { 
    Users, 
    FileText, 
    LayoutDashboard, 
    ClipboardList, 
    Bell, 
    Link, 
    Shield, 
    Settings,
    Database,
    X
  } from '@lucide/svelte';

  let { items = [], role = 'operator', isOpen = false, onclose } = $props();

  const iconComponents = {
    users: Users,
    logs: FileText,
    dashboard: LayoutDashboard,
    history: ClipboardList,
    alerts: Bell,
    traceability: Link,
    integrity: Shield,
    calibration: Settings,
    database: Database
  };

  let showConfirmLogout = $state(false);

  function handleLogout() {
    showConfirmLogout = true;
  }

  async function confirmLogout() {
    showConfirmLogout = false;
    await auth.logout();
    goto('/login');
  }

  function isActive(href) {
    return page.url.pathname === href;
  }
</script>

<!-- Sidebar Backdrop for Mobile Drawer -->
<button
  class="sidebar-backdrop"
  class:visible={isOpen}
  onclick={onclose}
  aria-label="Close sidebar"
></button>

<aside class="sidebar" class:open={isOpen}>
  <div class="sidebar-header-mobile">
    <div class="sidebar-brand">
      <div class="brand-mark">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/>
          <circle cx="12" cy="12" r="3"/>
        </svg>
      </div>
      <span class="brand-text">EPSON QC</span>
    </div>
    <button class="sidebar-close-btn" onclick={onclose} aria-label="Close sidebar">
      <X size={18} />
    </button>
  </div>

  <nav class="sidebar-nav">
    {#each items as item}
      <a
        href={item.href}
        class="nav-item"
        class:active={isActive(item.href)}
        onclick={() => onclose?.()}
      >
        <span class="nav-icon">
          {#if iconComponents[item.iconName]}
            {@const IconComponent = iconComponents[item.iconName]}
            <IconComponent size={20} />
          {/if}
        </span>
        <span class="nav-label">{item.label}</span>
      </a>
    {/each}
  </nav>

  <div class="sidebar-footer">
    <button class="nav-item logout-btn" onclick={handleLogout}>
      <span class="nav-icon"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg></span>
      <span class="nav-label">{$t('auth.logout')}</span>
    </button>
  </div>
</aside>

{#if showConfirmLogout}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="logout-modal-overlay" onclick={() => (showConfirmLogout = false)} role="presentation">
    <div class="logout-modal-card animate-zoom-in" onclick={(e) => e.stopPropagation()}>
      <div class="logout-icon-wrapper">
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="logout-warn-icon"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
      </div>
      <h3 class="logout-modal-title">Konfirmasi Keluar</h3>
      <p class="logout-modal-text">Apakah Anda yakin ingin keluar dari sistem EPSON QC?</p>
      <div class="logout-modal-actions">
        <button class="btn btn-secondary" onclick={() => (showConfirmLogout = false)}>Batal</button>
        <button class="btn btn-danger" onclick={confirmLogout}>Keluar</button>
      </div>
    </div>
  </div>
{/if}

<style>
  .sidebar {
    width: var(--sidebar-width);
    height: calc(100vh - var(--header-height));
    background: var(--clr-surface);
    border-right: 1px solid var(--clr-border);
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    position: sticky;
    top: var(--header-height);
    overflow-y: auto;
    flex-shrink: 0;
  }
  .sidebar-nav {
    padding: var(--sp-3);
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .nav-item {
    display: flex;
    align-items: center;
    gap: var(--sp-3);
    padding: var(--sp-3) var(--sp-4);
    border-radius: var(--radius-md);
    font-size: var(--fs-sm);
    font-weight: var(--fw-medium);
    color: var(--clr-text-muted);
    text-decoration: none;
    transition: all var(--transition-fast);
    border: none;
    border-left: 3px solid transparent;
  }
  .nav-item:hover {
    background: var(--clr-surface-2);
    color: var(--clr-text);
  }
  .nav-item.active {
    background: var(--clr-accent-subtle);
    color: var(--clr-accent);
    border-left-color: var(--clr-accent);
    font-weight: var(--fw-semibold);
  }
  .nav-icon {
    font-size: 1.1rem;
    flex-shrink: 0;
    display: flex;
    align-items: center;
  }
  .nav-label { white-space: nowrap; }
  .sidebar-footer {
    padding: var(--sp-3);
    border-top: 1px solid var(--clr-border);
  }
  .logout-btn {
    width: 100%;
    background: none;
    cursor: pointer;
    font-family: var(--font-family);
    color: var(--clr-text-muted);
    padding: var(--sp-3) var(--sp-4);
    border-radius: var(--radius-md);
  }
  .logout-btn:hover {
    background: var(--clr-ng-bg);
    color: var(--clr-ng);
    border-left-color: var(--clr-ng);
  }

  .sidebar-backdrop {
    display: none;
  }
  
  .sidebar-header-mobile {
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

    .sidebar {
      position: fixed;
      top: 0;
      left: 0;
      bottom: 0;
      width: 280px;
      background: var(--clr-surface);
      height: 100vh;
      z-index: 1000;
      transform: translateX(-100%);
      transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
      border-right: 1px solid var(--clr-border);
      box-shadow: var(--shadow-lg);
    }
    .sidebar.open {
      transform: translateX(0);
    }

    .sidebar-header-mobile {
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
  }

  /* Logout Confirm Modal */
  .logout-modal-overlay {
    position: fixed;
    inset: 0;
    z-index: 1000;
    background: rgba(15, 23, 42, 0.45);
    backdrop-filter: blur(4px);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: var(--sp-4);
  }
  .logout-modal-card {
    background: var(--clr-surface);
    border: 1px solid var(--clr-border);
    border-radius: var(--radius-lg);
    max-width: 400px;
    width: 100%;
    padding: var(--sp-6);
    box-shadow: var(--shadow-xl);
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--sp-3);
  }
  .logout-icon-wrapper {
    width: 56px;
    height: 56px;
    background: var(--clr-ng-bg);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: var(--sp-2);
  }
  .logout-warn-icon {
    color: var(--clr-ng);
  }
  .logout-modal-title {
    font-family: var(--font-heading);
    font-size: var(--fs-lg);
    font-weight: var(--fw-bold);
    color: var(--clr-text);
    margin: 0;
  }
  .logout-modal-text {
    font-size: var(--fs-sm);
    color: var(--clr-text-muted);
    margin: 0 0 var(--sp-3) 0;
    line-height: 1.5;
  }
  .logout-modal-actions {
    display: flex;
    gap: var(--sp-3);
    width: 100%;
  }
  .logout-modal-actions .btn {
    flex: 1;
    min-height: 44px;
    font-size: var(--fs-sm);
  }
  
  @keyframes zoomIn {
    from {
      transform: scale(0.95);
      opacity: 0;
    }
    to {
      transform: scale(1);
      opacity: 1;
    }
  }
  .animate-zoom-in {
    animation: zoomIn var(--transition-fast) ease forwards;
  }
</style>
