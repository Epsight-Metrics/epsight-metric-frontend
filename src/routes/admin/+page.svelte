<script>
  import { t } from '$lib/i18n.js';
  import { onMount } from 'svelte';
  import { getUsers, createUser, updateUser, deleteUser } from '$lib/api/admin.js';
  import { getAllBackendRoles, toFrontendRole } from '$lib/utils/roles.js';

  let users = $state([]);
  let searchQuery = $state('');
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
  let error = $state('');

  // New user form
  let newUser = $state({ username: '', name: '', role: 'OPERATOR_QC', password: '' });

  const roles = getAllBackendRoles();

  let totalPages = $derived(Math.ceil(total / limit) || 1);

  async function fetchUsers() {
    loading = true;
    error = '';
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
    if (!newUser.username || !newUser.name || !newUser.password) return;
    saving = true;
    error = '';
    try {
      await createUser(newUser);
      newUser = { username: '', name: '', role: 'OPERATOR_QC', password: '' };
      showAddModal = false;
      await fetchUsers();
    } catch (err) {
      error = err.message;
    } finally {
      saving = false;
    }
  }

  function openEdit(user) {
    editingUser = { ...user, password: '' };
    showEditModal = true;
  }

  async function saveEdit() {
    if (!editingUser) return;
    saving = true;
    error = '';
    try {
      const payload = { name: editingUser.name, role: editingUser.role };
      if (editingUser.password) payload.password = editingUser.password;
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
    showDeleteConfirm = true;
  }

  async function confirmDelete() {
    if (!deletingUser) return;
    saving = true;
    error = '';
    try {
      await deleteUser(deletingUser.id, false); // Deactivate by default
      showDeleteConfirm = false;
      deletingUser = null;
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
    return roles.find(r => r.value === backendRole)?.label || backendRole;
  }
</script>

<svelte:head>
  <title>{$t('admin.user_management')} — EPSON QC</title>
</svelte:head>

<div class="page animate-fade-in">
  <div class="page-header">
    <h1 class="page-title">{$t('admin.user_management')}</h1>
    <button class="btn btn-primary" onclick={() => showAddModal = true}>{$t('admin.add_user')}</button>
  </div>

  {#if error}
    <div class="error-banner">{error}</div>
  {/if}

  <!-- Search -->
  <div class="search-bar">
    <input class="input" type="text" bind:value={searchQuery} placeholder={$t('admin.search_users')} />
  </div>

  <!-- Table -->
  {#if loading}
    <div class="loading-state">{$t('common.loading')}</div>
  {:else}
    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th>No</th>
            <th>{$t('admin.username')}</th>
            <th>{$t('admin.fullname')}</th>
            <th>{$t('admin.role')}</th>
            <th>{$t('admin.active')}</th>
            <th>{$t('admin.created')}</th>
            <th>{$t('admin.actions')}</th>
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
                <span class="badge" class:badge-ok={user.isActive} class:badge-ng={!user.isActive} style="padding: 4px 8px; font-size: var(--fs-xs);">
                  {user.isActive ? 'Aktif' : 'Non-Aktif'}
                </span>
              </td>
              <td class="dim">{new Date(user.createdAt).toLocaleDateString('id-ID')}</td>
              <td>
                <div class="action-btns">
                  <button class="btn btn-ghost btn-icon" style="width: auto" title="Edit" onclick={() => openEdit(user)}>Edit</button>
                  <button class="btn btn-ghost btn-icon" style="width: auto" title="Delete" onclick={() => openDelete(user)}>Del</button>
                </div>
              </td>
            </tr>
          {/each}
          {#if users.length === 0}
            <tr><td colspan="7" class="no-data">{$t('common.no_data')}</td></tr>
          {/if}
        </tbody>
      </table>
    </div>

    <div class="table-footer">
      <span>{$t('common.showing')} {(page-1)*limit + 1}-{Math.min(page*limit, total)} {$t('common.of')} {total}</span>
      {#if totalPages > 1}
        <div class="pagination">
          <button class="btn btn-ghost" disabled={page <= 1} onclick={() => goToPage(page - 1)}>{$t('common.prev')}</button>
          <span class="page-num">{page}/{totalPages}</span>
          <button class="btn btn-ghost" disabled={page >= totalPages} onclick={() => goToPage(page + 1)}>{$t('common.next')}</button>
        </div>
      {/if}
    </div>
  {/if}
</div>

<!-- Add User Modal -->
{#if showAddModal}
  <div class="modal-backdrop" onclick={() => showAddModal = false}>
    <div class="modal animate-fade-in" onclick={(e) => e.stopPropagation()}>
      <h2 class="modal-title">{$t('admin.add_user')}</h2>
      <form onsubmit={(e) => { e.preventDefault(); addUser(); }}>
        <div class="form-group">
          <label class="label">{$t('admin.username')}</label>
          <input class="input" bind:value={newUser.username} required />
        </div>
        <div class="form-group">
          <label class="label">{$t('admin.fullname')}</label>
          <input class="input" bind:value={newUser.name} required />
        </div>
        <div class="form-group">
          <label class="label">{$t('admin.role')}</label>
          <select class="select" bind:value={newUser.role}>
            {#each roles as role}
              <option value={role.value}>{role.label}</option>
            {/each}
          </select>
        </div>
        <div class="form-group">
          <label class="label">{$t('admin.password')}</label>
          <input class="input" type="password" bind:value={newUser.password} required minlength="8" />
        </div>
        <div class="modal-actions">
          <button type="button" class="btn btn-secondary" onclick={() => showAddModal = false}>{$t('admin.cancel')}</button>
          <button type="submit" class="btn btn-primary" disabled={saving}>{$t('admin.save')}</button>
        </div>
      </form>
    </div>
  </div>
{/if}

<!-- Edit User Modal -->
{#if showEditModal && editingUser}
  <div class="modal-backdrop" onclick={() => showEditModal = false}>
    <div class="modal animate-fade-in" onclick={(e) => e.stopPropagation()}>
      <h2 class="modal-title">{$t('admin.edit_user')}</h2>
      <form onsubmit={(e) => { e.preventDefault(); saveEdit(); }}>
        <div class="form-group">
          <label class="label">{$t('admin.username')}</label>
          <input class="input" value={editingUser.username} disabled />
        </div>
        <div class="form-group">
          <label class="label">{$t('admin.fullname')}</label>
          <input class="input" bind:value={editingUser.name} />
        </div>
        <div class="form-group">
          <label class="label">{$t('admin.role')}</label>
          <select class="select" bind:value={editingUser.role}>
            {#each roles as role}
              <option value={role.value}>{role.label}</option>
            {/each}
          </select>
        </div>
        <div class="form-group">
          <label class="label">{$t('admin.password')} (kosongkan jika tidak diubah)</label>
          <input class="input" type="password" bind:value={editingUser.password} minlength="8" />
        </div>
        <div class="modal-actions">
          <button type="button" class="btn btn-secondary" onclick={() => showEditModal = false}>{$t('admin.cancel')}</button>
          <button type="submit" class="btn btn-primary" disabled={saving}>{$t('admin.save')}</button>
        </div>
      </form>
    </div>
  </div>
{/if}

<!-- Delete Confirm -->
{#if showDeleteConfirm && deletingUser}
  <div class="modal-backdrop" onclick={() => showDeleteConfirm = false}>
    <div class="modal modal-sm animate-fade-in" onclick={(e) => e.stopPropagation()}>
      <h2 class="modal-title">{$t('admin.delete_user')}</h2>
      <p class="modal-msg">{$t('admin.confirm_delete')}</p>
      <p class="modal-detail">{deletingUser.name} ({deletingUser.username})</p>
      <div class="modal-actions">
        <button class="btn btn-secondary" onclick={() => showDeleteConfirm = false}>{$t('admin.cancel')}</button>
        <button class="btn btn-danger" onclick={confirmDelete} disabled={saving}>{$t('admin.delete_user')}</button>
      </div>
    </div>
  </div>
{/if}

<style>
  .page-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--sp-5); }
  .page-title { font-size: var(--fs-xl); font-weight: var(--fw-semibold); }
  .search-bar { margin-bottom: var(--sp-4); max-width: 400px; }
  .dim { color: var(--clr-text-dim); }
  .no-data { text-align: center; color: var(--clr-text-dim); padding: var(--sp-8) !important; }
  .error-banner { padding: var(--sp-3); background: var(--clr-ng-bg); color: var(--clr-ng); border-radius: var(--radius-md); font-size: var(--fs-sm); margin-bottom: var(--sp-4); border: 1px solid rgba(239,68,68,0.2); }
  .loading-state { padding: var(--sp-8); text-align: center; color: var(--clr-text-muted); }
  code { background: var(--clr-surface-2); padding: 1px 6px; border-radius: 4px; font-size: var(--fs-xs); }
  .badge-btn { border: none; cursor: pointer; transition: opacity var(--transition-fast); }
  .badge-btn:hover { opacity: 0.8; }
  .action-btns { display: flex; gap: var(--sp-1); }
  .table-footer { margin-top: var(--sp-3); font-size: var(--fs-xs); color: var(--clr-text-dim); display: flex; justify-content: space-between; align-items: center; }
  .pagination { display: flex; align-items: center; gap: var(--sp-2); }
  .page-num { font-weight: var(--fw-medium); color: var(--clr-text-muted); }

  /* Modal */
  .modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; z-index: 500; padding: var(--sp-4); }
  .modal { background: var(--clr-surface); border: 1px solid var(--clr-border); border-radius: var(--radius-xl); padding: var(--sp-8); width: 100%; max-width: 480px; box-shadow: var(--shadow-lg); }
  .modal-sm { max-width: 380px; }
  .modal-title { font-size: var(--fs-lg); font-weight: var(--fw-semibold); margin-bottom: var(--sp-5); }
  .modal-msg { color: var(--clr-text-muted); margin-bottom: var(--sp-2); }
  .modal-detail { font-weight: var(--fw-medium); margin-bottom: var(--sp-5); }
  .modal-actions { display: flex; justify-content: flex-end; gap: var(--sp-3); margin-top: var(--sp-6); }
</style>
