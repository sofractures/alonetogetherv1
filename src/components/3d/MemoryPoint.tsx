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
  cameraDistance?: number; // Optional camera distance for scaling
}

export default function MemoryPoint({
  position,
  windowVariant,
  location,
  onClick,
  highlighted = false,
  cameraDistance = 18, // Default camera distance
}: MemoryPointProps) {
  const meshRef = useRef<Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const lastClickTimeRef = useRef<number>(0);
  const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
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

  // Scale window size based on camera distance
  // When zoomed out (far): smaller windows (0.6x)
  // When zoomed in (close): larger windows (1.2x)
  const minDist = 6;
  const maxDist = 30;
  const normalizedDist = Math.min(1, Math.max(0, (cameraDistance - minDist) / (maxDist - minDist)));
  const distanceScale = 0.6 + (1 - normalizedDist) * 0.6; // 0.6 → 1.2
  
  const baseScale = highlighted ? 1.4 : hovered ? 1.3 : 1;
  const scale = baseScale * distanceScale;
  const opacity = highlighted ? 1 : hovered ? 1 : 0.85;

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation(); // Stop propagation to prevent OrbitControls from rotating
    
    const now = Date.now();
    const timeSinceLastClick = now - lastClickTimeRef.current;
    
    // Clear any pending single-click timeout
    if (clickTimeoutRef.current) {
      clearTimeout(clickTimeoutRef.current);
      clickTimeoutRef.current = null;
    }
    
    // If clicked within 300ms of last click, treat as double-click
    if (timeSinceLastClick < 300) {
      console.log('[v0] MemoryPoint: Double-click detected (manual) on:', location);
      lastClickTimeRef.current = 0; // Reset
      
      // Trigger the onClick handler (which handles cluster expansion or playback)
      if (onClick) {
        console.log('[v0] MemoryPoint: Calling onClick handler');
        onClick();
      }
    } else {
      // Single click - wait to see if there's a second click
      lastClickTimeRef.current = now;
      clickTimeoutRef.current = setTimeout(() => {
        // Single click after timeout - do nothing, let OrbitControls handle rotation
        console.log('[v0] MemoryPoint: Single click (ignored) on:', location);
        clickTimeoutRef.current = null;
      }, 300);
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

