<script>
  import Header from '$lib/components/shared/Header.svelte';
  import Sidebar from '$lib/components/shared/Sidebar.svelte';
  import { t } from '$lib/i18n.js';

  let { children } = $props();

  const navItems = $derived([
    { href: '/auditor', icon: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>', label: $t('nav.inspection_logs') },
    { href: '/auditor/traceability', icon: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>', label: $t('nav.traceability') },
    { href: '/auditor/integrity', icon: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>', label: $t('nav.integrity') },
  ]);
</script>

<div class="auditor-layout">
  <Header role="auditor" title={$t('auditor.title')} />
  <div class="auditor-body">
    <Sidebar items={navItems} role="auditor" />
    <main class="auditor-main">
      {@render children()}
    </main>
  </div>
</div>

<style>
  .auditor-layout { height: 100vh; display: flex; flex-direction: column; overflow: hidden; }
  .auditor-body { flex: 1; display: flex; overflow: hidden; }
  .auditor-main { flex: 1; padding: var(--sp-6); display: flex; flex-direction: column; overflow: hidden; }
</style>
