<script>
  import Header from "$lib/components/shared/Header.svelte";
  import Sidebar from "$lib/components/shared/Sidebar.svelte";
  import { t } from "$lib/i18n.js";

  let { children } = $props();

  const navItems = $derived([
    { href: "/admin", iconName: "users", label: $t("nav.users") },
    { href: "/admin/logs", iconName: "logs", label: $t("nav.logs") },
  ]);
</script>

<div class="admin-layout">
  <Header role="admin" title={$t("admin.title")} />
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
