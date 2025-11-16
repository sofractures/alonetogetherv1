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
  onDoubleClick?: () => void; // Separate handler for double-click
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
  onDoubleClick,
  highlighted = false,
  cameraDistance = 18, // Default camera distance
  showLabelAlways = false, // Default to only show on hover
  hideLabelInSpiral = false, // Default to show labels normally
  onHoverChange,
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
  // When zoomed out (far): larger windows (1.0x) - easier to see from far away
  // When zoomed in (close): smaller windows (0.5x) - allows spread to be visible, prevents overlap
  const minDist = 6;
  const maxDist = 30;
  const normalizedDist = Math.min(1, Math.max(0, (cameraDistance - minDist) / (maxDist - minDist)));
  // Invert: closer camera = smaller windows (so spread is visible)
  const distanceScale = 0.5 + normalizedDist * 0.5; // 0.5 → 1.0 (smaller when zoomed in)
  
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
      
      // Trigger the onDoubleClick handler if provided
      if (onDoubleClick) {
        console.log('[v0] MemoryPoint: Calling onDoubleClick handler');
        onDoubleClick();
      } else if (onClick) {
        // Fallback to onClick if no onDoubleClick handler
        console.log('[v0] MemoryPoint: Calling onClick handler (fallback)');
        onClick();
      }
    } else {
      // Single click - wait to see if there's a second click
      lastClickTimeRef.current = now;
      clickTimeoutRef.current = setTimeout(() => {
        // Single click after timeout - trigger onClick handler
        console.log('[v0] MemoryPoint: Single click detected on:', location);
        if (onClick) {
          onClick();
        }
        clickTimeoutRef.current = null;
      }, 300);
    }
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

