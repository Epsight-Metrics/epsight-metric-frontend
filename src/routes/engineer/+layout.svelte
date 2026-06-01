<script>
  import { onMount } from "svelte";
  import { t } from "$lib/i18n.js";
  import Header from "$lib/components/shared/Header.svelte";
  import Sidebar from "$lib/components/shared/Sidebar.svelte";

  let { children } = $props();

  onMount(() => {
    const user = JSON.parse(localStorage.getItem("srs_user") || "{}");
    if (!user || !["engineer", "admin"].includes(user.role)) {
      window.location.href = "/login";
    }
  });

  const navItems = $derived([
    {
      href: "/engineer/calibration",
      iconName: "calibration",
      label: $t("nav.calibration"),
    },
    {
      href: "/engineer/references",
      iconName: "database",
      label: "References",
    },
  ]);
</script>

<div class="engineer-layout">
  <Header role="engineer" title={$t("engineer.title")} />
  <div class="engineer-body">
    <Sidebar items={navItems} role="engineer" />
    <main class="engineer-main">
      {@render children()}
    </main>
  </div>
</div>

<style>
  .engineer-layout {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
  }
  .engineer-body {
    flex: 1;
    display: flex;
  }
  .engineer-main {
    flex: 1;
    overflow-y: auto;
  }
</style>
