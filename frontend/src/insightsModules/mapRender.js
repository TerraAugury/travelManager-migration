const ROUTE_COLORS = ["#D32F2F", "#1565C0", "#2E7D32", "#F57F17", "#6A1B9A", "#00838F", "#E65100", "#37474F"];
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
  mapRoutesLayer?.clearLayers(); mapAirportsLayer?.clearLayers(); mapLabelsLayer?.clearLayers();
}
function showEmpty({ emptyEl, warnEl, mapEl, mapInstance, text }) {
  emptyEl.textContent = text;
  emptyEl.classList.remove("hidden");
  warnEl.classList.add("hidden");
  warnEl.textContent = "";
  mapEl.classList.add("hidden");
  mapInstance.setView([20, 0], 2);
  return [];
}
function keepNonOverlappingByCount(items, mapInstance) {
  const sorted = (items || []).slice().sort((a, b) => b.count - a.count);
  const kept = [];
  for (const item of sorted) {
    const p = mapInstance.latLngToContainerPoint(item.latLng);
    let collides = false;
    for (const keptItem of kept) {
      const kp = mapInstance.latLngToContainerPoint(keptItem.latLng);
      if (Math.hypot(p.x - kp.x, p.y - kp.y) < 30) { collides = true; break; }
    }
    if (!collides) kept.push(item);
  }
  return kept;
}
export function repositionBadges({ mapInstance, mapLabelsLayer, badgeData, mapState }) {
  mapLabelsLayer?.clearLayers();
  if (!mapInstance || !mapState?.showBadges) return;
  const zoom = mapInstance.getZoom();
  if (zoom < 4) return;
  const candidates = [];
  for (const badge of Array.isArray(badgeData) ? badgeData : []) {
    if (badge.isDimmed) continue;
    const total = (badge.countAB || 0) + (badge.countBA || 0);
    if (zoom < 6 && total < 3) continue;
    const arcPx = (badge.arc || []).map((latLng) => mapInstance.project(window.L.latLng(latLng[0], latLng[1]), zoom));
    const pAB = badge.countAB ? badge.getProjectedPolylinePointAtFraction(arcPx, 1 / 3) : null;
    const pBA = badge.countBA ? badge.getProjectedPolylinePointAtFraction(arcPx, 2 / 3) : null;
    const offset = 12;
    if (pAB && badge.countAB) {
      const llAB = mapInstance.unproject(window.L.point(pAB.point.x - pAB.dir.y * offset, pAB.point.y + pAB.dir.x * offset), zoom);
      const html = `<div class="route-count-badge" style="color:${badge.color};"><div class="route-count-num">${badge.countAB}</div><div class="route-count-arrow" style="transform:rotate(${badge.rotAB}deg);">&#9992;</div></div>`;
      candidates.push({ latLng: llAB, count: badge.countAB, html, popup: badge.popupForward });
    }
    if (pBA && badge.countBA) {
      const llBA = mapInstance.unproject(window.L.point(pBA.point.x + pBA.dir.y * offset, pBA.point.y - pBA.dir.x * offset), zoom);
      const html = `<div class="route-count-badge" style="color:${badge.color};"><div class="route-count-num">${badge.countBA}</div><div class="route-count-arrow" style="transform:rotate(${badge.rotBA}deg);">&#9992;</div></div>`;
      candidates.push({ latLng: llBA, count: badge.countBA, html, popup: badge.popupBack });
    }
  }
  const visible = keepNonOverlappingByCount(candidates, mapInstance);
  for (const badge of visible) {
    window.L.marker(badge.latLng, { pane: "labelsPane", zIndexOffset: badge.count, icon: window.L.divIcon({ className: "route-count-icon", html: badge.html, iconSize: [50, 50], iconAnchor: [25, 25] }) })
      .bindPopup(badge.popup).addTo(mapLabelsLayer);
  }
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

  const badgeData = [];
  for (let routeIndex = 0; routeIndex < routeBuckets.length; routeIndex += 1) {
    const route = routeBuckets[routeIndex];
    const dep = route.a;
    const arr = route.b;
    const routeKey = `${route.aKey}__${route.bKey}`;
    const assignedColor = ROUTE_COLORS[routeIndex % ROUTE_COLORS.length];
    const isSelected = mapState.routeKey ? mapState.routeKey === routeKey : true;
    const isDimmed = !!mapState.routeKey && !isSelected;
    const lineColor = isDimmed ? "#CBD5E1" : assignedColor;
    const lineOpacity = mapState.routeKey ? (isSelected ? 1 : 0.35) : 0.75;
    const countAB = route.flightsAB.length;
    const countBA = route.flightsBA.length;
    const total = countAB + countBA;
    if (!total) continue;
    const arc = buildGreatCircleArcLatLngs(dep, arr, estimateArcSegments(dep, arr));
    const countsHtml = `${esc(dep.city)} &rarr; ${esc(arr.city)}: <b>${countAB}</b> &nbsp;|&nbsp; ${esc(arr.city)} &rarr; ${esc(dep.city)}: <b>${countBA}</b>`;
    const popupAll = popupHtml({ depCity: dep.city, arrCity: arr.city, flights: route.flightsAB.concat(route.flightsBA), countsHtml, esc });
    const popupForward = popupHtml({ depCity: dep.city, arrCity: arr.city, flights: route.flightsAB, esc });
    const popupBack = popupHtml({ depCity: arr.city, arrCity: dep.city, flights: route.flightsBA, esc });
    window.L.polyline(arc, { color: lineColor, weight: Math.min(9, 3 + Math.log2(total + 1)), opacity: lineOpacity, pane: "routesPane" }).bindPopup(popupAll).addTo(mapRoutesLayer);

    const bearing = computeBearingDegrees(dep.lat, dep.lon, arr.lat, arr.lon);
    const rotAB = Math.round(bearing) - 90;
    const rotBA = Math.round((bearing + 180) % 360) - 90;
    badgeData.push({
      arc,
      countAB,
      countBA,
      popupForward,
      popupBack,
      rotAB,
      rotBA,
      color: assignedColor,
      isDimmed,
      getProjectedPolylinePointAtFraction
    });
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
  repositionBadges({ mapInstance, mapLabelsLayer, badgeData, mapState, esc });
  setTimeout(() => mapInstance && mapInstance.invalidateSize(), 0);
  return badgeData;
}
