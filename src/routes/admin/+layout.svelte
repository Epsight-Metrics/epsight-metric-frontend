<script>
  import Header from '$lib/components/shared/Header.svelte';
  import Sidebar from '$lib/components/shared/Sidebar.svelte';
  import { t } from '$lib/i18n.js';

  let { children } = $props();

  const navItems = $derived([
    { href: '/admin', icon: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>', label: $t('nav.users') },
    { href: '/admin/logs', icon: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>', label: $t('nav.logs') },
  ]);
</script>

<div class="admin-layout">
  <Header role="admin" title={$t('admin.title')} />
  <div class="admin-body">
    <Sidebar items={navItems} role="admin" />
    <main class="admin-main">
      {@render children()}
    </main>
  </div>
</div>

<style>
  .admin-layout {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
  }
  .admin-body {
    flex: 1;
    display: flex;
  }
  .admin-main {
    flex: 1;
    padding: var(--sp-6);
    overflow-y: auto;
  }
</style>
