import { MemoryForMap } from '@/types/memory';

/**
 * "Equalized globe" display positions.
 *
 * True geography leaves the globe ~70% empty (oceans) with a few dense city
 * patches where windows stack on top of each other. This module computes
 * DISPLAY positions only: each window is pulled toward its true location
 * (anchor spring) while being pushed apart from its neighbours (repulsion),
 * relaxed iteratively on the unit sphere.
 *
 * The result keeps the *shape* of the world — Japan stays far from Brazil,
 * London windows remain a coherent patch near the UK — but dense clusters
 * spill into the surrounding empty space so individual windows stay visible.
 *
 * True coordinates are never modified; labels and the database keep the
 * real location.
 */

/**
 * Geography fidelity dial, 0..1.
 * 1 = strict geography (positions barely move, clusters stay stacked)
 * 0 = fully equalized (windows spread as far as needed, geography is loose)
 * Tune this live to find the sweet spot between "world map" and "readable".
 */
export const GEO_FIDELITY = 0.35;

/** Relaxation iterations. More = closer to equilibrium; 120 is plenty for a few hundred points. */
const ITERATIONS = 120;

/** How strongly each point is pulled back to its true location per iteration (scaled by GEO_FIDELITY). */
const ANCHOR_STEP = 0.12;

/** Fraction of pairwise overlap corrected per iteration. */
const REPULSION_STEP = 0.5;

const DEG = Math.PI / 180;

type Vec3 = [number, number, number];

// Must mirror latLngToPosition() in MemoryGlobe.tsx (unit radius)
function latLngToVec(lat: number, lon: number): Vec3 {
  const phi = (90 - lat) * DEG;
  const theta = (lon + 180) * DEG;
  return [
    Math.sin(phi) * Math.cos(theta),
    Math.cos(phi),
    Math.sin(phi) * Math.sin(theta),
  ];
}

function vecToLatLng(v: Vec3): { lat: number; lon: number } {
  const y = Math.min(1, Math.max(-1, v[1]));
  const phi = Math.acos(y);
  const theta = Math.atan2(v[2], v[0]);
  const lat = 90 - phi / DEG;
  let lon = theta / DEG - 180;
  if (lon < -180) lon += 360;
  if (lon > 180) lon -= 360;
  return { lat, lon };
}

function normalize(v: Vec3): Vec3 {
  const len = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / len, v[1] / len, v[2] / len];
}

/** Deterministic tiny offset per id so exactly-coincident points have a direction to separate along. */
function jitterFor(id: string): Vec3 {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) | 0;
  }
  const a = (hash % 360) * DEG;
  const b = ((hash >> 9) % 360) * DEG;
  const eps = 1e-4;
  return [
    eps * Math.cos(a) * Math.cos(b),
    eps * Math.sin(a),
    eps * Math.cos(a) * Math.sin(b),
  ];
}

/**
 * Compute display coordinates for all memories.
 * Deterministic: the same set of memories always produces the same layout.
 * O(n² · iterations) — fine for the hundreds of memories this app expects.
 */
export function equalizeMemoryPositions(
  memories: MemoryForMap[]
): Map<string, { lat: number; lon: number }> {
  const result = new Map<string, { lat: number; lon: number }>();
  if (memories.length === 0) return result;

  const n = memories.length;

  // Target angular separation between window centres (radians).
  // Capped at 0.3 rad (per PRD spatial spec); shrinks as the sphere fills up.
  const minSep = Math.min(0.3, 1.8 / Math.sqrt(n));
  // Repulsion compares chord lengths (cheaper than angles, equivalent for small separations)
  const minChord = 2 * Math.sin(minSep / 2);

  const anchors: Vec3[] = memories.map((m) => latLngToVec(m.latitude, m.longitude));
  const points: Vec3[] = memories.map((m, i) => {
    const j = jitterFor(m.id);
    return normalize([anchors[i][0] + j[0], anchors[i][1] + j[1], anchors[i][2] + j[2]]);
  });

  const anchorStep = ANCHOR_STEP * GEO_FIDELITY;

  for (let iter = 0; iter < ITERATIONS; iter++) {
    // Anchor springs first, separation last, so each iteration ends non-overlapping
    if (anchorStep > 0) {
      for (let i = 0; i < n; i++) {
        points[i] = normalize([
          points[i][0] + (anchors[i][0] - points[i][0]) * anchorStep,
          points[i][1] + (anchors[i][1] - points[i][1]) * anchorStep,
          points[i][2] + (anchors[i][2] - points[i][2]) * anchorStep,
        ]);
      }
    }

    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const dx = points[i][0] - points[j][0];
        const dy = points[i][1] - points[j][1];
        const dz = points[i][2] - points[j][2];
        const dist = Math.hypot(dx, dy, dz);
        if (dist >= minChord || dist === 0) continue;

        // Split the correction between both points, along their separating axis
        const push = ((minChord - dist) / dist) * REPULSION_STEP * 0.5;
        points[i] = normalize([
          points[i][0] + dx * push,
          points[i][1] + dy * push,
          points[i][2] + dz * push,
        ]);
        points[j] = normalize([
          points[j][0] - dx * push,
          points[j][1] - dy * push,
          points[j][2] - dz * push,
        ]);
      }
    }
  }

  for (let i = 0; i < n; i++) {
    result.set(memories[i].id, vecToLatLng(points[i]));
  }
  return result;
}
