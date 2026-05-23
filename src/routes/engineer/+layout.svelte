<script>
  import { onMount } from 'svelte';
  import { t } from '$lib/i18n.js';
  import Header from '$lib/components/shared/Header.svelte';
  import Sidebar from '$lib/components/shared/Sidebar.svelte';

  let { children } = $props();

  onMount(() => {
    const user = JSON.parse(localStorage.getItem('srs_user') || '{}');
    if (!user || !['engineer', 'admin'].includes(user.role)) {
      window.location.href = '/login';
    }
  });

  const navItems = $derived([
    {
      href: '/engineer/calibration',
      icon: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>',
      label: $t('nav.calibration'),
    },
  ]);
</script>

<div class="engineer-layout">
  <Header role="engineer" title={$t('engineer.title')} />
  <div class="engineer-body">
    <Sidebar items={navItems} role="engineer" />
    <main class="engineer-main">
      {@render children()}
    </main>
  </div>
</div>

<style>
  .engineer-layout { min-height: 100vh; display: flex; flex-direction: column; }
  .engineer-body { flex: 1; display: flex; }
  .engineer-main { flex: 1; overflow-y: auto; }
</style>

