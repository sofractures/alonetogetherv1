"use client";

import { useRef, useState } from 'react';
import { useFrame, ThreeEvent } from '@react-three/fiber';
import { Mesh } from 'three';
import { Billboard, Text } from '@react-three/drei';
import { useTexture } from '@react-three/drei';

interface MemoryPointProps {
  position: [number, number, number];
  windowVariant: 1 | 2;
  location?: string;
  onClick?: () => void;
  highlighted?: boolean;
}

export default function MemoryPoint({
  position,
  windowVariant,
  location,
  onClick,
  highlighted = false,
}: MemoryPointProps) {
  const meshRef = useRef<Mesh>(null);
  const [hovered, setHovered] = useState(false);
  
  // Load the appropriate window texture
  const texture = useTexture(
    windowVariant === 1 ? '/assets/window.jpg' : '/assets/window2.jpg'
  );

  // Floating animation (sine wave on Y-axis)
  // Note: Billboard handles positioning, so we animate within the Billboard's local space
  useFrame((state) => {
    if (meshRef.current) {
      const time = state.clock.getElapsedTime();
      // Animate in local space (relative to Billboard position)
      meshRef.current.position.y = Math.sin(time * 0.5) * 0.1;
    }
  });

  const scale = highlighted ? 1.4 : hovered ? 1.3 : 1;
  const opacity = highlighted ? 1 : hovered ? 1 : 0.85;

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    // Single click - don't do anything, let OrbitControls handle rotation
    // Only handle double-click for opening/cluster expansion
  };

  const handleDoubleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation(); // Stop propagation to prevent OrbitControls from rotating
    console.log('[v0] MemoryPoint: Double-click detected on:', location);
    
    // Trigger the onClick handler (which handles cluster expansion or playback)
    if (onClick) {
      console.log('[v0] MemoryPoint: Calling onClick handler');
      onClick();
    } else {
      console.warn('[v0] MemoryPoint: No onClick handler provided!');
    }
  };

  const handlePointerOver = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    console.log('[v0] Hover start:', location);
    setHovered(true);
  };

  const handlePointerOut = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    console.log('[v0] Hover end:', location);
    setHovered(false);
  };

  return (
    <Billboard position={position} follow={true} lockX={false} lockY={false} lockZ={false}>
      <group>
        <mesh
          ref={meshRef}
          scale={scale}
          onClick={handleClick}
          onDoubleClick={handleDoubleClick}
          onPointerOver={handlePointerOver}
          onPointerOut={handlePointerOut}
        >
          <planeGeometry args={[1.5, 1.5]} />
          <meshStandardMaterial
            map={texture}
            transparent
            opacity={opacity}
            emissive={highlighted ? '#f59e0b' : hovered ? '#a78bfa' : '#000000'}
            emissiveIntensity={highlighted ? 1.2 : hovered ? 0.5 : 0}
            side={2} // DoubleSide - render both sides
          />
        </mesh>
        {hovered && location && (
          <Text
            position={[0, -1, 0]}
            fontSize={0.2}
            color="#a78bfa"
            anchorX="center"
            anchorY="middle"
            outlineWidth={0.02}
            outlineColor="#000000"
          >
            {location}
          </Text>
        )}
      </group>
    </Billboard>
  );
}

