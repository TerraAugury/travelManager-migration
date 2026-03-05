import * as api from "./api.js";
import { getState } from "./state.js";
import { confirmAction } from "./confirmDialog.js";
import {
  ensureAdminUsersMarkup,
  paintAdminUsersList,
  syncAdminNavVisibility,
  toggleAdminUsersAccess
} from "./adminUsersView.js";

const adminState = {
  bound: false,
  loadedToken: null,
  loading: false,
  users: [],
  filters: { role: "", active: "" },
  editingId: null,
  message: "",
  error: "",
  needsReload: false
};

function resetForLogout() {
  adminState.loadedToken = null;
  adminState.loading = false;
  adminState.users = [];
  adminState.editingId = null;
  adminState.message = "";
  adminState.error = "";
  adminState.needsReload = false;
}

export function buildUsersQuery(filters = {}) {
  const params = new URLSearchParams();
  if (filters.role) params.set("role", filters.role);
  if (filters.active === "true" || filters.active === "false") {
    params.set("active", filters.active);
  }
  const query = params.toString();
  return query ? `?${query}` : "";
}

export function buildUpdateUserBody(input) {
  const out = {
    display_name: String(input.display_name || "").trim(),
    role: input.role === "admin" ? "admin" : "user",
    is_active: String(input.is_active || "true") === "true"
  };
  const password = String(input.password || "").trim();
  if (password) out.password = password;
  return out;
}

async function loadUsers() {
  const token = getState().token;
  if (!token) return;
  adminState.needsReload = false;
  adminState.loading = true;
  adminState.error = "";
  paintAdminUsersList(adminState);
  try {
    adminState.users = await api.listUsers(token, adminState.filters);
  } catch (error) {
    adminState.error = error.message;
  } finally {
    adminState.loading = false;
    paintAdminUsersList(adminState);
  }
}

function bindEvents() {
  if (adminState.bound) return;
  const screen = document.getElementById("screen-users");
  if (!screen) return;
  screen.addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      if (event.target.id === "admin-users-filter-form") {
        const form = new FormData(event.target);
        adminState.filters = {
          role: String(form.get("role") || ""),
          active: String(form.get("active") || "")
        };
        adminState.message = "";
        return loadUsers();
      }
      if (event.target.id === "admin-users-create-form") {
        const data = new FormData(event.target);
        await api.createUser(getState().token, Object.fromEntries(data.entries()));
        event.target.reset();
        adminState.message = "User created.";
        adminState.error = "";
        return loadUsers();
      }
      if (event.target.classList.contains("admin-user-edit-form")) {
        const data = new FormData(event.target);
        await api.updateUser(
          getState().token,
          event.target.dataset.userId,
          buildUpdateUserBody(Object.fromEntries(data.entries()))
        );
        adminState.editingId = null;
        adminState.message = "User updated.";
        adminState.error = "";
        return loadUsers();
      }
    } catch (error) {
      adminState.error = error.message;
      adminState.message = "";
      paintAdminUsersList(adminState);
    }
  });
  screen.addEventListener("click", async (event) => {
    const editId = event.target.closest("[data-admin-edit]")?.dataset.adminEdit;
    const deleteId = event.target.closest("[data-admin-delete]")?.dataset.adminDelete;
    const cancel = event.target.closest("[data-admin-cancel]");
    if (editId) adminState.editingId = adminState.editingId === editId ? null : editId;
    if (cancel) adminState.editingId = null;
    if (deleteId) {
      try {
        const user = adminState.users.find((row) => row.id === deleteId);
        const label = user?.email || "this user";
        const confirmed = await confirmAction({
          title: "Deactivate user?",
          message: `You are about to deactivate ${label}. They will no longer be able to sign in.`,
          confirmText: "Confirm",
          cancelText: "Cancel",
          danger: true
        });
        if (!confirmed) return;
        await api.deleteUser(getState().token, deleteId);
        adminState.editingId = null;
        adminState.message = "User deactivated.";
        adminState.error = "";
        await loadUsers();
      } catch (error) {
        adminState.error = error.message;
        adminState.message = "";
      }
    }
    paintAdminUsersList(adminState);
  });
  adminState.bound = true;
}

export function renderAdminUsers() {
  ensureAdminUsersMarkup();
  bindEvents();
  const user = getState().user;
  const token = getState().token;
  const isAdmin = Boolean(user && token && user.role === "admin");
  syncAdminNavVisibility(Boolean(user && user.role === "admin"));
  toggleAdminUsersAccess(isAdmin);
  if (!isAdmin) {
    resetForLogout();
    return;
  }
  if (adminState.loadedToken !== token) {
    adminState.loadedToken = token;
    adminState.needsReload = true;
  }
  paintAdminUsersList(adminState);
  if (adminState.needsReload && !adminState.loading) {
    adminState.needsReload = false;
    void loadUsers();
  }
}
