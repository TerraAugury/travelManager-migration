function flightToLegacyRecord(flight, passengerNames) {
  const depDate = flight.departure_scheduled
    ? String(flight.departure_scheduled).slice(0, 10)
    : null;
  return {
    id: flight.id,
    createdAt: flight.created_at,
    flightDate: depDate,
    pnr: flight.pnr || null,
    paxNames: passengerNames,
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

function hotelToLegacyRecord(hotel, passengerNames) {
  return {
    id: hotel.id,
    createdAt: hotel.created_at,
    hotelName: hotel.hotel_name || "",
    checkInDate: hotel.check_in_date || "",
    checkOutDate: hotel.check_out_date || "",
    paxCount: Number(hotel.pax_count || 1),
    paymentType: hotel.payment_type || "prepaid",
    confirmationId: hotel.confirmation_id || null,
    paxNames: passengerNames
  };
}

export function buildLegacyTripsExportService(deps) {
  const { tripsRepository, flightsRepository, hotelsRepository, passengersRepository } = deps;

  async function exportByOwner(ownerUserId) {
    const [trips, flights, hotels] = await Promise.all([
      tripsRepository.listByOwner(ownerUserId),
      flightsRepository.listByOwner(ownerUserId),
      hotelsRepository.listByOwner(ownerUserId)
    ]);

    const flightsByTrip = new Map();
    for (const flight of flights) {
      const list = flightsByTrip.get(flight.trip_id) || [];
      list.push(flight);
      flightsByTrip.set(flight.trip_id, list);
    }

    const hotelsByTrip = new Map();
    for (const hotel of hotels) {
      const list = hotelsByTrip.get(hotel.trip_id) || [];
      list.push(hotel);
      hotelsByTrip.set(hotel.trip_id, list);
    }

    return Promise.all(
      trips.map(async (trip) => {
        const records = await Promise.all(
          (flightsByTrip.get(trip.id) || []).map(async (flight) =>
            flightToLegacyRecord(
              flight,
              await passengersRepository.listPassengersForFlight(flight.id)
            )
          )
        );
        const hotelsOut = await Promise.all(
          (hotelsByTrip.get(trip.id) || []).map(async (hotel) =>
            hotelToLegacyRecord(
              hotel,
              await passengersRepository.listPassengersForHotel(hotel.id)
            )
          )
        );
        return {
          id: trip.id,
          name: trip.name,
          createdAt: trip.created_at,
          updatedAt: trip.updated_at,
          records,
          hotels: hotelsOut
        };
      })
    );
  }

  return {
    exportByOwner
  };
}
