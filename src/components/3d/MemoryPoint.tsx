"use client";

import { useRef, useState } from 'react';
import { useFrame, ThreeEvent } from '@react-three/fiber';
import { Group, Mesh } from 'three';
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
  const groupRef = useRef<Group>(null);
  const [hovered, setHovered] = useState(false);
  
  // Load the appropriate window texture
  const texture = useTexture(
    windowVariant === 1 ? '/assets/window.jpg' : '/assets/window2.jpg'
  );

  const isFront = hovered || highlighted;

  // Floating animation (sine wave on Y-axis)
  // Note: Billboard handles positioning, so we animate within the Billboard's local space
  useFrame((state) => {
    if (meshRef.current) {
      const time = state.clock.getElapsedTime();
      // Animate in local space (relative to Billboard position)
      meshRef.current.position.y = Math.sin(time * 0.5) * 0.1;
    }
    // Bring hovered/highlighted window toward the camera so its name and
    // location stay readable even when windows overlap. The Billboard's
    // local +Z always faces the camera, so easing local Z lifts it forward.
    if (groupRef.current) {
      const targetZ = isFront ? 0.6 : 0;
      groupRef.current.position.z += (targetZ - groupRef.current.position.z) * 0.15;
    }
  });

  // Keep windows a roughly CONSTANT SCREEN SIZE while zooming.
  // Windows sit on a radius-4 sphere, so their distance to the camera is
  // ~(cameraDistance - 4). Scaling world size proportionally to that distance
  // cancels the perspective growth — zooming in then separates windows on
  // screen instead of just magnifying them. Normalised to 1.0 at the default
  // camera distance of 12.
  const distanceScale = Math.min(1, Math.max(0.2, (cameraDistance - 4) / 8));

  // Global window size: ~30% smaller than the original 1.5-unit plane
  // so the default explore view has more breathing room before zoom fan-out
  const sizeScale = 0.7;

  const baseScale = highlighted ? 1.4 : hovered ? 1.3 : 1;
  const scale = baseScale * distanceScale * sizeScale;
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
      <group ref={groupRef}>
        <mesh
          ref={meshRef}
          scale={scale}
          renderOrder={isFront ? 999 : 0}
          onClick={handleClick}
          onPointerOver={handlePointerOver}
          onPointerOut={handlePointerOut}
        >
          <planeGeometry args={[1.5, 1.5]} />
          <meshStandardMaterial
            map={texture}
            transparent
            opacity={opacity}
            // Draw the hovered window on top of overlapping neighbours
            depthTest={!isFront}
            // On hover, brighten the window using a warm light tone instead of adding a new color
            emissive={highlighted ? '#f59e0b' : hovered ? '#e5ddc7' : '#000000'}
            emissiveIntensity={highlighted ? 1.2 : hovered ? 0.4 : 0}
            side={2} // DoubleSide - render both sides
          />
        </mesh>
        {/* Don't show label in spiral mode - only center label shows */}
        {!hideLabelInSpiral && (hovered || showLabelAlways || highlighted) && (name || location) && (
          <group position={[0, -1, 0]}>
            {/* Creator Name - Geist Sans-like, small all-caps label */}
            {name && (
              <Text
                position={[0, 0.15, 0]}
                fontSize={0.14}
                letterSpacing={0.02}
                color="#e5ddc7" // Match cream UI text color
                anchorX="center"
                anchorY="middle"
                outlineWidth={0.02}
                outlineColor="#000000"
                maxWidth={2}
                renderOrder={1000}
                material-depthTest={false}
              >
                {name}
              </Text>
            )}
            {/* Location - smaller, muted label */}
            {location && (
              <Text
                position={[0, -0.05, 0]}
                fontSize={0.12}
                letterSpacing={0.02}
                color="#a5a5a5" // Approximate oklch(0.65 0.02 270) at 80% opacity
                anchorX="center"
                anchorY="middle"
                outlineWidth={0.02}
                outlineColor="#000000"
                maxWidth={2}
                renderOrder={1000}
                material-depthTest={false}
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

