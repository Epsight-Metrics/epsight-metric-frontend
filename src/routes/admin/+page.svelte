<script>
  import { t } from '$lib/i18n.js';
  import { mockUsers } from '$lib/data/mock.js';
  import { getAllRoles } from '$lib/utils/rbac.js';

  let users = $state([...mockUsers]);
  let searchQuery = $state('');
  let showAddModal = $state(false);
  let showEditModal = $state(false);
  let showDeleteConfirm = $state(false);
  let editingUser = $state(null);
  let deletingUser = $state(null);

  // New user form
  let newUser = $state({ username: '', fullname: '', role: 'operator', password: '' });

  let filteredUsers = $derived(
    users.filter(u =>
      u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.fullname.toLowerCase().includes(searchQuery.toLowerCase())
    )
  );

  const roles = getAllRoles();

  function addUser() {
    if (!newUser.username || !newUser.fullname || !newUser.password) return;
    const id = Math.max(...users.map(u => u.id)) + 1;
    users = [...users, { ...newUser, id, active: true, created: new Date().toISOString().split('T')[0] }];
    newUser = { username: '', fullname: '', role: 'operator', password: '' };
    showAddModal = false;
  }

  function openEdit(user) {
    editingUser = { ...user };
    showEditModal = true;
  }

  function saveEdit() {
    users = users.map(u => u.id === editingUser.id ? { ...editingUser } : u);
    showEditModal = false;
    editingUser = null;
  }

  function openDelete(user) {
    deletingUser = user;
    showDeleteConfirm = true;
  }

  function confirmDelete() {
    users = users.filter(u => u.id !== deletingUser.id);
    showDeleteConfirm = false;
    deletingUser = null;
  }

  function toggleActive(user) {
    users = users.map(u => u.id === user.id ? { ...u, active: !u.active } : u);
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

  <!-- Search -->
  <div class="search-bar">
    <input class="input" type="text" bind:value={searchQuery} placeholder={$t('admin.search_users')} />
  </div>

  <!-- Table -->
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
        {#each filteredUsers as user, i}
          <tr>
            <td>{i + 1}</td>
            <td><code>{user.username}</code></td>
            <td>{user.fullname}</td>
            <td>
              <span class="badge badge-info">
                {roles.find(r => r.value === user.role)?.label || user.role}
              </span>
            </td>
            <td>
              <button class="active-dot" class:is-active={user.active} onclick={() => toggleActive(user)} title={user.active ? $t('admin.deactivate') : $t('admin.activate')}>
                {user.active ? '●' : '○'}
              </button>
            </td>
            <td class="dim">{user.created}</td>
            <td>
              <div class="action-btns">
                <button class="btn btn-ghost btn-icon" title="Edit" onclick={() => openEdit(user)}>✏️</button>
                <button class="btn btn-ghost btn-icon" title="Delete" onclick={() => openDelete(user)}>🗑</button>
              </div>
            </td>
          </tr>
        {/each}
        {#if filteredUsers.length === 0}
          <tr><td colspan="7" class="no-data">{$t('common.no_data')}</td></tr>
        {/if}
      </tbody>
    </table>
  </div>

  <div class="table-footer">
    {$t('common.showing')} 1-{filteredUsers.length} {$t('common.of')} {filteredUsers.length}
  </div>
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
          <input class="input" bind:value={newUser.fullname} required />
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
          <input class="input" type="password" bind:value={newUser.password} required />
        </div>
        <div class="modal-actions">
          <button type="button" class="btn btn-secondary" onclick={() => showAddModal = false}>{$t('admin.cancel')}</button>
          <button type="submit" class="btn btn-primary">{$t('admin.save')}</button>
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
          <input class="input" bind:value={editingUser.username} />
        </div>
        <div class="form-group">
          <label class="label">{$t('admin.fullname')}</label>
          <input class="input" bind:value={editingUser.fullname} />
        </div>
        <div class="form-group">
          <label class="label">{$t('admin.role')}</label>
          <select class="select" bind:value={editingUser.role}>
            {#each roles as role}
              <option value={role.value}>{role.label}</option>
            {/each}
          </select>
        </div>
        <div class="modal-actions">
          <button type="button" class="btn btn-secondary" onclick={() => showEditModal = false}>{$t('admin.cancel')}</button>
          <button type="submit" class="btn btn-primary">{$t('admin.save')}</button>
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
      <p class="modal-detail">{deletingUser.fullname} ({deletingUser.username})</p>
      <div class="modal-actions">
        <button class="btn btn-secondary" onclick={() => showDeleteConfirm = false}>{$t('admin.cancel')}</button>
        <button class="btn btn-danger" onclick={confirmDelete}>{$t('admin.delete_user')}</button>
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
    font-size: var(--fs-xl);
    font-weight: var(--fw-semibold);
  }
  .search-bar { margin-bottom: var(--sp-4); max-width: 400px; }
  .dim { color: var(--clr-text-dim); }
  .no-data { text-align: center; color: var(--clr-text-dim); padding: var(--sp-8) !important; }
  code {
    background: var(--clr-surface-2);
    padding: 1px 6px;
    border-radius: 4px;
    font-size: var(--fs-xs);
  }
  .active-dot {
    background: none;
    border: none;
    font-size: 1.2rem;
    cursor: pointer;
    padding: var(--sp-1);
    transition: color var(--transition-fast);
  }
  .active-dot.is-active { color: var(--clr-ok); }
  .active-dot:not(.is-active) { color: var(--clr-text-dim); }
  .action-btns { display: flex; gap: var(--sp-1); }
  .table-footer {
    margin-top: var(--sp-3);
    font-size: var(--fs-xs);
    color: var(--clr-text-dim);
  }

  /* Modal */
  .modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.6);
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
  .modal-sm { max-width: 380px; }
  .modal-title {
    font-size: var(--fs-lg);
    font-weight: var(--fw-semibold);
    margin-bottom: var(--sp-5);
  }
  .modal-msg { color: var(--clr-text-muted); margin-bottom: var(--sp-2); }
  .modal-detail { font-weight: var(--fw-medium); margin-bottom: var(--sp-5); }
  .modal-actions {
    display: flex;
    justify-content: flex-end;
    gap: var(--sp-3);
    margin-top: var(--sp-6);
  }
</style>
