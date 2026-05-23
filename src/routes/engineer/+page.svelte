<script>
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';

  onMount(() => {
    goto('/engineer/calibration', { replaceState: true });
  });
</script>

<div class="redirect-page">
  <p>Mengarahkan ke halaman kalibrasi...</p>
</div>

<style>
  .redirect-page {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 60vh;
    color: var(--clr-text-muted);
    font-size: var(--fs-sm);
  }
</style>
