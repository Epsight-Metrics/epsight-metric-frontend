<script>
  import { t } from "$lib/i18n.js";
  import { onMount } from "svelte";
  import {
    getUsers,
    createUser,
    updateUser,
    deleteUser,
  } from "$lib/api/admin.js";
  import { getAllBackendRoles, toFrontendRole } from "$lib/utils/roles.js";
  import { currentUser, auth } from "$lib/stores/auth.js";
  import { login as verifyLogin } from "$lib/api/auth.js";
  import {
    validatePassword,
    generateSecurePassword,
  } from "$lib/utils/password.js";

  let users = $state([]);
  let searchQuery = $state("");
  let showAddModal = $state(false);
  let showEditModal = $state(false);
  let showDeleteConfirm = $state(false);
  let editingUser = $state(null);
  let deletingUser = $state(null);

  // Pagination
  let page = $state(1);
  let limit = $state(50);
  let total = $state(0);

  // Loading & error
  let loading = $state(true);
  let saving = $state(false);
  let error = $state("");

  // Re-authentication states for deactivation
  let confirmPassword = $state("");
  let authError = $state("");

  // Password visibility states
  let showAddPassword = $state(false);
  let showEditPassword = $state(false);

  // New user form
  let newUser = $state({
    username: "",
    name: "",
    role: "OPERATOR_QC",
    password: "",
  });

  // Password validation derived states (Svelte 5)
  let addPasswordValidation = $derived(
    validatePassword(newUser.password, newUser.username, newUser.name),
  );
  let editPasswordValidation = $derived(
    editingUser
      ? validatePassword(
          editingUser.password,
          editingUser.username,
          editingUser.name,
        )
      : { isValid: true, errors: [] },
  );

  let addPasswordChecklist = $derived([
    {
      label: "Minimal 8 - 64 karakter",
      satisfied: addPasswordValidation.criteria.lengthOk,
    },
    {
      label:
        "Mengandung huruf kapital (A-Z)" +
        (newUser.password.length >= 12 ? " (Dilonggarkan)" : ""),
      satisfied:
        addPasswordValidation.criteria.hasUppercase ||
        newUser.password.length >= 12,
    },
    {
      label:
        "Mengandung angka (0-9)" +
        (newUser.password.length >= 12 ? " (Dilonggarkan)" : ""),
      satisfied:
        addPasswordValidation.criteria.hasNumber ||
        newUser.password.length >= 12,
    },
    {
      label:
        "Mengandung simbol/karakter khusus" +
        (newUser.password.length >= 12 ? " (Dilonggarkan)" : ""),
      satisfied:
        addPasswordValidation.criteria.hasSymbol ||
        newUser.password.length >= 12,
    },
    {
      label:
        newUser.password &&
        addPasswordValidation.errors.some((e) => e.includes("username"))
          ? "Aman dari username (Mengandung username!)"
          : newUser.password &&
              addPasswordValidation.errors.some((e) => e.includes("nama"))
            ? "Aman dari nama lengkap (Mengandung unsur nama!)"
            : newUser.password &&
                addPasswordValidation.errors.some((e) => e.includes("pasaran"))
              ? "Aman dari kata pasaran (Mengandung kata pasaran!)"
              : "Aman dari informasi pribadi & kata pasaran",
      satisfied: !addPasswordValidation.criteria.isPredictable,
    },
  ]);

  let editPasswordChecklist = $derived([
    {
      label: "Minimal 8 - 64 karakter",
      satisfied: editPasswordValidation.criteria.lengthOk,
    },
    {
      label:
        "Mengandung huruf kapital (A-Z)" +
        ((editingUser?.password || "").length >= 12 ? " (Dilonggarkan)" : ""),
      satisfied:
        editPasswordValidation.criteria.hasUppercase ||
        (editingUser?.password || "").length >= 12,
    },
    {
      label:
        "Mengandung angka (0-9)" +
        ((editingUser?.password || "").length >= 12 ? " (Dilonggarkan)" : ""),
      satisfied:
        editPasswordValidation.criteria.hasNumber ||
        (editingUser?.password || "").length >= 12,
    },
    {
      label:
        "Mengandung simbol/karakter khusus" +
        ((editingUser?.password || "").length >= 12 ? " (Dilonggarkan)" : ""),
      satisfied:
        editPasswordValidation.criteria.hasSymbol ||
        (editingUser?.password || "").length >= 12,
    },
    {
      label:
        editingUser?.password &&
        editPasswordValidation.errors.some((e) => e.includes("username"))
          ? "Aman dari username (Mengandung username!)"
          : editingUser?.password &&
              editPasswordValidation.errors.some((e) => e.includes("nama"))
            ? "Aman dari nama lengkap (Mengandung unsur nama!)"
            : editingUser?.password &&
                editPasswordValidation.errors.some((e) => e.includes("pasaran"))
              ? "Aman dari kata pasaran (Mengandung kata pasaran!)"
              : "Aman dari informasi pribadi & kata pasaran",
      satisfied: !editPasswordValidation.criteria.isPredictable,
    },
  ]);

  const roles = getAllBackendRoles();

  let totalPages = $derived(Math.ceil(total / limit) || 1);

  async function fetchUsers() {
    loading = true;
    error = "";
    try {
      const params = { page, limit };
      if (searchQuery) params.name = searchQuery;
      const result = await getUsers(params);
      users = result.data || [];
      total = result.total || 0;
    } catch (err) {
      error = err.message;
    } finally {
      loading = false;
    }
  }

  async function addUser() {
    // 1. Validate username length and character pattern
    newUser.username = newUser.username.trim();
    if (
      !newUser.username ||
      newUser.username.length < 3 ||
      newUser.username.length > 50
    ) {
      error = "Username harus terdiri dari 3 sampai 50 karakter.";
      return;
    }
    if (!/^[a-zA-Z0-9_\-\.]+$/.test(newUser.username)) {
      error =
        "Username hanya boleh mengandung huruf, angka, titik, strip, dan garis bawah.";
      return;
    }

    // 2. Validate fullname
    newUser.name = newUser.name.trim();
    if (!newUser.name || newUser.name.length < 3 || newUser.name.length > 100) {
      error = "Nama lengkap harus terdiri dari 3 sampai 100 karakter.";
      return;
    }

    // 3. Validate backend roles
    const allowedBackendRoles = [
      "OPERATOR_QC",
      "ADMIN",
      "MANAGER_QC",
      "AUDITOR",
      "ENGINEER",
    ];
    if (!allowedBackendRoles.includes(newUser.role)) {
      error = "Role tidak valid.";
      return;
    }

    // 4. Validate password complexity and standard criteria (NIST & OWASP)
    if (!newUser.password) {
      error = "Kata sandi tidak boleh kosong.";
      return;
    }
    if (!addPasswordValidation.isValid) {
      error = addPasswordValidation.errors[0];
      return;
    }

    saving = true;
    error = "";
    try {
      await createUser(newUser);
      newUser = { username: "", name: "", role: "OPERATOR_QC", password: "" };
      showAddPassword = false;
      showAddModal = false;
      await fetchUsers();
    } catch (err) {
      error = err.message;
    } finally {
      saving = false;
    }
  }

  function openEdit(user) {
    editingUser = { ...user, password: "" };
    showEditPassword = false;
    showEditModal = true;
  }

  async function saveEdit() {
    if (!editingUser) return;

    // 1. Validate name
    editingUser.name = editingUser.name.trim();
    if (
      !editingUser.name ||
      editingUser.name.length < 3 ||
      editingUser.name.length > 100
    ) {
      error = "Nama lengkap harus terdiri dari 3 sampai 100 karakter.";
      return;
    }

    // 2. Validate role
    const allowedBackendRoles = [
      "OPERATOR_QC",
      "ADMIN",
      "MANAGER_QC",
      "AUDITOR",
      "ENGINEER",
    ];
    if (!allowedBackendRoles.includes(editingUser.role)) {
      error = "Role tidak valid.";
      return;
    }

    const payload = { name: editingUser.name, role: editingUser.role };

    // 3. Validate password complexity if present
    if (editingUser.password) {
      if (!editPasswordValidation.isValid) {
        error = editPasswordValidation.errors[0];
        return;
      }
      payload.password = editingUser.password;
    }

    saving = true;
    error = "";
    try {
      await updateUser(editingUser.id, payload);
      showEditModal = false;
      editingUser = null;
      await fetchUsers();
    } catch (err) {
      error = err.message;
    } finally {
      saving = false;
    }
  }

  function openDelete(user) {
    deletingUser = user;
    confirmPassword = "";
    authError = "";
    showDeleteConfirm = true;
  }

  async function confirmDelete() {
    if (!deletingUser) return;
    if (!confirmPassword) {
      authError = "Kata sandi konfirmasi admin diperlukan.";
      return;
    }

    saving = true;
    error = "";
    authError = "";
    try {
      const adminUsername = $currentUser?.username;
      if (!adminUsername) {
        authError = "Sesi admin tidak valid. Silakan masuk kembali.";
        saving = false;
        return;
      }

      // Re-authenticate admin password via backend verifyLogin request
      try {
        await verifyLogin(adminUsername, confirmPassword);
      } catch (authErr) {
        authError = "Kata sandi konfirmasi salah. Tindakan dibatalkan.";
        saving = false;
        return;
      }

      await deleteUser(deletingUser.id, false); // Deactivate by default
      showDeleteConfirm = false;
      deletingUser = null;
      confirmPassword = "";
      await fetchUsers();
    } catch (err) {
      error = err.message;
    } finally {
      saving = false;
    }
  }

  function goToPage(p) {
    page = p;
    fetchUsers();
  }

  onMount(() => {
    fetchUsers();
  });

  // Re-search when query changes (debounced via reactive)
  let searchTimer;
  $effect(() => {
    searchQuery; // track
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      page = 1;
      fetchUsers();
    }, 300);
  });

  function getRoleLabel(backendRole) {
    return roles.find((r) => r.value === backendRole)?.label || backendRole;
  }
