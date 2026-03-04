function buildFlightsList(flights, esc) {
  const lines = (flights || [])
    .slice()
    .sort((a, b) => a.date - b.date)
    .slice(0, 8)
    .map((flight) => {
      const dt = flight.date ? flight.date.toLocaleDateString() : "";
      const label = [String(flight.airline || "").trim(), String(flight.flightNumber || "").trim()].filter(Boolean).join(" ") || "Flight";
      return `<div style="margin-top:4px;"><span style="font-weight:600;">${esc(label)}</span>${dt ? ` &ndash; ${esc(dt)}` : ""}</div>`;
    })
    .join("");
  return { lines, more: Math.max(0, (flights || []).length - 8) };
}

function popupHtml({ depCity, arrCity, flights, countsHtml, esc }) {
  const pax = Array.from(new Set((flights || []).flatMap((flight) => flight.paxNames || []))).sort((a, b) => a.localeCompare(b));
  const { lines, more } = buildFlightsList(flights, esc);
  const count = (flights || []).length;
  return `<div style="min-width:200px;max-width:260px;line-height:1.35;word-break:break-word;"><div style="font-weight:800;">${esc(depCity)} &rarr; ${esc(arrCity)}</div><div style="margin-top:4px;">${count} flight${count === 1 ? "" : "s"}</div>${countsHtml ? `<div style="margin-top:6px;color:#6b7280;font-size:12px;">${countsHtml}</div>` : ""}${pax.length ? `<div style="margin-top:8px;"><b>Pax:</b> ${esc(pax.join(", "))}</div>` : ""}${lines ? `<div style="margin-top:10px;">${lines}</div>` : ""}${more ? `<div style="margin-top:6px;color:#6b7280;">+${more} more</div>` : ""}</div>`;
}

function resetMapLayers({ mapRoutesLayer, mapAirportsLayer, mapLabelsLayer }) {
  mapRoutesLayer?.clearLayers();
  mapAirportsLayer?.clearLayers();
  mapLabelsLayer?.clearLayers();
}

function showEmpty({ emptyEl, warnEl, mapEl, mapInstance, text }) {
  emptyEl.textContent = text;
  emptyEl.classList.remove("hidden");
  warnEl.classList.add("hidden");
  warnEl.textContent = "";
  mapEl.classList.add("hidden");
  mapInstance.setView([20, 0], 2);
}

