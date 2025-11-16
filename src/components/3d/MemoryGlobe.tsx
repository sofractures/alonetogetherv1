"use client";

import { Suspense, useMemo, useRef, useState } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { OrbitControls, Environment, PerspectiveCamera } from '@react-three/drei';
import { Vector3 } from 'three';
import BuildingCube from './BuildingCube';
import MemoryPoint from './MemoryPoint';
import { MemoryForMap } from '@/types/memory';
import { clusterAndSpreadMemories } from '@/lib/clustering';

interface MemoryGlobeProps {
  memories?: MemoryForMap[];
  autoRotate?: boolean;
  onMemoryClick?: (memoryId: string, overlappingMemories?: MemoryForMap[]) => void;
  highlightId?: string;
}

// Convert lat/lng to 3D spherical coordinates
// Uses standard spherical coordinate conversion for globe mapping
function latLngToPosition(lat: number, lng: number, radius: number = 4.5): [number, number, number] {
  // Convert to radians
  const phi = (90 - lat) * (Math.PI / 180); // Latitude: 90° = north pole, -90° = south pole
  const theta = (lng + 180) * (Math.PI / 180); // Longitude: -180° to 180° -> 0° to 360°

  // Spherical to Cartesian conversion
  // Using standard physics convention: phi from z-axis, theta in xy-plane
  const x = radius * Math.sin(phi) * Math.cos(theta);
  const y = radius * Math.cos(phi);
  const z = radius * Math.sin(phi) * Math.sin(theta);

  // Position calculated for memory window
  return [x, y, z];
}

// Internal component to track camera distance (must be inside Canvas)
function CameraDistanceTracker({ onDistanceChange }: { onDistanceChange: (distance: number) => void }) {
  const { camera } = useThree();
  const lastUpdateRef = useRef<number>(0);
  const lastDistRef = useRef<number>(camera.position.length());

  useFrame(() => {
    const now = performance.now();
    const dist = camera.position.length();
    // Throttle updates to reduce re-clustering jitter
    if (now - lastUpdateRef.current > 120 && Math.abs(dist - lastDistRef.current) > 0.05) {
      lastUpdateRef.current = now;
      lastDistRef.current = dist;
      onDistanceChange(dist);
    }
  });

  return null;
}

// Internal component to detect screen-space overlaps (must be inside Canvas)
function OverlapDetector({ 
  positions, 
  onOverlapsDetected 
}: { 
  positions: Array<{ memory: MemoryForMap; lat: number; lon: number }>;
  onOverlapsDetected: (overlaps: Map<string, MemoryForMap[]>) => void;
}) {
  const { camera, size } = useThree();
  const lastUpdateRef = useRef<number>(0);

  useFrame(() => {
    const now = performance.now();
    // Check overlaps every 200ms (less frequent than camera tracking)
    if (now - lastUpdateRef.current < 200) return;
    lastUpdateRef.current = now;

    // Convert 3D positions to screen space and detect overlaps
    const overlaps = new Map<string, MemoryForMap[]>();
    const screenPositions = new Map<string, { x: number; y: number; memory: MemoryForMap }>();
    
    // Project all positions to screen space
    for (const { memory, lat, lon } of positions) {
      const worldPos = latLngToPosition(lat, lon, 4.5);
      const vector = new Vector3(...worldPos);
      vector.project(camera);
      
      // Convert to screen coordinates (0-1 range, then to pixels)
      const x = (vector.x * 0.5 + 0.5) * size.width;
      const y = (vector.y * -0.5 + 0.5) * size.height;
      
      screenPositions.set(memory.id, { x, y, memory });
    }
    
    // Detect overlaps: windows are ~1.5 units, roughly 50-100px on screen depending on zoom
    // Use a threshold based on window size (scaled by camera distance)
    const windowSizePixels = Math.max(30, 100 * (6 / camera.position.length())); // Scale with zoom
    const overlapThreshold = windowSizePixels * 0.8; // 80% overlap = considered overlapping
    
    for (const [id1, pos1] of screenPositions.entries()) {
      const overlapping: MemoryForMap[] = [pos1.memory];
      
      for (const [id2, pos2] of screenPositions.entries()) {
        if (id1 === id2) continue;
        
        const dx = pos1.x - pos2.x;
        const dy = pos1.y - pos2.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < overlapThreshold) {
          overlapping.push(pos2.memory);
        }
      }
      
      if (overlapping.length > 1) {
        // Use the first memory ID as the key for this overlap group
        overlaps.set(id1, overlapping);
      }
    }
    
    onOverlapsDetected(overlaps);
  });

  return null;
}

