"use client";

import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Mesh } from 'three';
import { Billboard, Text } from '@react-three/drei';
import { useTexture } from '@react-three/drei';

interface MemoryPointProps {
  position: [number, number, number];
  windowVariant: 1 | 2;
  location?: string;
  onClick?: () => void;
}

export default function MemoryPoint({
  position,
  windowVariant,
  location,
  onClick,
}: MemoryPointProps) {
  const meshRef = useRef<Mesh>(null);
  const [hovered, setHovered] = useState(false);
  
  // Load the appropriate window texture
  const texture = useTexture(
    windowVariant === 1 ? '/assets/window.jpg' : '/assets/window2.jpg'
  );

  // Floating animation (sine wave on Y-axis)
  useFrame((state) => {
    if (meshRef.current) {
      const time = state.clock.getElapsedTime();
      meshRef.current.position.y = position[1] + Math.sin(time * 0.5) * 0.1;
    }
  });

  const scale = hovered ? 1.3 : 1;
  const opacity = hovered ? 1 : 0.85;

  return (
    <Billboard position={position} follow={true} lockX={false} lockY={false} lockZ={false}>
      <mesh
        ref={meshRef}
        scale={scale}
        onClick={onClick}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <planeGeometry args={[1, 1]} />
        <meshStandardMaterial
          map={texture}
          transparent
          opacity={opacity}
          emissive={hovered ? '#a78bfa' : '#000000'}
          emissiveIntensity={hovered ? 0.3 : 0}
        />
      </mesh>
      {hovered && location && (
        <Text
          position={[0, -0.7, 0]}
          fontSize={0.15}
          color="#a78bfa"
          anchorX="center"
          anchorY="middle"
        >
          {location}
        </Text>
      )}
    </Billboard>
  );
}

