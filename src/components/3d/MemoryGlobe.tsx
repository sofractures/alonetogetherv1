"use client";

import { Suspense, useMemo, useRef, useState } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { OrbitControls, Environment, PerspectiveCamera } from '@react-three/drei';
import BuildingCube from './BuildingCube';
import MemoryPoint from './MemoryPoint';
import { MemoryForMap } from '@/types/memory';
import { clusterAndSpreadMemories } from '@/lib/clustering';

interface MemoryGlobeProps {
  memories?: MemoryForMap[];
  autoRotate?: boolean;
  onMemoryClick?: (memoryId: string) => void;
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

export default function MemoryGlobe({ 
  memories = [], 
  autoRotate = false,
  onMemoryClick,
  highlightId
}: MemoryGlobeProps) {
  // Track camera distance to scale spread dynamically
  const [camDistance, setCamDistance] = useState<number>(8); // Default camera distance
  // Track which cluster is expanded (spiderfied)
  const [expandedClusterId, setExpandedClusterId] = useState<string | null>(null);

  // Compute dynamic clustering: threshold ~100m; spread increases with cam distance
  // Base spread 40m at min zoom; up to 120m at far zoom
  const { positions: clusteredMemories, clusters } = useMemo(() => {
    if (memories.length === 0) return { positions: [], clusters: new Map() };
    
    const thresholdMeters = 120; // group items in the same city block
    const minDist = 6;
    const maxDist = 20;
    const t = Math.min(1, Math.max(0, (camDistance - minDist) / (maxDist - minDist)));
    const spreadRadiusMeters = 40 + t * 80; // 40m → 120m
    const result = clusterAndSpreadMemories(
      memories, 
      thresholdMeters, 
      spreadRadiusMeters,
      expandedClusterId,
      300 // Explode radius: 300m when expanded
    );
    
    console.log('[v0] MemoryGlobe: Clustered', memories.length, 'memories into', 
      new Set(result.positions.map(c => `${c.lat.toFixed(6)},${c.lon.toFixed(6)}`)).size, 
      'unique positions. Expanded cluster:', expandedClusterId);
    
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
          
          {/* Lighting */}
          <ambientLight intensity={0.6} />
          <directionalLight position={[10, 10, 5]} intensity={1.2} />
          <pointLight position={[-10, -10, -5]} intensity={0.6} color="#a78bfa" />
          
          {/* Camera */}
          <PerspectiveCamera makeDefault position={[0, 0, 8]} fov={60} />
          
          {/* Central Building Cube */}
          <BuildingCube autoRotate={autoRotate} rotationSpeed={0.2} />
          
          {/* Memory Windows */}
          {clusteredMemories.length > 0 ? (
            clusteredMemories.map(({ memory, lat, lon }) => {
              const position = latLngToPosition(lat, lon, 4.5);
              
              // Find which cluster this memory belongs to
              let clusterId: string | null = null;
              let clusterSize = 1;
              for (const [cid, clusterMembers] of clusters.entries()) {
                if (clusterMembers.some((m: MemoryForMap) => m.id === memory.id)) {
                  clusterId = cid;
                  clusterSize = clusterMembers.length;
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
                  onClick={() => {
                    console.log('[v0] Memory clicked:', memory.id, 'cluster:', clusterId, 'size:', clusterSize);
                    
                    // If clicking on a cluster (multiple memories), expand it
                    if (clusterSize > 1 && !isInExpandedCluster) {
                      console.log('[v0] Expanding cluster:', clusterId);
                      setExpandedClusterId(clusterId);
                    } 
                    // If clicking on a memory in an expanded cluster, play it and collapse
                    else if (isInExpandedCluster) {
                      console.log('[v0] Playing memory from expanded cluster:', memory.id);
                      setExpandedClusterId(null); // Collapse
                      onMemoryClick?.(memory.id);
                    }
                    // If clicking on a single memory (not in cluster), play it directly
                    else {
                      console.log('[v0] Playing single memory:', memory.id);
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
            maxDistance={20}
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
              // Collapse expanded cluster when user rotates/zooms (clicking away)
              if (expandedClusterId) {
                setExpandedClusterId(null);
              }
            }}
          />
        </Suspense>
      </Canvas>
    </div>
  );
}

