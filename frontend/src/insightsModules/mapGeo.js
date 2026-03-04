import { airportCoords } from "./airportCoords.js";

export function buildCityIndexFromAirportCoords() {
  const cityIndex = new Map();
  for (const [code, entry] of Object.entries(airportCoords || {})) {
    const city = String(entry?.city || "").trim();
    if (!city) continue;
    if (typeof entry?.lat !== "number" || typeof entry?.lon !== "number") continue;
    let group = cityIndex.get(city);
    if (!group) {
      group = { city, airports: [], lat: 0, lon: 0 };
      cityIndex.set(city, group);
    }
    group.airports.push({ code, name: entry.name || code, lat: entry.lat, lon: entry.lon });
  }
  for (const group of cityIndex.values()) {
    const n = group.airports.length || 1;
    group.lat = group.airports.reduce((acc, airport) => acc + airport.lat, 0) / n;
    group.lon = group.airports.reduce((acc, airport) => acc + airport.lon, 0) / n;
  }
  return cityIndex;
}

export function getMapNodeFromAirportCode(codeRaw, cityIndex) {
  const code = String(codeRaw || "").toUpperCase().trim();
  if (!code) return null;
  const entry = airportCoords[code];
  if (!entry || typeof entry.lat !== "number" || typeof entry.lon !== "number") return null;

  const city = String(entry.city || "").trim();
  if (!city) {
    return {
      key: code,
      city: code,
      lat: entry.lat,
      lon: entry.lon,
      airports: [{ code, name: entry.name || code }]
    };
  }

  const group = cityIndex?.get(city);
  if (!group || !group.airports.length) {
    return {
      key: city,
      city,
      lat: entry.lat,
      lon: entry.lon,
      airports: [{ code, name: entry.name || code }]
    };
  }

  return {
    key: city,
    city,
    lat: group.lat,
    lon: group.lon,
    airports: group.airports.map((airport) => ({ code: airport.code, name: airport.name }))
  };
}

export function mapFlightToCityRoute(flight, cityIndex) {
  const dep = getMapNodeFromAirportCode(flight?.departureCode, cityIndex);
  const arr = getMapNodeFromAirportCode(flight?.arrivalCode, cityIndex);
  if (!dep || !arr || dep.key === arr.key) return null;
  const [aKey, bKey] = [dep.key, arr.key].sort((x, y) => x.localeCompare(y));
  return { dep, arr, aKey, bKey, routeKey: `${aKey}__${bKey}` };
}

export function computeBearingDegrees(lat1, lon1, lat2, lon2) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const toDeg = (rad) => (rad * 180) / Math.PI;
  const phi1 = toRad(lat1);
  const phi2 = toRad(lat2);
  const dLambda = toRad(lon2 - lon1);
  const y = Math.sin(dLambda) * Math.cos(phi2);
  const x = Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(dLambda);
  const theta = Math.atan2(y, x);
  const bearing = (toDeg(theta) + 360) % 360;
  return Number.isFinite(bearing) ? bearing : 0;
}

export function buildGreatCircleArcLatLngs(from, to, segments) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const toDeg = (rad) => (rad * 180) / Math.PI;
  const lat1 = toRad(from.lat);
  const lon1 = toRad(from.lon);
  const lat2 = toRad(to.lat);
  const lon2 = toRad(to.lon);
  const d = Math.acos(
    Math.sin(lat1) * Math.sin(lat2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.cos(lon2 - lon1)
  );
  if (!Number.isFinite(d) || d === 0) return [[from.lat, from.lon], [to.lat, to.lon]];

  const steps = Math.max(2, Math.floor(segments || 24));
  const sinD = Math.sin(d);
  const points = [];
  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps;
    const a = Math.sin((1 - t) * d) / sinD;
    const b = Math.sin(t * d) / sinD;
    const x = a * Math.cos(lat1) * Math.cos(lon1) + b * Math.cos(lat2) * Math.cos(lon2);
    const y = a * Math.cos(lat1) * Math.sin(lon1) + b * Math.cos(lat2) * Math.sin(lon2);
    const z = a * Math.sin(lat1) + b * Math.sin(lat2);
    points.push([toDeg(Math.atan2(z, Math.sqrt(x * x + y * y))), toDeg(Math.atan2(y, x))]);
  }
  return points;
}

export function estimateArcSegments(from, to) {
  if (!from || !to) return 24;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const lat1 = toRad(from.lat);
  const lon1 = toRad(from.lon);
  const lat2 = toRad(to.lat);
  const lon2 = toRad(to.lon);
  const d = Math.acos(
    Math.sin(lat1) * Math.sin(lat2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.cos(lon2 - lon1)
  );
  if (!Number.isFinite(d) || d === 0) return 12;
  const deg = (d * 180) / Math.PI;
  return Math.max(12, Math.min(72, Math.ceil(deg / 3)));
}

export function getProjectedPolylinePointAtFraction(pointsPx, fraction) {
  if (!Array.isArray(pointsPx) || pointsPx.length < 2) return null;
  const f = Math.max(0, Math.min(1, fraction));

  let total = 0;
  const lengths = [];
  for (let i = 0; i < pointsPx.length - 1; i += 1) {
    const dx = pointsPx[i + 1].x - pointsPx[i].x;
    const dy = pointsPx[i + 1].y - pointsPx[i].y;
    const len = Math.hypot(dx, dy) || 0;
    lengths.push(len);
    total += len;
  }
  if (!total) return { point: pointsPx[0], dir: { x: 1, y: 0 } };

  const target = total * f;
  let acc = 0;
  for (let i = 0; i < lengths.length; i += 1) {
    const seg = lengths[i];
    const p0 = pointsPx[i];
    const p1 = pointsPx[i + 1];
    if (acc + seg >= target || i === lengths.length - 1) {
      const t = seg ? (target - acc) / seg : 0;
      const dx = p1.x - p0.x;
      const dy = p1.y - p0.y;
      const point = window.L.point(p0.x + dx * t, p0.y + dy * t);
      const dlen = Math.hypot(dx, dy) || 1;
      return { point, dir: { x: dx / dlen, y: dy / dlen } };
    }
    acc += seg;
  }
  return { point: pointsPx[pointsPx.length - 1], dir: { x: 1, y: 0 } };
}