</script>

<svelte:head>
  <title>{$t("admin.user_management")} — EPSON QC</title>
</svelte:head>

<div class="page animate-fade-in">
  <div class="page-header">
    <h1 class="page-title">{$t("admin.user_management")}</h1>
    <button class="btn btn-primary" onclick={() => (showAddModal = true)}
      >{$t("admin.add_user")}</button
    >
  </div>

  {#if error}
    <div class="error-banner">{error}</div>
  {/if}

  <!-- Search -->
  <div class="search-bar">
    <input
      class="input"
      type="text"
      bind:value={searchQuery}
      placeholder={$t("admin.search_users")}
    />
  </div>

  <!-- Table -->
  {#if loading}
    <div class="loading-state">{$t("common.loading")}</div>
  {:else}
    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th>No</th>
            <th>{$t("admin.username")}</th>
            <th>{$t("admin.fullname")}</th>
            <th>{$t("admin.role")}</th>
            <th>{$t("admin.active")}</th>
            <th>{$t("admin.created")}</th>
            <th>{$t("admin.actions")}</th>
          </tr>
        </thead>
        <tbody>
          {#each users as user, i}
            <tr>
              <td>{(page - 1) * limit + i + 1}</td>
              <td><code>{user.username}</code></td>
              <td>{user.name}</td>
              <td>
                <span class="badge badge-info">
                  {getRoleLabel(user.role)}
                </span>
              </td>
              <td>
                <span
                  class="badge"
                  class:badge-ok={user.isActive}
                  class:badge-ng={!user.isActive}
                  style="padding: 4px 8px; font-size: var(--fs-xs);"
                >
                  {user.isActive ? "Aktif" : "Non-Aktif"}
                </span>
              </td>
              <td class="dim"
                >{new Date(user.createdAt).toLocaleDateString("id-ID")}</td
              >
              <td>
                <div class="action-btns">
                  <button
                    class="btn-icon btn-edit"
                    title="Edit"
                    onclick={() => openEdit(user)}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      ><path
                        d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"
                      /><path d="m15 5 4 4" /></svg
                    >
                  </button>
                  <button
                    class="btn-icon btn-delete"
                    title="Delete"
                    onclick={() => openDelete(user)}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      ><path d="M3 6h18" /><path
                        d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"
                      /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /><line
                        x1="10"
                        x2="10"
                        y1="11"
                        y2="17"
                      /><line x1="14" x2="14" y1="11" y2="17" /></svg
                    >
                  </button>
                </div>
              </td>
            </tr>
          {/each}
          {#if users.length === 0}
            <tr><td colspan="7" class="no-data">{$t("common.no_data")}</td></tr>
          {/if}
        </tbody>
      </table>
    </div>

    <div class="table-footer">
      <span
        >{$t("common.showing")}
        {(page - 1) * limit + 1}-{Math.min(page * limit, total)}
        {$t("common.of")}
        {total}</span
      >
      {#if totalPages > 1}
        <div class="pagination">
          <button
            class="btn btn-ghost"
            disabled={page <= 1}
            onclick={() => goToPage(page - 1)}>{$t("common.prev")}</button
          >
          <span class="page-num">{page}/{totalPages}</span>
          <button
            class="btn btn-ghost"
            disabled={page >= totalPages}
            onclick={() => goToPage(page + 1)}>{$t("common.next")}</button
          >
        </div>
      {/if}
    </div>
  {/if}
</div>

<!-- Add User Modal -->
{#if showAddModal}
  <div
    class="modal-backdrop"
    role="button"
    tabindex="-1"
    onclick={(e) => {
      if (e.target === e.currentTarget) showAddModal = false;
    }}
    onkeydown={(e) => {
      if (e.key === "Escape") showAddModal = false;
    }}
  >
    <div class="modal animate-fade-in">
      <h2 class="modal-title">{$t("admin.add_user")}</h2>
      <form
        onsubmit={(e) => {
          e.preventDefault();
          addUser();
        }}
      >
        <div class="form-group">
          <label class="label" for="add-username">{$t("admin.username")}</label>
          <input
            id="add-username"
            class="input"
            bind:value={newUser.username}
            required
            minlength="3"
            maxlength="50"
            pattern="^[a-zA-Z0-9_\-\.]+$"
            title="Username harus antara 3-50 karakter dan hanya boleh menggunakan huruf, angka, titik, strip, dan garis bawah."
          />
        </div>
        <div class="form-group">
          <label class="label" for="add-fullname">{$t("admin.fullname")}</label>
          <input
            id="add-fullname"
            class="input"
            bind:value={newUser.name}
            required
            minlength="3"
            maxlength="100"
            title="Nama lengkap harus berukuran antara 3-100 karakter."
          />
        </div>
        <div class="form-group">
          <label class="label" for="add-role">{$t("admin.role")}</label>
          <select id="add-role" class="select" bind:value={newUser.role}>
            {#each roles as role}
              <option value={role.value}>{role.label}</option>
            {/each}
          </select>
        </div>
        <div class="form-group">
          <div class="password-header">
            <label class="label" for="add-password" style="margin-bottom: 0;"
              >{$t("admin.password")}</label
            >
            <button
              type="button"
              class="btn-generate-password"
              onclick={() => {
                newUser.password = generateSecurePassword(
                  newUser.username,
                  newUser.name,
                );
                showAddPassword = true;
              }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                ><rect width="18" height="11" x="3" y="11" rx="2" ry="2" /><path
                  d="M7 11V7a5 5 0 0 1 10 0v4"
                /></svg
              >
              Generate sandi acak
            </button>
          </div>
          <div class="password-field">
            <input
              id="add-password"
              class="input"
              type={showAddPassword ? "text" : "password"}
              bind:value={newUser.password}
              autocomplete="new-password"
              required
              minlength="8"
              maxlength="64"
              placeholder="Masukkan kata sandi aman"
            />
            <button
              type="button"
              class="password-toggle"
              onclick={() => (showAddPassword = !showAddPassword)}
              aria-label="Toggle password"
            >
              {#if showAddPassword}
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  ><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" /><path
                    d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"
                  /><path
                    d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"
                  /><line x1="2" y1="2" x2="22" y2="22" /></svg
                >
              {:else}
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  ><path
                    d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"
                  /><circle cx="12" cy="12" r="3" /></svg
                >
              {/if}
            </button>
          </div>

          <div class="password-feedback animate-fade-in">
            {#each addPasswordChecklist as item}
              <div
                class="feedback-item"
                class:success={newUser.password && item.satisfied}
                class:error={newUser.password && !item.satisfied}
                class:neutral={!newUser.password}
              >
                {#if !newUser.password}
                  <svg
                    class="lucide"
                    xmlns="http://www.w3.org/2000/svg"
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2.5"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    style="color: var(--clr-text-dim); opacity: 0.6;"
                    ><circle cx="12" cy="12" r="10" /></svg
                  >
                {:else if item.satisfied}
                  <svg
                    class="lucide"
                    xmlns="http://www.w3.org/2000/svg"
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="3"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    style="color: var(--clr-ok);"
                    ><path d="M20 6 9 17l-5-5" /></svg
                  >
                {:else}
                  <svg
                    class="lucide"
                    xmlns="http://www.w3.org/2000/svg"
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="3"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    style="color: var(--clr-ng);"
                    ><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg
                  >
                {/if}
                <span>{item.label}</span>
              </div>
            {/each}
          </div>
        </div>
        <div class="modal-actions">
          <button
            type="button"
            class="btn btn-secondary"
            onclick={() => (showAddModal = false)}>{$t("admin.cancel")}</button
          >
          <button
            type="submit"
            class="btn btn-primary"
            disabled={saving ||
              (newUser.password && !addPasswordValidation.isValid)}
            >{$t("admin.save")}</button
          >
        </div>
      </form>
    </div>
  </div>
{/if}

<!-- Edit User Modal -->
{#if showEditModal && editingUser}
  <div
    class="modal-backdrop"
    role="button"
    tabindex="-1"
    onclick={(e) => {
      if (e.target === e.currentTarget) showEditModal = false;
    }}
    onkeydown={(e) => {
      if (e.key === "Escape") showEditModal = false;
    }}
  >
    <div class="modal animate-fade-in">
      <h2 class="modal-title">{$t("admin.edit_user")}</h2>
      <form
        onsubmit={(e) => {
          e.preventDefault();
          saveEdit();
        }}
      >
        <div class="form-group">
          <label class="label" for="edit-username">{$t("admin.username")}</label
          >
          <input
            id="edit-username"
            class="input"
            value={editingUser.username}
            disabled
          />
        </div>
        <div class="form-group">
          <label class="label" for="edit-fullname">{$t("admin.fullname")}</label
          >
          <input
            id="edit-fullname"
            class="input"
            bind:value={editingUser.name}
            required
            minlength="3"
            maxlength="100"
            title="Nama lengkap harus berukuran antara 3-100 karakter."
          />
        </div>
        <div class="form-group">
          <label class="label" for="edit-role">{$t("admin.role")}</label>
          <select id="edit-role" class="select" bind:value={editingUser.role}>
            {#each roles as role}
              <option value={role.value}>{role.label}</option>
            {/each}
          </select>
        </div>
        <div class="form-group">
          <div class="password-header">
            <label class="label" for="edit-password"
              >{$t("admin.password")} (kosongkan jika tidak diubah)</label
            >
            <button
              type="button"
              class="btn-generate-password"
              onclick={() => {
                editingUser.password = generateSecurePassword(
                  editingUser.username,
                  editingUser.name,
                );
                showEditPassword = true;
              }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                ><rect width="18" height="11" x="3" y="11" rx="2" ry="2" /><path
                  d="M7 11V7a5 5 0 0 1 10 0v4"
                /></svg
              >
              Generate sandi acak
            </button>
          </div>
          <div class="password-field">
            <input
              id="edit-password"
              class="input"
              type={showEditPassword ? "text" : "password"}
              bind:value={editingUser.password}
              autocomplete="new-password"
              minlength="8"
              maxlength="64"
              placeholder="Masukkan kata sandi baru"
            />
            <button
              type="button"
              class="password-toggle"
              onclick={() => (showEditPassword = !showEditPassword)}
              aria-label="Toggle password"
            >
              {#if showEditPassword}
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  ><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" /><path
                    d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"
                  /><path
                    d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"
                  /><line x1="2" y1="2" x2="22" y2="22" /></svg
                >
              {:else}
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  ><path
                    d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"
                  /><circle cx="12" cy="12" r="3" /></svg
                >
              {/if}
            </button>
          </div>

          <div class="password-feedback animate-fade-in">
            {#each editPasswordChecklist as item}
              <div
                class="feedback-item"
                class:success={editingUser.password && item.satisfied}
                class:error={editingUser.password && !item.satisfied}
                class:neutral={!editingUser.password}
              >
                {#if !editingUser.password}
                  <svg
                    class="lucide"
                    xmlns="http://www.w3.org/2000/svg"
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2.5"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    style="color: var(--clr-text-dim); opacity: 0.6;"
                    ><circle cx="12" cy="12" r="10" /></svg
                  >
                {:else if item.satisfied}
                  <svg
                    class="lucide"
                    xmlns="http://www.w3.org/2000/svg"
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="3"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    style="color: var(--clr-ok);"
                    ><path d="M20 6 9 17l-5-5" /></svg
                  >
                {:else}
                  <svg
                    class="lucide"
                    xmlns="http://www.w3.org/2000/svg"
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="3"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    style="color: var(--clr-ng);"
                    ><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg
                  >
                {/if}
                <span>{item.label}</span>
              </div>
            {/each}
          </div>
        </div>
        <div class="modal-actions">
          <button
            type="button"
            class="btn btn-secondary"
            onclick={() => (showEditModal = false)}>{$t("admin.cancel")}</button
          >
          <button
            type="submit"
            class="btn btn-primary"
            disabled={saving ||
              (editingUser.password && !editPasswordValidation.isValid)}
            >{$t("admin.save")}</button
          >
        </div>
      </form>
    </div>
  </div>
{/if}

<!-- Delete Confirm -->
{#if showDeleteConfirm && deletingUser}
  <div
    class="modal-backdrop"
    role="button"
    tabindex="-1"
    onclick={(e) => {
      if (e.target === e.currentTarget) showDeleteConfirm = false;
    }}
    onkeydown={(e) => {
      if (e.key === "Escape") showDeleteConfirm = false;
    }}
  >
    <div class="modal modal-sm animate-fade-in">
      <h2 class="modal-title">{$t("admin.delete_user")}</h2>
      <p class="modal-msg">{$t("admin.confirm_delete")}</p>
      <p class="modal-detail">{deletingUser.name} ({deletingUser.username})</p>

      <div class="form-group" style="margin-top: var(--sp-4);">
        <label class="label" for="confirm-pass"
          >Kata Sandi Konfirmasi Admin</label
        >
        <input
          id="confirm-pass"
          class="input"
          type="password"
          bind:value={confirmPassword}
          placeholder="Masukkan kata sandi Anda"
          autocomplete="new-password"
          required
        />
        {#if authError}
          <div
            class="error-msg"
            style="margin-top: var(--sp-2); font-size: var(--fs-xs); text-align: left; padding: var(--sp-2);"
          >
            {authError}
          </div>
        {/if}
      </div>

      <div class="modal-actions">
        <button
          class="btn btn-secondary"
          onclick={() => (showDeleteConfirm = false)}
          >{$t("admin.cancel")}</button
        >
        <button
          class="btn btn-danger"
          onclick={confirmDelete}
          disabled={saving || !confirmPassword}
          >{$t("admin.delete_user")}</button
        >
      </div>
    </div>
  </div>
{/if}

<style>
  .page-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: var(--sp-5);
  }
  .page-title {
    font-family: var(--font-heading);
    font-size: var(--fs-2xl);
    font-weight: var(--fw-semibold);
  }
  .search-bar {
    margin-bottom: var(--sp-4);
    max-width: 400px;
  }
  .dim {
    color: var(--clr-text-dim);
  }
  .no-data {
    text-align: center;
    color: var(--clr-text-dim);
    padding: var(--sp-8) !important;
  }
  .error-banner {
    padding: var(--sp-3);
    background: var(--clr-ng-bg);
    color: var(--clr-ng);
    border-radius: var(--radius-md);
    font-size: var(--fs-sm);
    margin-bottom: var(--sp-4);
    border: 1px solid var(--clr-ng-border);
  }
  .loading-state {
    padding: var(--sp-8);
    text-align: center;
    color: var(--clr-text-muted);
  }
  code {
    background: var(--clr-surface-2);
    padding: 1px 6px;
    border-radius: 4px;
    font-size: var(--fs-xs);
  }
  .action-btns {
    display: flex;
    gap: var(--sp-2);
  }
  .btn-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    padding: 0;
    border: 1px solid var(--clr-border);
    border-radius: var(--radius-md);
    background: var(--clr-surface);
    cursor: pointer;
    transition: all var(--transition-fast);
  }
  .btn-edit {
    color: var(--clr-accent);
  }
  .btn-edit:hover {
    background: var(--clr-accent);
    color: white;
    border-color: var(--clr-accent);
  }
  .btn-delete {
    color: var(--clr-ng);
    border-color: var(--clr-ng);
  }
  .btn-delete:hover {
    background: var(--clr-ng);
    color: white;
  }
  .btn-icon:active {
    transform: scale(0.95);
  }
  .table-footer {
    margin-top: var(--sp-3);
    font-size: var(--fs-xs);
    color: var(--clr-text-dim);
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .pagination {
    display: flex;
    align-items: center;
    gap: var(--sp-2);
  }
  .page-num {
    font-weight: var(--fw-medium);
    color: var(--clr-text-muted);
  }

  /* Modal */
  .modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.6);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 500;
    padding: var(--sp-4);
  }
  .modal {
    background: var(--clr-surface);
    border: 1px solid var(--clr-border);
    border-radius: var(--radius-xl);
    padding: var(--sp-8);
    width: 100%;
    max-width: 480px;
    box-shadow: var(--shadow-lg);
  }
  .modal-sm {
    max-width: 380px;
  }
  .modal-title {
    font-family: var(--font-heading);
    font-size: var(--fs-xl);
    font-weight: var(--fw-semibold);
    margin-bottom: var(--sp-5);
  }
  .modal-msg {
    color: var(--clr-text-muted);
    margin-bottom: var(--sp-2);
  }
  .modal-detail {
    font-weight: var(--fw-medium);
    margin-bottom: var(--sp-5);
  }
  .modal-actions {
    display: flex;
    justify-content: flex-end;
    gap: var(--sp-3);
    margin-top: var(--sp-6);
  }

  /* Password Toggle inside Form Modals */
  .password-field {
    position: relative;
    display: flex;
    align-items: center;
    width: 100%;
  }
  .password-field :global(.input) {
    width: 100%;
    padding-right: var(--sp-10);
  }
  .password-toggle {
    position: absolute;
    right: var(--sp-3);
    background: none;
    border: none;
    color: var(--clr-text-dim);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 4px;
    transition: color var(--transition-fast);
  }
  .password-toggle:hover {
    color: var(--clr-text-muted);
  }

  /* Password strength feedback & generator styling */
  .password-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--sp-1);
  }
  .btn-generate-password {
    font-size: var(--fs-xs);
    font-weight: var(--fw-medium);
    color: var(--clr-accent);
    background: none;
    border: none;
    padding: 0;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 4px;
    transition:
      color var(--transition-fast),
      transform var(--transition-fast);
  }
  .btn-generate-password:hover {
    color: var(--clr-accent-hover);
    transform: translateY(-1px);
    text-decoration: underline;
  }
  .btn-generate-password:active {
    transform: translateY(0);
  }
  .password-feedback {
    margin-top: var(--sp-2);
    padding: var(--sp-2) var(--sp-3);
    background: var(--clr-bg);
    border: 1px solid var(--clr-border);
    border-radius: var(--radius-md);
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .feedback-item {
    font-size: var(--fs-xs);
    display: flex;
    align-items: center;
    gap: 6px;
    line-height: 1.4;
  }
  .feedback-item.error {
    color: var(--clr-ng);
  }
  .feedback-item.success {
    color: var(--clr-ok);
    font-weight: var(--fw-semibold);
  }
  .feedback-item.neutral {
    color: var(--clr-text-muted);
  }

  @media (max-width: 768px) {
    .page-header {
      flex-direction: column;
      align-items: stretch;
      gap: var(--sp-3);
    }
    .page-title {
      font-size: var(--fs-xl);
    }
    .search-bar {
      max-width: 100%;
    }
    .table-container {
      overflow-x: auto;
    }
    table {
      font-size: var(--fs-xs);
      min-width: 700px;
    }
    .action-btns {
      flex-direction: column;
      gap: var(--sp-1);
    }
    .btn-icon {
      width: 100%;
      height: 28px;
    }
    .table-footer {
      flex-direction: column;
      gap: var(--sp-3);
      align-items: center;
    }
    .modal {
      padding: var(--sp-5);
      max-width: 95vw;
    }
    .modal-title {
      font-size: var(--fs-lg);
    }
    .modal-actions {
      flex-direction: column-reverse;
      gap: var(--sp-2);
    }
    .modal-actions .btn {
      width: 100%;
    }
    .password-header {
      flex-direction: column;
      align-items: flex-start;
      gap: var(--sp-2);
    }
  }
</style>
