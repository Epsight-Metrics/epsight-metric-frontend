<script>
  import Header from "$lib/components/shared/Header.svelte";
  import Sidebar from "$lib/components/shared/Sidebar.svelte";
  import { t } from "$lib/i18n.js";

  let { children } = $props();
  let sidebarOpen = $state(false);

  const navItems = $derived([
    { href: "/admin", iconName: "users", label: $t("nav.users") },
    { href: "/admin/logs", iconName: "logs", label: $t("nav.logs") },
  ]);
</script>

<div class="admin-layout">
  <Header role="admin" title={$t("admin.title")} onMenuClick={() => sidebarOpen = !sidebarOpen} />
  <div class="admin-body">
    <Sidebar items={navItems} role="admin" isOpen={sidebarOpen} onclose={() => sidebarOpen = false} />
    <main class="admin-main">
      {@render children()}
    </main>
  </div>
</div>

<style>
  .admin-layout {
    height: 100vh;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
  .admin-body {
    flex: 1;
    display: flex;
    overflow: hidden;
  }
  .admin-main {
    flex: 1;
    padding: var(--sp-6);
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  @media (max-width: 768px) {
    .admin-layout {
      height: auto;
      min-height: 100vh;
      overflow: visible;
    }
    .admin-body {
      height: auto;
      overflow: visible;
    }
    .admin-main {
      height: auto;
      overflow: visible;
      padding: var(--sp-4);
    }
  }
</style>
