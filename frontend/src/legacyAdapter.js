function toFlightRecord(flight) {
  const depScheduled = flight?.departure_scheduled || null;
  const arrScheduled = flight?.arrival_scheduled || null;
  return {
    id: flight?.id || null,
    pnr: flight?.pnr || "",
    flightDate: depScheduled ? String(depScheduled).slice(0, 10) : null,
    createdAt: flight?.created_at || null,
    paxNames: Array.isArray(flight?.passenger_names) ? flight.passenger_names : [],
    route: {
      airline: flight?.airline || null,
      flightNumber: flight?.flight_number || "",
      departure: {
        iata: flight?.departure_airport_code || null,
        airport: flight?.departure_airport_name || flight?.departure_airport_code || null,
        scheduled: depScheduled
      },
      arrival: {
        iata: flight?.arrival_airport_code || null,
        airport: flight?.arrival_airport_name || flight?.arrival_airport_code || null,
        scheduled: arrScheduled
      }
    }
  };
}

function toHotelRecord(hotel) {
  return {
    id: hotel?.id || null,
    hotelName: hotel?.hotel_name || "",
    confirmationId: hotel?.confirmation_id || null,
    checkInDate: hotel?.check_in_date || null,
    checkOutDate: hotel?.check_out_date || null,
    paymentType: hotel?.payment_type || "prepaid",
    paxCount: hotel?.pax_count || 1,
    paxNames: Array.isArray(hotel?.passenger_names) ? hotel.passenger_names : [],
    createdAt: hotel?.created_at || null
  };
}

export function buildLegacyTrips(trips, detailsByTripId) {
  return (Array.isArray(trips) ? trips : []).map((trip) => {
    const details = detailsByTripId.get(trip.id) || {};
    const flights = Array.isArray(details.flights) ? details.flights.map(toFlightRecord) : [];
    const hotels = Array.isArray(details.hotels) ? details.hotels.map(toHotelRecord) : [];
    return {
      id: trip.id,
      name: trip.name,
      notes: trip.notes || null,
      startDate: trip.start_date || null,
      endDate: trip.end_date || null,
      records: flights,
      hotels
    };
  });
}
