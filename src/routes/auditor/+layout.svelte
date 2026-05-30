<script>
  import Header from "$lib/components/shared/Header.svelte";
  import Sidebar from "$lib/components/shared/Sidebar.svelte";
  import { t } from "$lib/i18n.js";

  let { children } = $props();

  const navItems = $derived([
    { href: "/auditor", iconName: "logs", label: $t("nav.inspection_logs") },
    {
      href: "/auditor/traceability",
      iconName: "traceability",
      label: $t("nav.traceability"),
    },
    {
      href: "/auditor/integrity",
      iconName: "integrity",
      label: $t("nav.integrity"),
    },
  ]);
</script>

<div class="auditor-layout">
  <Header role="auditor" title={$t("auditor.title")} />
  <div class="auditor-body">
    <Sidebar items={navItems} role="auditor" />
    <main class="auditor-main">
      {@render children()}
    </main>
  </div>
</div>

<style>
  .auditor-layout {
    height: 100vh;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
  .auditor-body {
    flex: 1;
    display: flex;
    overflow: hidden;
  }
  .auditor-main {
    flex: 1;
    padding: var(--sp-6);
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
</style>
