<script>
  import { t } from "$lib/i18n.js";
  import { auth, currentUser } from "$lib/stores/auth.js";

  import { goto } from "$app/navigation";

  let { role = "operator", title = "" } = $props();

  let showUserMenu = $state(false);

  async function handleLogout() {
    if (confirm($t("auth.logout_confirm"))) {
      auth.logout();
      goto("/login");
    }
  }
</script>

<header class="header">
  <div class="header-left">
    <div class="header-brand">
      <!-- <span class="brand-icon">🔬</span> -->
      <span class="brand-text">EPSON QC</span>
    </div>
    {#if title}
      <span class="header-divider"></span>
      <span class="header-title">{title}</span>
    {/if}
  </div>

  <div class="header-right">




    <div class="user-menu-wrapper">
      <button class="user-btn" onclick={() => (showUserMenu = !showUserMenu)}>
        <div class="user-avatar">
          {$currentUser?.fullname?.charAt(0) || "?"}
        </div>
        <span class="user-name">{$currentUser?.fullname || "User"}</span>
        <span class="user-chevron">{showUserMenu ? "▲" : "▼"}</span>
      </button>

      {#if showUserMenu}
        <div class="user-dropdown animate-fade-in">
          <div class="dropdown-header">
            <span class="dropdown-name">{$currentUser?.fullname}</span>
            <span class="dropdown-role badge badge-info"
              >{$t(`role.${role}`)}</span
            >
          </div>
          <hr class="dropdown-divider" />
          <button class="dropdown-item" onclick={handleLogout} style="display: flex; align-items: center; gap: 8px;">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            {$t("auth.logout")}
          </button>
        </div>
      {/if}
    </div>
  </div>
</header>

{#if showUserMenu}
  <button
    class="backdrop"
    onclick={() => (showUserMenu = false)}
    aria-label="Close menu"
  ></button>
{/if}

<style>
  .header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: var(--header-height);
    padding: 0 var(--sp-6);
    background: var(--clr-surface);
    border-bottom: 1px solid var(--clr-border);
    position: sticky;
    top: 0;
    z-index: 100;
  }
  .header-left {
    display: flex;
    align-items: center;
    gap: var(--sp-4);
  }
  .header-brand {
    display: flex;
    align-items: center;
    gap: var(--sp-2);
  }
  /* .brand-icon {
    font-size: 1.4rem;
  } */
  .brand-text {
    font-size: var(--fs-lg);
    font-weight: var(--fw-bold);
    background: linear-gradient(135deg, var(--clr-accent), #a78bfa);
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
  }
  .header-divider {
    width: 1px;
    height: 24px;
    background: var(--clr-border);
  }
  .header-title {
    font-size: var(--fs-sm);
    color: var(--clr-text-muted);
  }
  .header-right {
    display: flex;
    align-items: center;
    gap: var(--sp-3);
  }
  .lang-toggle {
    font-size: var(--fs-sm);
  }
  .user-menu-wrapper {
    position: relative;
  }
  .user-btn {
    display: flex;
    align-items: center;
    gap: var(--sp-2);
    padding: var(--sp-1) var(--sp-3);
    background: var(--clr-surface-2);
    border: 1px solid var(--clr-border);
    border-radius: var(--radius-full);
    color: var(--clr-text);
    cursor: pointer;
    transition: all var(--transition-fast);
    font-family: var(--font-family);
  }
  .user-btn:hover {
    border-color: var(--clr-border-light);
  }
  .user-avatar {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background: linear-gradient(135deg, var(--clr-accent), #a78bfa);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: var(--fs-xs);
    font-weight: var(--fw-bold);
    color: #fff;
  }
  .user-name {
    font-size: var(--fs-sm);
    font-weight: var(--fw-medium);
    max-width: 120px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .user-chevron {
    font-size: 10px;
    color: var(--clr-text-muted);
  }
  .user-dropdown {
    position: absolute;
    top: calc(100% + 8px);
    right: 0;
    width: 220px;
    background: var(--clr-surface-2);
    border: 1px solid var(--clr-border);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-lg);
    overflow: hidden;
    z-index: 200;
  }
  .dropdown-header {
    padding: var(--sp-3) var(--sp-4);
    display: flex;
    flex-direction: column;
    gap: var(--sp-1);
  }
  .dropdown-name {
    font-weight: var(--fw-semibold);
    font-size: var(--fs-sm);
  }
  .dropdown-divider {
    border: none;
    border-top: 1px solid var(--clr-border);
    margin: 0;
  }
  .dropdown-item {
    display: block;
    width: 100%;
    padding: var(--sp-3) var(--sp-4);
    text-align: left;
    font-family: var(--font-family);
    font-size: var(--fs-sm);
    color: var(--clr-text-muted);
    background: none;
    border: none;
    cursor: pointer;
    transition: all var(--transition-fast);
  }
  .dropdown-item:hover {
    background: var(--clr-surface-3);
    color: var(--clr-text);
  }
  .backdrop {
    position: fixed;
    inset: 0;
    background: transparent;
    z-index: 99;
    border: none;
    cursor: default;
  }
</style>
