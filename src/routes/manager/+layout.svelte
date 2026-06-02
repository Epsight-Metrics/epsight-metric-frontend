<script>
  import Header from "$lib/components/shared/Header.svelte";
  import Sidebar from "$lib/components/shared/Sidebar.svelte";
  import { t } from "$lib/i18n.js";

  let { children } = $props();
  let sidebarOpen = $state(false);

  const navItems = $derived([
    { href: "/manager", iconName: "dashboard", label: $t("nav.dashboard") },
    { href: "/manager/history", iconName: "history", label: $t("nav.history") },
    { href: "/manager/alerts", iconName: "alerts", label: $t("nav.alerts") },
  ]);
</script>

<div class="manager-layout">
  <Header role="manager" title={$t("manager.title")} onMenuClick={() => sidebarOpen = !sidebarOpen} />
  <div class="manager-body">
    <Sidebar items={navItems} role="manager" isOpen={sidebarOpen} onclose={() => sidebarOpen = false} />
    <main class="manager-main">
      {@render children()}
    </main>
  </div>
</div>

<style>
  .manager-layout {
    height: 100vh;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
  .manager-body {
    flex: 1;
    display: flex;
    overflow: hidden;
  }
  .manager-main {
    flex: 1;
    padding: var(--sp-6);
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  @media (max-width: 768px) {
    .manager-layout {
      height: auto;
      min-height: 100vh;
      overflow: visible;
    }
    .manager-body {
      height: auto;
      overflow: visible;
    }
    .manager-main {
      height: auto;
      overflow: visible;
      padding: var(--sp-4);
    }
  }
</style>
