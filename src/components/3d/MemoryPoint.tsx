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
  name?: string; // Creator name
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
  name,
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
  // When zoomed out (far): larger windows (1.0x) - easier to see from far away
  // When zoomed in (close): smaller windows (0.5x) - allows spread to be visible, prevents overlap
  const minDist = 6;
  const maxDist = 30;
  const normalizedDist = Math.min(1, Math.max(0, (cameraDistance - minDist) / (maxDist - minDist)));
  // Invert: closer camera = smaller windows (so spread is visible)
  const distanceScale = 0.5 + normalizedDist * 0.5; // 0.5 → 1.0 (smaller when zoomed in)
  
  const baseScale = highlighted ? 1.4 : hovered ? 1.3 : 1;
  const scale = baseScale * distanceScale;
  const opacity = highlighted ? 1 : hovered ? 1 : 1; // Full opacity for all windows

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    onClick?.();
  };

  const handlePointerOver = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    setHovered(true);
    onHoverChange?.(true);
  };

  const handlePointerOut = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
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
          onPointerOver={handlePointerOver}
          onPointerOut={handlePointerOut}
        >
          <planeGeometry args={[1.5, 1.5]} />
          <meshStandardMaterial
            map={texture}
            transparent
            opacity={opacity}
            // On hover, brighten the window using a warm light tone instead of adding a new color
            emissive={highlighted ? '#f59e0b' : hovered ? '#e5ddc7' : '#000000'}
            emissiveIntensity={highlighted ? 1.2 : hovered ? 0.4 : 0}
            side={2} // DoubleSide - render both sides
          />
        </mesh>
        {/* Don't show label in spiral mode - only center label shows */}
        {!hideLabelInSpiral && (hovered || showLabelAlways || highlighted) && (name || location) && (
          <group position={[0, -1, 0]}>
            {/* Creator Name - text-[10px], font-medium, text-foreground/90 */}
            {name && (
              <Text
                position={[0, 0.15, 0]}
                fontSize={0.15}
                color="#e8e8e8" // Approximate oklch(0.98 0.01 270) at 90% opacity
                anchorX="center"
                anchorY="middle"
                outlineWidth={0.02}
                outlineColor="#000000"
                maxWidth={2}
              >
                {name}
              </Text>
            )}
            {/* Location - text-[9px], normal weight, text-muted-foreground/80 */}
            {location && (
              <Text
                position={[0, -0.05, 0]}
                fontSize={0.135}
                color="#a5a5a5" // Approximate oklch(0.65 0.02 270) at 80% opacity
                anchorX="center"
                anchorY="middle"
                outlineWidth={0.02}
                outlineColor="#000000"
                maxWidth={2}
              >
                {location}
              </Text>
            )}
          </group>
        )}
      </group>
    </Billboard>
  );
}

