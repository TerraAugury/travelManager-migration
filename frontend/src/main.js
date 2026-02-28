import * as api from "./api.js";
import { render } from "./render.js";
import { getState, loadToken, setToken, setTrips, setUser } from "./state.js";

async function refreshTrips() {
  const token = getState().token;
  const trips = await api.listTrips(token);
  setTrips(trips);
}

async function bootstrap() {
  loadToken();
  render("Bootstrapping...");

  const loginForm = document.getElementById("login-form");
  const logoutBtn = document.getElementById("logout-btn");
  const tripForm = document.getElementById("trip-form");
  const exportBtn = document.getElementById("export-btn");
  const importFile = document.getElementById("import-file");

  const handleDelete = async (tripId) => {
    try {
      await api.deleteTrip(getState().token, tripId);
      await refreshTrips();
      render("Trip deleted.", handleDelete);
    } catch (error) {
      render(`Delete failed: ${error.message}`, handleDelete);
    }
  };

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const email = document.getElementById("login-email").value.trim();
    const password = document.getElementById("login-password").value;
    try {
      const out = await api.login(email, password);
      setToken(out.token);
      setUser(out.user);
      await refreshTrips();
      render("Login successful.", handleDelete);
    } catch (error) {
      render(`Login failed: ${error.message}`, handleDelete);
    }
  });

  logoutBtn.addEventListener("click", async () => {
    try {
      if (getState().token) await api.logout(getState().token);
    } catch {
      // Continue local logout even if API call fails.
    } finally {
      setToken(null);
      setUser(null);
      setTrips([]);
      render("Logged out.", handleDelete);
    }
  });

  tripForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const name = document.getElementById("trip-name").value.trim();
    const startDate = document.getElementById("trip-start").value || null;
    const endDate = document.getElementById("trip-end").value || null;
    try {
      await api.createTrip(getState().token, { name, startDate, endDate });
      tripForm.reset();
      await refreshTrips();
      render("Trip created.", handleDelete);
    } catch (error) {
      render(`Create failed: ${error.message}`, handleDelete);
    }
  });

  exportBtn.addEventListener("click", async () => {
    try {
      const payload = await api.exportLegacyTrips(getState().token);
      const blob = new Blob([JSON.stringify(payload, null, 2)], {
        type: "application/json"
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "trips-legacy-export.json";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      render("Legacy export downloaded.", handleDelete);
    } catch (error) {
      render(`Export failed: ${error.message}`, handleDelete);
    }
  });

  importFile.addEventListener("change", async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const payload = JSON.parse(text);
      const out = await api.importLegacyTrips(getState().token, payload);
      setTrips(out.items || []);
      render(`Import completed: ${out.importedTrips} trip(s).`, handleDelete);
    } catch (error) {
      render(`Import failed: ${error.message}`, handleDelete);
    } finally {
      importFile.value = "";
    }
  });

  if (getState().token) {
    try {
      const user = await api.me(getState().token);
      setUser(user);
      await refreshTrips();
      render("Session restored.", handleDelete);
    } catch {
      setToken(null);
      setUser(null);
      setTrips([]);
      render("Previous session expired. Please sign in.", handleDelete);
    }
  }
}

bootstrap();

