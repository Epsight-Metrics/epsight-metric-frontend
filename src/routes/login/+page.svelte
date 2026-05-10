<script>
  import { auth, isAuthenticated, userRole } from "$lib/stores/auth.js";
  import { t } from "$lib/i18n.js";

  import { getDashboardUrl } from "$lib/utils/rbac.js";
  import { goto } from "$app/navigation";
  import { onMount } from "svelte";

  let username = $state("");
  let password = $state("");
  let showPassword = $state(false);
  let loading = $state(false);
  let error = $state("");

  onMount(() => {
    const unsub = isAuthenticated.subscribe((val) => {
      if (val) {
        userRole.subscribe((role) => {
          if (role) goto(getDashboardUrl(role));
        })();
      }
    });
    return unsub;
  });

  async function handleLogin(e) {
    e.preventDefault();
    loading = true;
    error = "";

    const user = await auth.login(username, password);
    loading = false;

    if (user) {
      goto(getDashboardUrl(user.role));
    } else {
      auth.subscribe((s) => {
        error = s.error;
      })();
    }
  }
</script>

<svelte:head>
  <title>{$t("app.title")}</title>
</svelte:head>

<div class="login-page">
  <div class="login-bg">
    <div class="bg-gradient"></div>
    <div class="bg-grid"></div>
    <div class="bg-accent-circle c1"></div>
    <div class="bg-accent-circle c2"></div>
  </div>

  <div class="login-card animate-fade-in">
    <div class="login-header">
      <div class="brand-mark">
        <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/>
          <circle cx="12" cy="12" r="3"/>
        </svg>
      </div>
      <h1 class="login-brand">EPSON QC</h1>
      <p class="login-subtitle">{$t("auth.login_subtitle")}</p>
    </div>

    <form class="login-form" onsubmit={handleLogin}>
      {#if error}
        <div class="error-msg animate-fade-in">{error}</div>
      {/if}

      <div class="form-group">
        <label class="label" for="username">{$t("auth.username")}</label>
        <input
          id="username"
          class="input"
          type="text"
          bind:value={username}
          placeholder={$t("auth.username")}
          required
          autocomplete="username"
        />
      </div>

      <div class="form-group">
        <label class="label" for="password">{$t("auth.password")}</label>
        <div class="password-field">
          <input
            id="password"
            class="input"
            type={showPassword ? "text" : "password"}
            bind:value={password}
            placeholder={$t("auth.password")}
            required
            autocomplete="current-password"
          />
          <button
            type="button"
            class="password-toggle"
            onclick={() => (showPassword = !showPassword)}
            aria-label="Toggle password"
          >
            {#if showPassword}
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" y1="2" x2="22" y2="22"/></svg>
            {:else}
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
            {/if}
          </button>
        </div>
      </div>

      <button
        type="submit"
        class="btn btn-primary btn-lg login-btn"
        disabled={loading}
      >
        {#if loading}
          <span class="spinner"></span> {$t("common.loading")}
        {:else}
          {$t("auth.login_btn")}
        {/if}
      </button>
    </form>

    <div class="login-footer">
      <span class="footer-text">{$t("app.version")} · {$t("app.company")}</span>
    </div>
  </div>
</div>

<style>
  .login-page {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    position: relative;
    overflow: hidden;
    padding: var(--sp-4);
    background: var(--clr-bg);
  }
  .login-bg {
    position: absolute;
    inset: 0;
    z-index: 0;
  }
  .bg-gradient {
    position: absolute;
    inset: 0;
    background:
      radial-gradient(ellipse at 30% 20%, rgba(0, 51, 153, 0.06) 0%, transparent 50%),
      radial-gradient(ellipse at 70% 80%, rgba(37, 99, 235, 0.04) 0%, transparent 50%);
  }
  .bg-grid {
    position: absolute;
    inset: 0;
    background-image:
      linear-gradient(rgba(0, 51, 153, 0.03) 1px, transparent 1px),
      linear-gradient(90deg, rgba(0, 51, 153, 0.03) 1px, transparent 1px);
    background-size: 48px 48px;
  }
  .bg-accent-circle {
    position: absolute;
    border-radius: 50%;
    border: 1px solid rgba(0, 51, 153, 0.06);
  }
  .bg-accent-circle.c1 {
    width: 400px;
    height: 400px;
    top: -100px;
    right: -100px;
  }
  .bg-accent-circle.c2 {
    width: 300px;
    height: 300px;
    bottom: -80px;
    left: -80px;
  }

  .login-card {
    position: relative;
    z-index: 1;
    width: 100%;
    max-width: 420px;
    background: var(--clr-surface);
    border: 1px solid var(--clr-border);
    border-radius: var(--radius-xl);
    padding: var(--sp-10);
    box-shadow: var(--shadow-xl);
  }
  .login-header {
    text-align: center;
    margin-bottom: var(--sp-8);
  }
  .brand-mark {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 56px;
    height: 56px;
    background: var(--clr-accent);
    color: #fff;
    border-radius: var(--radius-lg);
    margin-bottom: var(--sp-4);
  }
  .login-brand {
    font-family: var(--font-heading);
    font-size: var(--fs-3xl);
    font-weight: var(--fw-bold);
    color: var(--clr-accent);
    letter-spacing: 2px;
  }
  .login-subtitle {
    color: var(--clr-text-muted);
    font-size: var(--fs-sm);
    margin-top: var(--sp-1);
  }
  .login-form {
    display: flex;
    flex-direction: column;
    gap: var(--sp-4);
  }
  .error-msg {
    padding: var(--sp-3);
    background: var(--clr-ng-bg);
    color: var(--clr-ng);
    border-radius: var(--radius-md);
    font-size: var(--fs-sm);
    text-align: center;
    border: 1px solid var(--clr-ng-border);
  }
  .password-field {
    position: relative;
  }
  .password-field .input {
    padding-right: var(--sp-10);
  }
  .password-toggle {
    position: absolute;
    right: var(--sp-3);
    top: 50%;
    transform: translateY(-50%);
    background: none;
    border: none;
    cursor: pointer;
    font-size: 1rem;
    padding: 4px;
    color: var(--clr-text-dim);
    display: flex;
    align-items: center;
    transition: color var(--transition-fast);
  }
  .password-toggle:hover {
    color: var(--clr-text);
  }
  .login-btn {
    width: 100%;
    margin-top: var(--sp-2);
    letter-spacing: 0.5px;
  }
  .spinner {
    display: inline-block;
    width: 16px;
    height: 16px;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-top-color: #fff;
    border-radius: 50%;
    animation: spin 0.6s linear infinite;
  }
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
  .login-footer {
    margin-top: var(--sp-6);
    text-align: center;
    display: flex;
    flex-direction: column;
    gap: var(--sp-2);
  }
  .footer-text {
    font-size: var(--fs-xs);
    color: var(--clr-text-dim);
  }
</style>