export default function MemoryGlobe({ 
  memories = [], 
  autoRotate = false,
  onMemoryClick,
  highlightId
}: MemoryGlobeProps) {
  // Track camera distance to scale spread dynamically
  const [camDistance, setCamDistance] = useState<number>(18); // Start zoomed out further (default camera distance)
  // Track which cluster is expanded (spiderfied)
  const [expandedClusterId, setExpandedClusterId] = useState<string | null>(null);
  // Track screen-space overlaps for playlist feature
  const [screenOverlaps, setScreenOverlaps] = useState<Map<string, MemoryForMap[]>>(new Map());

  // Compute dynamic clustering: threshold ~100m; spread increases with cam distance
  // Base spread 40m at min zoom; up to 120m at far zoom
  const { positions: clusteredMemories, clusters } = useMemo(() => {
    if (memories.length === 0) return { positions: [], clusters: new Map() };
    
    // Reduce threshold to only cluster very close memories (same building/block)
    // This prevents different cities from being grouped together
    const thresholdMeters = 300; // group items within 300m (very close, same building)
    const minDist = 6;
    const maxDist = 30;
    // More aggressive spread calculation: exponential curve for better visibility
    // When zoomed out (18): minimal spread (200m)
    // When zoomed in (6): maximum spread (2000m) - very visible separation
    const normalizedDist = Math.min(1, Math.max(0, (camDistance - minDist) / (maxDist - minDist)));
    // Use exponential curve: spread increases dramatically when zooming in
    const t = 1 - normalizedDist; // Invert so closer = higher spread
    const spreadRadiusMeters = 200 + (t * t * t) * 1800; // 200m → 2000m (exponential curve for visible spread)
    
    console.log('[v0] MemoryGlobe: Camera distance:', camDistance.toFixed(2), 'Spread radius:', spreadRadiusMeters.toFixed(0), 'm');
    const result = clusterAndSpreadMemories(
      memories, 
      thresholdMeters, 
      spreadRadiusMeters,
      expandedClusterId,
      1.5 // Explode radius: 1.5 degrees when expanded (~167km, clearly visible on globe)
    );
    
    // Log cluster information for debugging
    console.log('[v0] MemoryGlobe: Clustered', memories.length, 'memories into', 
      new Set(result.positions.map(c => `${c.lat.toFixed(6)},${c.lon.toFixed(6)}`)).size, 
      'unique positions. Expanded cluster:', expandedClusterId);
    
    // Log all clusters and their sizes
    for (const [clusterId, clusterMembers] of result.clusters.entries()) {
      if (clusterMembers.length > 1) {
        console.log('[v0] MemoryGlobe: Cluster', clusterId, 'has', clusterMembers.length, 'members:', 
          clusterMembers.map(m => ({ id: m.id, location: m.location, lat: m.latitude, lon: m.longitude })));
      }
    }
    
    return result;
  }, [memories, camDistance, expandedClusterId]);

  // Debug: Log memories count and details
  console.log('[v0] MemoryGlobe: Rendering with', memories.length, 'memories');
  if (memories.length > 0) {
    console.log('[v0] MemoryGlobe: Memory details:', memories.map(m => ({
      id: m.id,
      location: m.location,
      lat: m.latitude,
      lng: m.longitude,
      hasAudio: !!m.audioUrl
    })));
  } else {
    console.warn('[v0] MemoryGlobe: NO MEMORIES TO RENDER!');
  }
  
  return (
    <div 
      className="absolute inset-0 w-full h-full" 
      style={{ 
        pointerEvents: 'auto', 
        touchAction: 'none',
        zIndex: 0,
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0
      }}
    >
      <Canvas
        style={{ 
          display: 'block', 
          width: '100%', 
          height: '100%',
          position: 'absolute',
          top: 0,
          left: 0
        }}
        gl={{ antialias: true, alpha: true }}
        dpr={[1, 2]}
      >
        <Suspense fallback={null}>
          {/* Camera distance tracker (must be inside Canvas) */}
          <CameraDistanceTracker onDistanceChange={setCamDistance} />
          
          {/* Screen-space overlap detector (must be inside Canvas) */}
          <OverlapDetector 
            positions={clusteredMemories} 
            onOverlapsDetected={setScreenOverlaps}
          />
          
          {/* Lighting */}
          <ambientLight intensity={0.6} />
          <directionalLight position={[10, 10, 5]} intensity={1.2} />
          <pointLight position={[-10, -10, -5]} intensity={0.6} color="#a78bfa" />
          
          {/* Camera */}
          <PerspectiveCamera makeDefault position={[0, 0, 18]} fov={60} />
          
          {/* Central Building Cube */}
          <BuildingCube autoRotate={autoRotate} rotationSpeed={0.2} />
          
          {/* Memory Windows */}
          {clusteredMemories.length > 0 ? (
            clusteredMemories.map(({ memory, lat, lon }) => {
              const position = latLngToPosition(lat, lon, 4.5);
              
              // Log position changes for expanded clusters
              if (expandedClusterId) {
                const isInExpanded = clusters.get(expandedClusterId)?.some((m: MemoryForMap) => m.id === memory.id);
                if (isInExpanded) {
                  console.log('[v0] Expanded cluster memory position:', {
                    id: memory.id,
                    originalLat: memory.latitude,
                    originalLon: memory.longitude,
                    spreadLat: lat,
                    spreadLon: lon,
                    position: position
                  });
                }
              }
              
              // Find which cluster this memory belongs to
              let clusterId: string | null = null;
              let clusterSize = 1;
              let isClusterCenter = false;
              for (const [cid, clusterMembers] of clusters.entries()) {
                if (clusterMembers.some((m: MemoryForMap) => m.id === memory.id)) {
                  clusterId = cid;
                  clusterSize = clusterMembers.length;
                  isClusterCenter = cid === memory.id; // The cluster center is the memory with ID matching cluster ID
                  break;
                }
              }
              
              const isInExpandedCluster = expandedClusterId === clusterId;
              
              return (
                <MemoryPoint
                  key={memory.id}
                  position={position}
                  windowVariant={memory.windowVariant}
                  location={memory.location}
                  highlighted={highlightId === memory.id}
                  cameraDistance={camDistance}
                  onClick={() => {
                    console.log('=== MEMORY CLICK HANDLER ===');
                    console.log('[v0] Memory clicked:', {
                      memoryId: memory.id,
                      location: memory.location,
                      clusterId: clusterId,
                      clusterSize: clusterSize,
                      isInExpandedCluster: isInExpandedCluster,
                      isClusterCenter: isClusterCenter,
                      expandedClusterId: expandedClusterId,
                      lat: lat,
                      lon: lon
                    });
                    
                    // Check for screen-space overlaps first (most accurate)
                    const overlappingMemories = screenOverlaps.get(memory.id);
                    if (overlappingMemories && overlappingMemories.length > 1) {
                      console.log('[v0] 🎵 Screen overlap detected:', overlappingMemories.length, 'memories');
                      // Pass all overlapping memories for playlist
                      onMemoryClick?.(memory.id, overlappingMemories);
                      return;
                    }
                    
                    // If clicking on a memory in an expanded cluster, play it and collapse
                    if (isInExpandedCluster) {
                      console.log('[v0] 🟢 Playing memory from expanded cluster:', memory.id);
                      setExpandedClusterId(null); // Collapse
                      onMemoryClick?.(memory.id);
                    }
                    // If clicking on a non-expanded cluster, expand it OR play center memory
                    // If it's the cluster center, play it directly (fallback if expansion not visible)
                    else if (clusterSize > 1) {
                      if (isClusterCenter) {
                        // Play the center memory directly as fallback
                        console.log('[v0] 🟡 Playing cluster center memory directly:', memory.id);
                        onMemoryClick?.(memory.id);
                      } else {
                        // Expand the cluster
                        console.log('[v0] 🔵🔵🔵 EXPANDING cluster:', clusterId, 'with', clusterSize, 'members');
                        setExpandedClusterId(clusterId);
                      }
                    }
                    // If clicking on a single memory (not in cluster), play it directly
                    else {
                      console.log('[v0] 🟡 Playing single memory (not in cluster):', memory.id, 'clusterSize:', clusterSize);
                      onMemoryClick?.(memory.id);
                    }
                  }}
                />
              );
            })
          ) : (
            // Debug indicator when no memories - red cube at top
            <mesh position={[0, 3, 0]}>
              <boxGeometry args={[0.3, 0.3, 0.3]} />
              <meshStandardMaterial color="red" />
            </mesh>
          )}
          
          {/* Environment for better lighting */}
          <Environment preset="night" />
          
          {/* Orbit Controls */}
          <OrbitControls
            makeDefault
            enabled={true}
            enableRotate={true}
            enableZoom={true}
            enablePan={false}
            minDistance={6}
            maxDistance={30}
            dampingFactor={0.05}
            enableDamping
            autoRotate={autoRotate}
            autoRotateSpeed={0.5}
            rotateSpeed={0.5}
            zoomSpeed={0.8}
            mouseButtons={{
              LEFT: 0, // Rotate
            }}
            touches={{
              ONE: 0, // Rotate
              TWO: 2, // Zoom
            }}
            onChange={() => {
              // Don't auto-collapse on every camera change - let user click away or select a memory
              // Auto-collapse was too aggressive and collapsed immediately after expansion
            }}
          />
        </Suspense>
      </Canvas>
    </div>
  );
}

