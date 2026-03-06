const OFFLINE_WRITE_MESSAGE = "You are offline. This action requires an internet connection.";

export function requireOnline(isOffline) {
  if (!isOffline) return true;
  window.alert(OFFLINE_WRITE_MESSAGE);
  return false;
}

export function syncOfflineUi(isOffline) {
  document.getElementById("offline-banner")?.classList.toggle("hidden", !isOffline);
  if (!isOffline) return;
  const addFlight = document.getElementById("add-flight-btn");
  const addHotel = document.getElementById("add-hotel-btn");
  if (addFlight) addFlight.disabled = true;
  if (addHotel) addHotel.disabled = true;
}
