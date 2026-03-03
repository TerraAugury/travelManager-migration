function esc(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function fmtDate(value) {
  return value ? String(value).slice(0, 10) : "–";
}

function renderUserTile(user, editingId) {
  const editing = editingId === user.id;
  return `<div class="event-tile">
    <div class="event-tile-header"><div><div class="event-tile-title">${esc(user.email)}</div><div class="event-tile-meta">${esc(user.display_name)} · ${esc(user.role)} · ${user.is_active ? "active" : "inactive"} · created ${fmtDate(user.created_at)}</div></div><span class="event-tile-badge">${esc(user.role)}</span></div>
    <div class="event-tile-actions"><button type="button" class="btn btn-ghost btn-xs" data-admin-edit="${esc(user.id)}">${editing ? "Close" : "Edit"}</button><button type="button" class="btn btn-danger btn-xs" data-admin-delete="${esc(user.id)}">Deactivate</button></div>
    ${editing ? `<form class="form-stack admin-user-edit-form" data-user-id="${esc(user.id)}"><div class="field-group"><div class="field"><label>Display Name</label><input name="display_name" type="text" maxlength="120" value="${esc(user.display_name)}" required/></div><div class="field"><label>Role</label><select name="role"><option value="user"${user.role === "user" ? " selected" : ""}>User</option><option value="admin"${user.role === "admin" ? " selected" : ""}>Admin</option></select></div><div class="field"><label>Active</label><select name="is_active"><option value="true"${user.is_active ? " selected" : ""}>Active</option><option value="false"${!user.is_active ? " selected" : ""}>Inactive</option></select></div></div><div class="field"><label>Reset Password (optional)</label><input name="password" type="password" minlength="8" autocomplete="new-password"/></div><div class="btn-row"><button type="submit" class="btn btn-primary btn-xs">Save</button><button type="button" class="btn btn-ghost btn-xs" data-admin-cancel="1">Cancel</button></div></form>` : ""}
  </div>`;
}

export function ensureAdminUsersMarkup() {
  const tabs = document.querySelector(".screen-tabs.desktop-tabs");
  const nav = document.querySelector(".bottom-nav");
  const screens = document.querySelector(".screen-container");
  if (tabs && !document.getElementById("users-tab-btn")) {
    const btn = document.createElement("button");
    btn.id = "users-tab-btn";
    btn.className = "tab-btn hidden";
    btn.dataset.screen = "users";
    btn.textContent = "Users";
    tabs.appendChild(btn);
  }
  if (nav && !document.getElementById("users-nav-btn")) {
    const btn = document.createElement("button");
    btn.id = "users-nav-btn";
    btn.className = "nav-btn hidden";
    btn.dataset.screen = "users";
    btn.innerHTML = '<span class="nav-icon">👤</span><span class="nav-label">Users</span>';
    nav.appendChild(btn);
  }
  if (screens && !document.getElementById("screen-users")) {
    const section = document.createElement("section");
    section.id = "screen-users";
    section.className = "screen";
    section.innerHTML = `<div class="card card-daycount">
      <div class="card-title">User Management</div>
      <p id="admin-users-guard" class="hint hidden"></p>
      <div id="admin-users-content" class="form-stack">
        <form id="admin-users-filter-form" class="field-group">
          <div class="field"><label for="admin-users-role-filter">Role</label><select id="admin-users-role-filter" name="role"><option value="">All</option><option value="admin">Admin</option><option value="user">User</option></select></div>
          <div class="field"><label for="admin-users-active-filter">Active</label><select id="admin-users-active-filter" name="active"><option value="">All</option><option value="true">Active</option><option value="false">Inactive</option></select></div>
          <div class="field"><label>&nbsp;</label><button type="submit" class="btn btn-ghost">Apply Filters</button></div>
        </form>
        <form id="admin-users-create-form" class="form-stack">
          <div class="field-group">
            <div class="field"><label for="admin-user-email">Email</label><input id="admin-user-email" name="email" type="email" required autocomplete="off"/></div>
            <div class="field"><label for="admin-user-password">Password</label><input id="admin-user-password" name="password" type="password" minlength="8" required autocomplete="new-password"/></div>
          </div>
          <div class="field-group">
            <div class="field"><label for="admin-user-display-name">Display Name</label><input id="admin-user-display-name" name="display_name" type="text" maxlength="120" required/></div>
            <div class="field"><label for="admin-user-role">Role</label><select id="admin-user-role" name="role"><option value="user">User</option><option value="admin">Admin</option></select></div>
          </div>
          <button type="submit" class="btn btn-primary">Create User</button>
        </form>
        <p id="admin-users-feedback" class="hint hidden"></p>
        <div id="admin-users-list" class="tiles-grid"><div class="tiles-empty">Loading users…</div></div>
      </div>
    </div>`;
    screens.appendChild(section);
  }
}

export function syncAdminNavVisibility(showAdmin) {
  ["users-tab-btn", "users-nav-btn"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.classList.toggle("hidden", !showAdmin);
  });
  const nav = document.querySelector(".bottom-nav");
  if (!nav) return;
  const visible = nav.querySelectorAll(".nav-btn:not(.hidden)").length || 1;
  nav.style.gridTemplateColumns = `repeat(${visible}, 1fr)`;
}

export function toggleAdminUsersAccess(isAdmin) {
  const guard = document.getElementById("admin-users-guard");
  const content = document.getElementById("admin-users-content");
  if (!guard || !content) return;
  if (isAdmin) {
    guard.classList.add("hidden");
    content.classList.remove("hidden");
    return;
  }
  guard.classList.remove("hidden");
  guard.textContent = "You are not authorized to access user management.";
  content.classList.add("hidden");
}

export function paintAdminUsersList(state) {
  const list = document.getElementById("admin-users-list");
  const feedback = document.getElementById("admin-users-feedback");
  if (!list || !feedback) return;
  feedback.classList.toggle("hidden", !state.message && !state.error);
  feedback.textContent = state.error || state.message;
  feedback.classList.toggle("field-error", Boolean(state.error));

  if (state.loading) {
    list.innerHTML = '<div class="tiles-empty">Loading users…</div>';
    return;
  }
  if (state.error) {
    list.innerHTML = '<div class="tiles-empty">Could not load users. Try again.</div>';
    return;
  }
  if (!state.users.length) {
    list.innerHTML = '<div class="tiles-empty">No users found for current filters.</div>';
    return;
  }
  list.innerHTML = state.users.map((user) => renderUserTile(user, state.editingId)).join("");
}
