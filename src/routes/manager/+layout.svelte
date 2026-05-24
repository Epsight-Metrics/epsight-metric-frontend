<script>
  import Header from '$lib/components/shared/Header.svelte';
  import Sidebar from '$lib/components/shared/Sidebar.svelte';
  import { t } from '$lib/i18n.js';

  let { children } = $props();

  const navItems = $derived([
    { href: '/manager', icon: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><rect width="4" height="7" x="7" y="10" rx="1"/><rect width="4" height="12" x="15" y="5" rx="1"/></svg>', label: $t('nav.dashboard') },
    { href: '/manager/history', icon: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>', label: $t('nav.history') },
    { href: '/manager/alerts', icon: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>', label: $t('nav.alerts') },
  ]);
</script>

<div class="manager-layout">
  <Header role="manager" title={$t('manager.title')} />
  <div class="manager-body">
    <Sidebar items={navItems} role="manager" />
    <main class="manager-main">
      {@render children()}
    </main>
  </div>
</div>

<style>
  .manager-layout { height: 100vh; display: flex; flex-direction: column; overflow: hidden; }
  .manager-body { flex: 1; display: flex; overflow: hidden; }
  .manager-main { flex: 1; padding: var(--sp-6); display: flex; flex-direction: column; overflow: hidden; }
</style>