export function renderMapFlightsLayers(opts) {
  const {
    trips, mapState, els, mapInstance, mapRoutesLayer, mapAirportsLayer, mapLabelsLayer,
    getPassengerFlights, dedupeFlightsForMap, buildCityIndexFromAirportCoords, mapFlightToCityRoute, getMapNodeFromAirportCode,
    computeBearingDegrees, buildGreatCircleArcLatLngs, estimateArcSegments, getProjectedPolylinePointAtFraction, esc
  } = opts;
  const emptyEl = els["map-empty"];
  const warnEl = els["map-warning"];
  const mapEl = els["map-canvas"];
  const yearFlights = dedupeFlightsForMap(getPassengerFlights(trips, null)).filter((f) => f.date.getFullYear() === mapState.year);
  const filtered = mapState.passenger ? yearFlights.filter((f) => (f.paxNames || []).includes(mapState.passenger)) : yearFlights;

  resetMapLayers({ mapRoutesLayer, mapAirportsLayer, mapLabelsLayer });
  if (!filtered.length) return showEmpty({ emptyEl, warnEl, mapEl, mapInstance, text: "No flights for this selection." });

  const cityIndex = buildCityIndexFromAirportCoords();
  const routesMap = new Map();
  const nodesUsed = new Map();
  const missingCodes = new Set();
  let mappedFlights = 0;
  let skippedMissing = 0;
  let skippedSameCity = 0;

  for (const flight of filtered) {
    const dep = getMapNodeFromAirportCode(flight.departureCode, cityIndex);
    const arr = getMapNodeFromAirportCode(flight.arrivalCode, cityIndex);
    if (!dep) missingCodes.add(String(flight.departureCode || "").toUpperCase() || "Unknown departure");
    if (!arr) missingCodes.add(String(flight.arrivalCode || "").toUpperCase() || "Unknown arrival");
    if (!dep || !arr) { skippedMissing += 1; continue; }
    if (dep.key === arr.key) { skippedSameCity += 1; continue; }
    const info = mapFlightToCityRoute(flight, cityIndex);
    if (!info) continue;
    if (mapState.routeKey && info.routeKey !== mapState.routeKey) continue;
    mappedFlights += 1;
    nodesUsed.set(dep.key, dep);
    nodesUsed.set(arr.key, arr);
    const bucket = routesMap.get(info.routeKey) || { a: null, b: null, aKey: info.aKey, bKey: info.bKey, flightsAB: [], flightsBA: [] };
    const nodeA = dep.key === info.aKey ? dep : arr;
    const nodeB = dep.key === info.aKey ? arr : dep;
    if (!bucket.a) bucket.a = nodeA;
    if (!bucket.b) bucket.b = nodeB;
    if (dep.key === info.aKey) bucket.flightsAB.push(flight);
    else bucket.flightsBA.push(flight);
    routesMap.set(info.routeKey, bucket);
  }

  const routeBuckets = Array.from(routesMap.values()).sort((a, b) => (b.flightsAB.length + b.flightsBA.length) - (a.flightsAB.length + a.flightsBA.length));
  if (!routeBuckets.length) return showEmpty({ emptyEl, warnEl, mapEl, mapInstance, text: "No mappable flights for this selection (missing airport coordinates)." });

  emptyEl.classList.add("hidden");
  mapEl.classList.remove("hidden");
  mapInstance.invalidateSize();
  const bounds = [];
  routeBuckets.forEach((route) => bounds.push([route.a.lat, route.a.lon], [route.b.lat, route.b.lon]));
  if (bounds.length) mapInstance.fitBounds(window.L.latLngBounds(bounds), { padding: [18, 18] });

  for (const route of routeBuckets) {
    const dep = route.a;
    const arr = route.b;
    const countAB = route.flightsAB.length;
    const countBA = route.flightsBA.length;
    const total = countAB + countBA;
    if (!total) continue;
    const arc = buildGreatCircleArcLatLngs(dep, arr, estimateArcSegments(dep, arr));
    const countsHtml = `${esc(dep.city)} &rarr; ${esc(arr.city)}: <b>${countAB}</b> &nbsp;|&nbsp; ${esc(arr.city)} &rarr; ${esc(dep.city)}: <b>${countBA}</b>`;
    const popupAll = popupHtml({ depCity: dep.city, arrCity: arr.city, flights: route.flightsAB.concat(route.flightsBA), countsHtml, esc });
    const popupForward = popupHtml({ depCity: dep.city, arrCity: arr.city, flights: route.flightsAB, esc });
    const popupBack = popupHtml({ depCity: arr.city, arrCity: dep.city, flights: route.flightsBA, esc });
    window.L.polyline(arc, { color: "#D32F2F", weight: Math.min(9, 3 + Math.log2(total + 1)), opacity: 0.75, pane: "routesPane" }).bindPopup(popupAll).addTo(mapRoutesLayer);

    const bearing = computeBearingDegrees(dep.lat, dep.lon, arr.lat, arr.lon);
    const rotAB = Math.round(bearing) - 90;
    const rotBA = Math.round((bearing + 180) % 360) - 90;
    const zoom = mapInstance.getZoom();
    const arcPx = arc.map((ll) => mapInstance.project(window.L.latLng(ll[0], ll[1]), zoom));
    const pAB = getProjectedPolylinePointAtFraction(arcPx, 1 / 3);
    const pBA = getProjectedPolylinePointAtFraction(arcPx, 2 / 3);
    if (!pAB || !pBA) continue;
    const offset = 12;
    const llAB = mapInstance.unproject(window.L.point(pAB.point.x - pAB.dir.y * offset, pAB.point.y + pAB.dir.x * offset), zoom);
    const llBA = mapInstance.unproject(window.L.point(pBA.point.x + pBA.dir.y * offset, pBA.point.y - pBA.dir.x * offset), zoom);
    if (mapState.showBadges && countAB) {
      const html = `<div class="route-count-badge"><div class="route-count-num">${countAB}</div><div class="route-count-arrow" style="transform:rotate(${rotAB}deg);">&#9992;</div></div>`;
      window.L.marker(llAB, { pane: "labelsPane", zIndexOffset: countAB, icon: window.L.divIcon({ className: "route-count-icon", html, iconSize: [44, 44], iconAnchor: [22, 22] }) }).bindPopup(popupForward).addTo(mapLabelsLayer);
    }
    if (mapState.showBadges && countBA) {
      const html = `<div class="route-count-badge"><div class="route-count-num">${countBA}</div><div class="route-count-arrow" style="transform:rotate(${rotBA}deg);">&#9992;</div></div>`;
      window.L.marker(llBA, { pane: "labelsPane", zIndexOffset: countBA, icon: window.L.divIcon({ className: "route-count-icon", html, iconSize: [44, 44], iconAnchor: [22, 22] }) }).bindPopup(popupBack).addTo(mapLabelsLayer);
    }
  }

  for (const node of nodesUsed.values()) {
    const codes = (node.airports || []).map((airport) => airport.code).filter(Boolean).sort();
    window.L.circleMarker([node.lat, node.lon], { pane: "airportsPane", radius: 6, color: "#1A237E", weight: 1, fillColor: "#1A237E", fillOpacity: 0.9 })
      .bindPopup(`<b>${esc(node.city)}</b>${codes.length ? `<div style="margin-top:6px;color:#6b7280;">${esc(codes.join(", "))}</div>` : ""}`)
      .addTo(mapAirportsLayer);
  }

  if (missingCodes.size) {
    warnEl.classList.remove("hidden");
    warnEl.textContent = `Showing ${mappedFlights} of ${filtered.length} flights on the map. Missing coordinates for: ${Array.from(missingCodes).filter(Boolean).sort().join(", ")}.`;
  } else {
    const skipped = skippedMissing + skippedSameCity;
    if (skipped > 0) {
      warnEl.classList.remove("hidden");
      warnEl.textContent = `Showing ${mappedFlights} of ${filtered.length} flights on the map. ${skippedSameCity ? `${skippedSameCity} within the same city were skipped. ` : ""}${skippedMissing ? `${skippedMissing} missing coordinates were skipped.` : ""}`.trim();
    } else {
      warnEl.classList.add("hidden");
      warnEl.textContent = "";
    }
  }
  setTimeout(() => mapInstance && mapInstance.invalidateSize(), 0);
}
