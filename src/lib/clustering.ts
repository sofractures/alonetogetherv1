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

  console.log('[v0] Clustering: Grouping', memories.length, 'memories with threshold', thresholdMeters, 'meters');

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
        console.log('[v0] Clustering: Added memory', other.id, 'to cluster', memory.id, 
          'distance:', dist.toFixed(2), 'm');
      }
    }

    // Use the first memory's ID as cluster key
    clusters.set(memory.id, cluster);
    
    if (cluster.length > 1) {
      console.log('[v0] Clustering: Created cluster', memory.id, 'with', cluster.length, 'members');
    }
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

  // Convert meters to degrees, or use degrees directly
  let spreadRadiusDeg: number;
  if (spreadRadiusDegrees !== undefined) {
    spreadRadiusDeg = spreadRadiusDegrees;
  } else if (useDegrees) {
    spreadRadiusDeg = spreadRadiusMeters; // Treat as degrees
  } else {
    // Convert meters to degrees (approximate: 1 degree ≈ 111km)
    spreadRadiusDeg = spreadRadiusMeters / 111000;
  }

  // Spiral pattern: place memories in a spiral around the center
  const results: Array<{ memory: MemoryForMap; lat: number; lon: number }> = [];
  
  // Ensure minimum spacing between memories for visibility
  // Scale radius based on number of memories to ensure they don't overlap
  const minSpacingDeg = 0.001; // ~111m minimum spacing
  const effectiveRadius = Math.max(spreadRadiusDeg, minSpacingDeg * Math.sqrt(cluster.length));
  
  for (let i = 0; i < cluster.length; i++) {
    // Golden angle for even distribution: 137.508 degrees
    const angle = (i * 137.508) * (Math.PI / 180);
    // Spiral radius increases with index, ensuring even distribution
    // Use a more aggressive spread for better visibility
    const radius = effectiveRadius * Math.sqrt((i + 1) / cluster.length);
    
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
 * Also returns cluster information for explode-on-click functionality
 */
export function clusterAndSpreadMemories(
  memories: MemoryForMap[],
  thresholdMeters: number = 100,
  spreadRadiusMeters: number = 50,
  expandedClusterId: string | null = null,
  explodeRadiusDegrees: number = 3 // Angular spread in degrees when exploded (visible on globe)
): {
  positions: Array<{ memory: MemoryForMap; lat: number; lon: number }>;
  clusters: Map<string, MemoryForMap[]>; // cluster center ID -> memories in cluster
} {
  const clusters = groupByProximity(memories, thresholdMeters);
  const results: Array<{ memory: MemoryForMap; lat: number; lon: number }> = [];

  for (const [centerId, cluster] of clusters.entries()) {
    // Find the center memory (first one in cluster)
    const centerMemory = cluster.find(m => m.id === centerId) || cluster[0];
    
    // If this cluster is expanded, use degree-based spread (visible on globe)
    const isExpanded = expandedClusterId === centerId;
    
    let spread: Array<{ memory: MemoryForMap; lat: number; lon: number }>;
    if (isExpanded) {
      // Use degree-based spread for visible expansion
      spread = spreadCluster(
        cluster,
        centerMemory.latitude,
        centerMemory.longitude,
        0, // Not used when spreadRadiusDegrees is provided
        false, // Not used when spreadRadiusDegrees is provided
        explodeRadiusDegrees // Use degrees directly
      );
      console.log('[v0] Clustering: Expanded cluster', centerId, 'with', explodeRadiusDegrees, 'degree spread');
    } else {
      // Use meter-based spread for normal clustering
      spread = spreadCluster(
        cluster,
        centerMemory.latitude,
        centerMemory.longitude,
        spreadRadiusMeters
      );
    }
    
    results.push(...spread);
  }

  return {
    positions: results,
    clusters: clusters
  };
}

