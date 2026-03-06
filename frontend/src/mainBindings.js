import { bindFlightLookup } from "./forms.js";

export function bindMainForms(actions, deps) {
  const { api, getState, getFlightProvider } = deps;
  document.getElementById("login-form").addEventListener("submit", actions.onLogin);
  document.getElementById("logout-btn").addEventListener("click", actions.onLogout);
  document.getElementById("trip-form").addEventListener("submit", actions.onCreateTrip);
  document.getElementById("trip-edit-form").addEventListener("submit", actions.onUpdateTrip);
  document.getElementById("flight-form").addEventListener("submit", actions.onUpsertFlight);
  document.getElementById("hotel-form").addEventListener("submit", actions.onUpsertHotel);
  document.getElementById("trip-select").addEventListener("change", actions.onSelectTripChange);
  document.getElementById("export-btn").addEventListener("click", actions.onExport);
  document.getElementById("import-file").addEventListener("change", actions.onImport);
  bindFlightLookup((fn, date) => api.lookupFlight(getState().token, fn, getFlightProvider(), date));
}
