function keepNonOverlappingByCount(items, mapInstance, minDistancePx = 30) {
  const sorted = (items || []).slice().sort((a, b) => b.count - a.count);
  const kept = [];
  for (const item of sorted) {
    const p = mapInstance.latLngToContainerPoint(item.latLng);
    let collides = false;
    for (const keptItem of kept) {
      const kp = mapInstance.latLngToContainerPoint(keptItem.latLng);
      if (Math.hypot(p.x - kp.x, p.y - kp.y) < minDistancePx) {
        collides = true;
        break;
      }
    }
    if (!collides) kept.push(item);
  }
  return kept;
}

function clusterCellSize(zoom) {
  if (zoom < 3) return 170;
  if (zoom < 4) return 145;
  if (zoom < 5) return 120;
  // Used only at zoom 5 because zoom >= 6 skips clustering.
  return 95;
}

export function layoutBadgesForZoom(candidates, mapInstance, zoom) {
  if (!Array.isArray(candidates) || !candidates.length) return [];
  if (zoom >= 6) return keepNonOverlappingByCount(candidates, mapInstance);

  const cell = clusterCellSize(zoom);
  const grid = new Map();
  for (const badge of candidates) {
    const p = mapInstance.latLngToContainerPoint(badge.latLng);
    const key = `${Math.floor(p.x / cell)}:${Math.floor(p.y / cell)}`;
    const bucket = grid.get(key) || [];
    bucket.push({ ...badge, _px: p });
    grid.set(key, bucket);
  }

  const out = [];
  for (const bucket of grid.values()) {
    if (bucket.length === 1) {
      const { _px: _ignored, ...single } = bucket[0];
      out.push(single);
      continue;
    }
    const flights = bucket.reduce((sum, badge) => sum + (badge.count || 0), 0);
    const routes = new Set(bucket.map((badge) => badge.routeKey).filter(Boolean)).size;
    const avgX = bucket.reduce((sum, badge) => sum + badge._px.x, 0) / bucket.length;
    const avgY = bucket.reduce((sum, badge) => sum + badge._px.y, 0) / bucket.length;
    out.push({
      count: flights,
      routeCount: routes || bucket.length,
      color: "#0f172a",
      isCluster: true,
      latLng: mapInstance.containerPointToLatLng(window.L.point(avgX, avgY)),
      popup: `<div style="min-width:180px;"><b>${flights}</b> flights across <b>${routes || bucket.length}</b> routes in this area.</div>`
    });
  }

  // Final overlap pass is still needed in sparse zoom<6 views where buckets may not cluster.
  return keepNonOverlappingByCount(out, mapInstance);
}
