<script>
  import Header from '$lib/components/shared/Header.svelte';
  import { t } from '$lib/i18n.js';

  let { children } = $props();
</script>

<div class="operator-layout">
  <Header role="operator" title={$t('nav.live_inspect')} />
  <main class="operator-main">
    {@render children()}
  </main>
</div>

<style>
  .operator-layout {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    background: var(--clr-bg);
  }
  .operator-main {
    flex: 1;
    display: flex;
    flex-direction: column;
  }
</style>
