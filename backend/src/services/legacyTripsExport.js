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
    const trips = await tripsRepository.listByOwner(ownerUserId);
    const output = [];

    for (const trip of trips) {
      const flights = await flightsRepository.listByTrip({ tripId: trip.id, ownerUserId });
      const hotels = await hotelsRepository.listByTrip({ tripId: trip.id, ownerUserId });

      const flightRecords = await Promise.all(
        flights.map(async (f) => {
          const names = await passengersRepository.listPassengersForFlight(f.id);
          return flightToLegacyRecord(f, names);
        })
      );

      const hotelRecords = await Promise.all(
        hotels.map(async (h) => {
          const names = await passengersRepository.listPassengersForHotel(h.id);
          return hotelToLegacyRecord(h, names);
        })
      );

      output.push({
        id: trip.id,
        name: trip.name,
        createdAt: trip.created_at,
        updatedAt: trip.updated_at,
        records: flightRecords,
        hotels: hotelRecords
      });
    }

    return output;
  }

  return {
    exportByOwner
  };
}
