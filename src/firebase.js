const COORD_RE = /^\s*(-?\d{1,2}(?:\.\d+)?)\s*[,\s]\s*(-?\d{1,3}(?:\.\d+)?)\s*$/;

/** "-1.1462, 36.9610" -> { lat, lng } or null */
export function parseCoords(text) {
  const match = COORD_RE.exec(text || '');
  if (!match) return null;
  const lat = Number(match[1]);
  const lng = Number(match[2]);
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return { lat, lng };
}

export function getPolygonCenter(coordinates) {
  const total = coordinates.reduce(
    (acc, p) => ({ lat: acc.lat + p.lat, lng: acc.lng + p.lng }),
    { lat: 0, lng: 0 }
  );
  return { lat: total.lat / coordinates.length, lng: total.lng / coordinates.length };
}

/** New docs store areaHa as a number; older docs only have the "8.51 ha" string. */
export function getAreaHa(field) {
  if (typeof field.areaHa === 'number') return field.areaHa;
  const parsed = parseFloat(field.area);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function formatHa(ha) {
  return `${ha.toFixed(2)} ha`;
}

/**
 * Firestore resolves a write only after the server confirms it. On a weak
 * connection that can take a long time even though the data is already saved
 * locally and will sync. Resolve to 'saved' or, after `ms`, to 'pending'.
 * Real errors (e.g. permission-denied) still reject.
 */
export function settleWithin(promise, ms = 12000) {
  let timer;
  const timeout = new Promise((resolve) => {
    timer = setTimeout(() => resolve('pending'), ms);
  });
  return Promise.race([promise.then(() => 'saved'), timeout]).finally(() =>
    clearTimeout(timer)
  );
}

// ── Exports ──────────────────────────────────────────────────────────────
function csvCell(value) {
  let text = String(value ?? '');
  // Neutralise spreadsheet formula injection
  if (/^[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

function download(filename, content, type) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

const stamp = () => new Date().toISOString().slice(0, 10);

export function exportCSV(fields) {
  const header = [
    'Farmer code', 'Owner', 'Crop', 'Area (ha)', 'Notes',
    'Centre latitude', 'Centre longitude', 'Created',
  ];
  const rows = fields.map((f) => {
    const c = getPolygonCenter(f.coordinates);
    return [
      f.farmerCode, f.ownerName, f.crop, getAreaHa(f).toFixed(2), f.notes,
      c.lat.toFixed(6), c.lng.toFixed(6), f.createdAt,
    ];
  });
  const csv = [header, ...rows].map((r) => r.map(csvCell).join(',')).join('\n');
  download(`farmtrack-parcels-${stamp()}.csv`, '\uFEFF' + csv, 'text/csv;charset=utf-8');
}

export function exportGeoJSON(fields) {
  const collection = {
    type: 'FeatureCollection',
    features: fields.map((f) => {
      const ring = f.coordinates.map((p) => [p.lng, p.lat]);
      ring.push(ring[0]);
      return {
        type: 'Feature',
        properties: {
          id: f.id,
          farmerCode: f.farmerCode,
          ownerName: f.ownerName,
          crop: f.crop,
          areaHa: getAreaHa(f),
          notes: f.notes,
        },
        geometry: { type: 'Polygon', coordinates: [ring] },
      };
    }),
  };
  download(
    `farmtrack-parcels-${stamp()}.geojson`,
    JSON.stringify(collection, null, 2),
    'application/geo+json'
  );
}