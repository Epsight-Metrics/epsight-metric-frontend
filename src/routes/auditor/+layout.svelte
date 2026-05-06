<script>
  import Header from '$lib/components/shared/Header.svelte';
  import Sidebar from '$lib/components/shared/Sidebar.svelte';
  import { t } from '$lib/i18n.js';

  let { children } = $props();

  const navItems = $derived([
    { href: '/auditor', icon: '📋', label: $t('nav.inspection_logs') },
    { href: '/auditor/traceability', icon: '🔗', label: $t('nav.traceability') },
    { href: '/auditor/integrity', icon: '🛡', label: $t('nav.integrity') },
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
  .auditor-layout { min-height: 100vh; display: flex; flex-direction: column; }
  .auditor-body { flex: 1; display: flex; }
  .auditor-main { flex: 1; padding: var(--sp-6); overflow-y: auto; }
</style>
