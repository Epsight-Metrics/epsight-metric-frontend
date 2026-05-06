<script>
  import { auth, isAuthenticated, userRole } from "$lib/stores/auth.js";
  import { t } from "$lib/i18n.js";
  import { locale } from "$lib/i18n.js";
  import { theme } from "$lib/stores/theme.js";
  import { getDashboardUrl } from "$lib/utils/rbac.js";
  import { goto } from "$app/navigation";
  import { onMount } from "svelte";

  let username = $state("");
  let password = $state("");
  let showPassword = $state(false);
  let loading = $state(false);
  let error = $state("");
  let currentLang = $state("id");

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

  function toggleLang() {
    currentLang = currentLang === "id" ? "en" : "id";
    locale.set(currentLang);
  }
</script>

<svelte:head>
  <title>{$t("app.title")}</title>
</svelte:head>

<div class="login-page">
  <div class="login-bg">
    <div class="bg-gradient"></div>
    <div class="bg-grid"></div>
  </div>

  <div class="login-card animate-fade-in">
    <div class="login-header">
      <!-- <div class="login-logo">🔬</div> -->
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
            {showPassword ? "🙈" : "👁"}
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
      <div class="footer-actions">
        <button
          class="theme-btn"
          onclick={() => theme.toggle()}
          title="Toggle Theme"
        >
          {$theme === "light" ? "🌙" : "☀️"}
        </button>
        <button class="lang-btn" onclick={toggleLang}>
          {currentLang === "id" ? "🇮🇩 Bahasa Indonesia" : "🇬🇧 English"}
        </button>
      </div>
      <span class="footer-text">{$t("app.version")} · {$t("app.company")}</span>
    </div>
  </div>

  <div class="demo-hint animate-fade-in">
    <p>
      Demo: <code>operator1</code> / <code>admin1</code> / <code>manager1</code>
      / <code>auditor1</code> — password: <code>pass123</code>
    </p>
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
  }
  .login-bg {
    position: absolute;
    inset: 0;
    z-index: 0;
  }
  .bg-gradient {
    position: absolute;
    inset: 0;
    background: radial-gradient(
        ellipse at 30% 20%,
        rgba(99, 102, 241, 0.15) 0%,
        transparent 50%
      ),
      radial-gradient(
        ellipse at 70% 80%,
        rgba(139, 92, 246, 0.1) 0%,
        transparent 50%
      );
  }
  .bg-grid {
    position: absolute;
    inset: 0;
    background-image: linear-gradient(
        rgba(255, 255, 255, 0.02) 1px,
        transparent 1px
      ),
      linear-gradient(90deg, rgba(255, 255, 255, 0.02) 1px, transparent 1px);
    background-size: 40px 40px;
  }
  .login-card {
    position: relative;
    z-index: 1;
    width: 100%;
    max-width: 400px;
    background: var(--clr-surface);
    border: 1px solid var(--clr-border);
    border-radius: var(--radius-xl);
    padding: var(--sp-10);
    box-shadow: var(--shadow-lg);
  }
  .login-header {
    text-align: center;
    margin-bottom: var(--sp-8);
  }
  /* .login-logo {
    font-size: 3rem;
    margin-bottom: var(--sp-3);
  } */
  .login-brand {
    font-size: var(--fs-3xl);
    font-weight: var(--fw-bold);
    background: linear-gradient(135deg, var(--clr-accent), #a78bfa);
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
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
    border: 1px solid rgba(239, 68, 68, 0.2);
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
    padding: 2px;
  }
  .login-btn {
    width: 100%;
    margin-top: var(--sp-2);
    letter-spacing: 1px;
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
  .footer-actions {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--sp-3);
  }
  .lang-btn,
  .theme-btn {
    background: none;
    border: none;
    color: var(--clr-text-muted);
    cursor: pointer;
    transition: color var(--transition-fast);
  }
  .lang-btn {
    font-size: var(--fs-xs);
    font-family: var(--font-family);
  }
  .theme-btn {
    font-size: 1.1rem;
    padding: 2px;
  }
  .lang-btn:hover,
  .theme-btn:hover {
    color: var(--clr-text);
  }
  .footer-text {
    font-size: var(--fs-xs);
    color: var(--clr-text-dim);
  }
  .demo-hint {
    position: relative;
    z-index: 1;
    margin-top: var(--sp-6);
    padding: var(--sp-3) var(--sp-4);
    background: var(--clr-surface-2);
    border: 1px solid var(--clr-border);
    border-radius: var(--radius-md);
    font-size: var(--fs-xs);
    color: var(--clr-text-muted);
  }
  .demo-hint code {
    background: var(--clr-surface-3);
    padding: 1px 6px;
    border-radius: 4px;
    color: var(--clr-accent-hover);
  }
</style>
