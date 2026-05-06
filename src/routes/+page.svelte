<script>
  import { auth, isAuthenticated, userRole } from '$lib/stores/auth.js';
  import { getDashboardUrl } from '$lib/utils/rbac.js';
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';

  onMount(() => {
    const unsub = isAuthenticated.subscribe(val => {
      if (val) {
        userRole.subscribe(role => {
          if (role) goto(getDashboardUrl(role));
        })();
      }
    });
    return unsub;
  });
</script>

<div class="redirect-page">
  <p>Mengarahkan...</p>
  <p><a href="/login">Klik di sini jika tidak otomatis diarahkan</a></p>
</div>

<style>
  .redirect-page {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    color: var(--clr-text-muted);
    gap: var(--sp-4);
  }
</style>
