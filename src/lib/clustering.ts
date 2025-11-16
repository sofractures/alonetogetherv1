import { MemoryForMap } from '@/types/memory';

/**
 * Calculate distance between two coordinates in meters using Haversine formula
 */
function distanceInMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000; // Earth's radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Group memories that are within a certain distance threshold
 * Returns a map of cluster center -> array of memories in that cluster
 */
function groupByProximity(
  memories: MemoryForMap[],
  thresholdMeters: number = 100 // Default: 100 meters
): Map<string, MemoryForMap[]> {
  const clusters = new Map<string, MemoryForMap[]>();
  const processed = new Set<string>();

  for (const memory of memories) {
    if (processed.has(memory.id)) continue;

    // Find all memories within threshold distance
    const cluster: MemoryForMap[] = [memory];
    processed.add(memory.id);

    for (const other of memories) {
      if (processed.has(other.id)) continue;
      
      const dist = distanceInMeters(
        memory.latitude,
        memory.longitude,
        other.latitude,
        other.longitude
      );

      if (dist <= thresholdMeters) {
        cluster.push(other);
        processed.add(other.id);
      }
    }

    // Use the first memory's ID as cluster key
    clusters.set(memory.id, cluster);
  }

  return clusters;
}

/**
 * Spread memories in a cluster using a spiral pattern
 * Returns adjusted coordinates for each memory
 */
function spreadCluster(
  cluster: MemoryForMap[],
  baseLat: number,
  baseLon: number,
  spreadRadiusMeters: number = 50, // Spread within 50 meters (for normal clustering)
  useDegrees: boolean = false, // If true, treat spreadRadiusMeters as degrees (for exploded clusters)
  spreadRadiusDegrees?: number // Optional explicit degree-based spread
): Array<{ memory: MemoryForMap; lat: number; lon: number }> {
  if (cluster.length === 1) {
    return [{ memory: cluster[0], lat: baseLat, lon: baseLon }];
  }

  let spreadRadiusDeg: number;
  if (spreadRadiusDegrees !== undefined) {
    spreadRadiusDeg = spreadRadiusDegrees;
  } else if (useDegrees) {
    spreadRadiusDeg = spreadRadiusMeters; // Treat as degrees
  } else {
    spreadRadiusDeg = spreadRadiusMeters / 111000; // Convert meters to degrees
  }

  // Spiral pattern: place memories in a spiral around the center
  const results: Array<{ memory: MemoryForMap; lat: number; lon: number }> = [];
  
  for (let i = 0; i < cluster.length; i++) {
    // Golden angle for even distribution: 137.508 degrees
    const angle = (i * 137.508) * (Math.PI / 180);
    // Spiral radius increases with index
    const radius = spreadRadiusDeg * Math.sqrt(i + 1) / Math.sqrt(cluster.length);
    
    // Calculate offset in degrees
    const latOffset = radius * Math.cos(angle);
    const lonOffset = radius * Math.sin(angle) / Math.cos(baseLat * Math.PI / 180); // Adjust for latitude

    results.push({
      memory: cluster[i],
      lat: baseLat + latOffset,
      lon: baseLon + lonOffset,
    });
  }

  return results;
}

/**
 * Main clustering function: groups nearby memories and spreads them
 * Returns memories with adjusted coordinates to prevent overlap
 */
export function clusterAndSpreadMemories(
  memories: MemoryForMap[],
  thresholdMeters: number = 100,
  spreadRadiusMeters: number = 50,
  expandedClusterId: string | null = null,
  explodeRadiusDegrees: number = 3 // Angular spread in degrees when exploded
): {
  positions: Array<{ memory: MemoryForMap; lat: number; lon: number }>;
  clusters: Map<string, MemoryForMap[]>;
} {
  const clusters = groupByProximity(memories, thresholdMeters);
  const results: Array<{ memory: MemoryForMap; lat: number; lon: number }> = [];

  for (const [centerId, cluster] of clusters.entries()) {
    // Find the center memory (first one in cluster)
    const centerMemory = cluster.find(m => m.id === centerId) || cluster[0];
    const isExpanded = expandedClusterId === centerId;
    
    let spread: Array<{ memory: MemoryForMap; lat: number; lon: number }>;
    if (isExpanded) {
      spread = spreadCluster(cluster, centerMemory.latitude, centerMemory.longitude, 0, false, explodeRadiusDegrees);
      console.log('[v0] Clustering: Expanded cluster', centerId, 'with', explodeRadiusDegrees, 'degree spread');
    } else {
      spread = spreadCluster(cluster, centerMemory.latitude, centerMemory.longitude, spreadRadiusMeters);
    }
    results.push(...spread);
  }
  
  return { positions: results, clusters: clusters };
}

