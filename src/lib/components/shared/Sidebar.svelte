<script>
  import { page } from '$app/state';
  import { t } from '$lib/i18n.js';
  import { auth } from '$lib/stores/auth.js';
  import { goto } from '$app/navigation';

  let { items = [], role = 'operator' } = $props();

  async function handleLogout() {
    if (confirm($t('auth.logout_confirm'))) {
      auth.logout();
      goto('/login');
    }
  }

  function isActive(href) {
    return page.url.pathname === href;
  }
</script>

<aside class="sidebar">
  <nav class="sidebar-nav">
    {#each items as item}
      <a
        href={item.href}
        class="nav-item"
        class:active={isActive(item.href)}
      >
        <span class="nav-icon">{@html item.icon}</span>
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
</style>
