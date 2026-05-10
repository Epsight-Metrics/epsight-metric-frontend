<script>
  import '../app.css';
  import { auth } from '$lib/stores/auth.js';

  import { onMount } from 'svelte';

  let { children } = $props();

  onMount(() => {
    auth.restore();
  });
</script>

{@render children()}
