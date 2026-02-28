function flightToLegacyRecord(flight) {
  const depDate = flight.departure_scheduled
    ? String(flight.departure_scheduled).slice(0, 10)
    : null;
  return {
    id: flight.id,
    createdAt: flight.created_at,
    flightDate: depDate,
    pnr: flight.pnr || null,
    paxNames: Array.isArray(flight.passenger_names) ? flight.passenger_names : [],
    route: {
      flightNumber: flight.flight_number || "",
      airline: flight.airline || null,
      departure: {
        airport: flight.departure_airport_name || null,
        iata: flight.departure_airport_code || null,
        scheduled: flight.departure_scheduled || null
      },
      arrival: {
        airport: flight.arrival_airport_name || null,
        iata: flight.arrival_airport_code || null,
        scheduled: flight.arrival_scheduled || null
      }
    }
  };
}

function hotelToLegacyRecord(hotel) {
  return {
    id: hotel.id,
    createdAt: hotel.created_at,
    hotelName: hotel.hotel_name || "",
    checkInDate: hotel.check_in_date || "",
    checkOutDate: hotel.check_out_date || "",
    paxCount: Number(hotel.pax_count || 1),
    paymentType: hotel.payment_type || "prepaid",
    confirmationId: hotel.confirmation_id || null,
    paxNames: Array.isArray(hotel.passenger_names) ? hotel.passenger_names : []
  };
}

export function buildLegacyTripsExportService(deps) {
  const { tripsRepository, flightsRepository, hotelsRepository } = deps;

  async function exportByOwner(ownerUserId) {
    const trips = await tripsRepository.listByOwner(ownerUserId);
    const output = [];

    for (const trip of trips) {
      const flights = await flightsRepository.listByTrip({
        tripId: trip.id,
        ownerUserId
      });
      const hotels = await hotelsRepository.listByTrip({
        tripId: trip.id,
        ownerUserId
      });

      output.push({
        id: trip.id,
        name: trip.name,
        createdAt: trip.created_at,
        updatedAt: trip.updated_at,
        records: flights.map(flightToLegacyRecord),
        hotels: hotels.map(hotelToLegacyRecord)
      });
    }

    return output;
  }

  return {
    exportByOwner
  };
}

