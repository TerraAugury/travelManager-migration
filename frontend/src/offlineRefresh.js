function asArray(value) {
  return Array.isArray(value) ? value : [];
}

export function createOfflineRefresh(deps) {
  const {
    api,
    getState,
    setTrips,
    setSelectedTripId,
    setFlights,
    setHotels,
    setPassengers,
    setOfflineData,
    getOfflineData,
    setOffline
  } = deps;

  async function refreshTrips() {
    let trips = [];
    try {
      trips = await api.listTrips(getState().token);
      setOffline(false);
      await setOfflineData("trips", trips);
    } catch {
      setOffline(true);
      trips = asArray(await getOfflineData("trips"));
    }
    setTrips(trips);
    if (!getState().selectedTripId && trips.length) setSelectedTripId(trips[0].id);
    return trips;
  }

  async function refreshTripDetails() {
    const { selectedTripId: tripId, token } = getState();
    if (!tripId) {
      setFlights([]);
      setHotels([]);
      setPassengers([]);
      return;
    }
    let flights = [];
    let hotels = [];
    let passengers = [];
    try {
      [flights, hotels, passengers] = await Promise.all([
        api.listFlights(token, tripId),
        api.listHotels(token, tripId),
        api.listPassengers(token, tripId)
      ]);
      setOffline(false);
      await Promise.all([
        setOfflineData(`flights:${tripId}`, flights),
        setOfflineData(`hotels:${tripId}`, hotels),
        setOfflineData(`passengers:${tripId}`, passengers)
      ]);
    } catch {
      setOffline(true);
      [flights, hotels, passengers] = await Promise.all([
        getOfflineData(`flights:${tripId}`),
        getOfflineData(`hotels:${tripId}`),
        getOfflineData(`passengers:${tripId}`)
      ]);
      flights = asArray(flights);
      hotels = asArray(hotels);
      passengers = asArray(passengers);
    }
    setFlights(flights);
    setHotels(hotels);
    setPassengers(passengers);
  }

  return {
    refreshTrips,
    refreshTripDetails
  };
}
