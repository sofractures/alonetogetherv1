"use client";

import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, PerspectiveCamera } from '@react-three/drei';
import BuildingCube from './BuildingCube';
import MemoryPoint from './MemoryPoint';
import { MemoryForMap } from '@/types/memory';

interface MemoryGlobeProps {
  memories?: MemoryForMap[];
  autoRotate?: boolean;
  onMemoryClick?: (memoryId: string) => void;
}

// Convert lat/lng to 3D spherical coordinates
// Uses standard spherical coordinate conversion for globe mapping
function latLngToPosition(lat: number, lng: number, radius: number = 4.5): [number, number, number] {
  // Convert to radians
  const phi = (90 - lat) * (Math.PI / 180); // Latitude: 90° = north pole, -90° = south pole
  const theta = (lng + 180) * (Math.PI / 180); // Longitude: -180° to 180° -> 0° to 360°

  // Spherical to Cartesian conversion
  const x = radius * Math.sin(phi) * Math.cos(theta);
  const y = radius * Math.cos(phi);
  const z = radius * Math.sin(phi) * Math.sin(theta);

  return [x, y, z];
}

export default function MemoryGlobe({ 
  memories = [], 
  autoRotate = false,
  onMemoryClick 
}: MemoryGlobeProps) {
  // Debug: Log memories count
  console.log('MemoryGlobe: Rendering with', memories.length, 'memories');
  
  return (
    <div className="absolute inset-0 w-full h-full">
      <Canvas>
        <Suspense fallback={null}>
          {/* Lighting */}
          <ambientLight intensity={0.6} />
          <directionalLight position={[10, 10, 5]} intensity={1.2} />
          <pointLight position={[-10, -10, -5]} intensity={0.6} color="#a78bfa" />
          
          {/* Camera */}
          <PerspectiveCamera makeDefault position={[0, 0, 8]} fov={60} />
          
          {/* Central Building Cube */}
          <BuildingCube autoRotate={autoRotate} rotationSpeed={0.2} />
          
          {/* Memory Windows */}
          {memories.length > 0 && memories.map((memory) => {
            const position = latLngToPosition(memory.latitude, memory.longitude, 4.5);
            console.log('Rendering memory:', memory.id, 'at position:', position);
            return (
              <MemoryPoint
                key={memory.id}
                position={position}
                windowVariant={memory.windowVariant}
                location={memory.location}
                onClick={() => onMemoryClick?.(memory.id)}
              />
            );
          })}
          
          {/* Debug: Show test memory if no memories exist (for testing rendering) */}
          {memories.length === 0 && (
            <MemoryPoint
              position={[3, 2, 0]}
              windowVariant={1}
              location="Test Memory"
              onClick={() => console.log('Test memory clicked')}
            />
          )}
          
          {/* Environment for better lighting */}
          <Environment preset="night" />
          
          {/* Orbit Controls */}
          <OrbitControls
            minDistance={6}
            maxDistance={20}
            enablePan={false}
            dampingFactor={0.05}
            enableDamping
            autoRotate={autoRotate}
            autoRotateSpeed={0.5}
          />
        </Suspense>
      </Canvas>
    </div>
  );
}

