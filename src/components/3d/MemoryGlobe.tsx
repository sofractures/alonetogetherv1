"use client";

import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, PerspectiveCamera } from '@react-three/drei';
import BuildingCube from './BuildingCube';
import MemoryPoint from './MemoryPoint';

interface Memory {
  id: string;
  latitude: number;
  longitude: number;
  windowVariant: 1 | 2;
  location?: string;
}

interface MemoryGlobeProps {
  memories?: Memory[];
  autoRotate?: boolean;
  onMemoryClick?: (memoryId: string) => void;
}

// Convert lat/lng to 3D spherical coordinates
function latLngToPosition(lat: number, lng: number, radius: number = 5): [number, number, number] {
  const phi = (90 - lat) * (Math.PI / 180); // Convert latitude to radians
  const theta = (lng + 180) * (Math.PI / 180); // Convert longitude to radians

  const x = -(radius * Math.sin(phi) * Math.cos(theta));
  const y = radius * Math.cos(phi);
  const z = radius * Math.sin(phi) * Math.sin(theta);

  return [x, y, z];
}

export default function MemoryGlobe({ 
  memories = [], 
  autoRotate = false,
  onMemoryClick 
}: MemoryGlobeProps) {
  return (
    <div className="absolute inset-0 w-full h-full">
      <Canvas>
        <Suspense fallback={null}>
          {/* Lighting */}
          <ambientLight intensity={0.5} />
          <directionalLight position={[10, 10, 5]} intensity={1} />
          <pointLight position={[-10, -10, -5]} intensity={0.5} color="#a78bfa" />
          
          {/* Camera */}
          <PerspectiveCamera makeDefault position={[0, 0, 10]} fov={50} />
          
          {/* Central Building Cube */}
          <BuildingCube autoRotate={autoRotate} rotationSpeed={0.2} />
          
          {/* Memory Windows */}
          {memories.map((memory) => {
            const position = latLngToPosition(memory.latitude, memory.longitude, 5);
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

