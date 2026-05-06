<script>
  import Header from '$lib/components/shared/Header.svelte';
  import Sidebar from '$lib/components/shared/Sidebar.svelte';
  import { t } from '$lib/i18n.js';

  let { children } = $props();

  const navItems = $derived([
    { href: '/manager', icon: '📊', label: $t('nav.dashboard') },
    { href: '/manager/defects', icon: '🔴', label: $t('nav.defects') },
    { href: '/manager/history', icon: '📋', label: $t('nav.history') },
    { href: '/manager/alerts', icon: '🔔', label: $t('nav.alerts') },
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
  .manager-layout { min-height: 100vh; display: flex; flex-direction: column; }
  .manager-body { flex: 1; display: flex; }
  .manager-main { flex: 1; padding: var(--sp-6); overflow-y: auto; }
</style>
