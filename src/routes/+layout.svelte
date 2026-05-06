<script>
  import '../app.css';
  import { auth } from '$lib/stores/auth.js';
  import { theme } from '$lib/stores/theme.js';
  import { onMount } from 'svelte';

  let { children } = $props();

  onMount(() => {
    auth.restore();
    theme.init();
  });
</script>

{@render children()}
