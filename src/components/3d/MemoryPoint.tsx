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
  showLabelAlways?: boolean; // If true, always show location label (for expanded overlaps)
  hideLabelInSpiral?: boolean; // If true, hide label even on hover (for spiral mode)
  onHoverChange?: (isHovered: boolean) => void; // Callback when hover state changes
}

export default function MemoryPoint({
  position,
  windowVariant,
  location,
  onClick,
  highlighted = false,
  cameraDistance = 18, // Default camera distance
  showLabelAlways = false, // Default to only show on hover
  hideLabelInSpiral = false, // Default to show labels normally
  onHoverChange,
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

  // Scale window size based on camera distance
  const minDist = 6;
  const maxDist = 30;
  const normalizedDist = Math.min(1, Math.max(0, (cameraDistance - minDist) / (maxDist - minDist)));
  const distanceScale = 0.5 + normalizedDist * 0.5; // 0.5 → 1.0 (smaller when zoomed in)
  
  const baseScale = highlighted ? 1.4 : hovered ? 1.3 : 1;
  const scale = baseScale * distanceScale;
  const opacity = highlighted ? 1 : hovered ? 1 : 0.85;

  const handleClick = () => {
    // Don't stop propagation on single click - let OrbitControls handle it
    // Only handle double-click for opening modal
    console.log('[v0] Single click on memory:', location);
  };

  const handleDoubleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    console.log('[v0] Double click on memory:', location);
    
    // Trigger the onClick handler (which opens modal)
    onClick?.();
  };

  const handlePointerOver = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    console.log('[v0] Hover start:', location);
    setHovered(true);
    onHoverChange?.(true);
  };

  const handlePointerOut = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    console.log('[v0] Hover end:', location);
    setHovered(false);
    onHoverChange?.(false);
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
        {/* Don't show label in spiral mode - only center label shows */}
        {!hideLabelInSpiral && (hovered || showLabelAlways || highlighted) && location && (
          <Text
            position={[0, -1, 0]}
            fontSize={0.2}
            color={highlighted ? '#f59e0b' : (hovered ? '#a78bfa' : '#ffffff')}
            anchorX="center"
            anchorY="middle"
            outlineWidth={0.03}
            outlineColor="#000000"
          >
            {location}
          </Text>
        )}
      </group>
    </Billboard>
  );
}

