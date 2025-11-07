"use client";

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Mesh, TextureLoader } from 'three';
import { useTexture } from '@react-three/drei';

interface BuildingCubeProps {
  autoRotate?: boolean;
  rotationSpeed?: number;
}

export default function BuildingCube({ 
  autoRotate = false, 
  rotationSpeed = 0.5 
}: BuildingCubeProps) {
  const meshRef = useRef<Mesh>(null);
  
  // Load the window_square.png texture
  const texture = useTexture('/assets/window_square.png');
  
  // Animate rotation if autoRotate is enabled
  useFrame((state, delta) => {
    if (meshRef.current && autoRotate) {
      meshRef.current.rotation.y += rotationSpeed * delta;
    }
  });

  return (
    <mesh ref={meshRef} position={[0, 0, 0]}>
      <boxGeometry args={[2, 2, 2]} />
      <meshStandardMaterial 
        map={texture}
        metalness={0.3}
        roughness={0.7}
      />
    </mesh>
  );
}

