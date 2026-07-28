"use client";

import { useRef, useState, useMemo } from 'react';
import { useFrame, useThree, ThreeEvent } from '@react-three/fiber';
import { Group, Mesh } from 'three';
import { Billboard, Text, useTexture } from '@react-three/drei';

interface MemoryPointProps {
  position: [number, number, number];
  windowVariant: 1 | 2;
  location?: string;
  name?: string;
  onClick?: () => void;
  highlighted?: boolean;
  showLabelAlways?: boolean;
  hideLabelInSpiral?: boolean;
  onHoverChange?: (isHovered: boolean) => void;
}

/** Stable hash → float phase so windows don't bob in sync. */
function phaseFromPosition(position: [number, number, number]): number {
  const n = Math.abs(position[0] * 12.9898 + position[1] * 78.233 + position[2] * 37.719) * 43758.5453;
  return (n - Math.floor(n)) * Math.PI * 2;
}

export default function MemoryPoint({
  position,
  windowVariant,
  location,
  name,
  onClick,
  highlighted = false,
  showLabelAlways = false,
  hideLabelInSpiral = false,
  onHoverChange,
}: MemoryPointProps) {
  const meshRef = useRef<Mesh>(null);
  const groupRef = useRef<Group>(null);
  const outerRef = useRef<Group>(null);
  const targetPos = useRef(position);
  const startPos = useRef(position);
  const [hovered, setHovered] = useState(false);
  const { camera } = useThree();

  const texture = useTexture(
    windowVariant === 1 ? '/assets/window.jpg' : '/assets/window2.jpg'
  );

  const floatPhase = useMemo(
    () => phaseFromPosition(startPos.current),
    []
  );
  const isFront = hovered || highlighted;

  targetPos.current = position;

  // Scale, float, hover lift, and soft position lerp all run in the render
  // loop so parent React state does not remount materials every tick.
  useFrame((state) => {
    const mesh = meshRef.current;
    const group = groupRef.current;
    const outer = outerRef.current;
    if (!mesh || !group || !outer) return;

    const [tx, ty, tz] = targetPos.current;
    outer.position.x += (tx - outer.position.x) * 0.12;
    outer.position.y += (ty - outer.position.y) * 0.12;
    outer.position.z += (tz - outer.position.z) * 0.12;

    const camDist = camera.position.length();
    const distanceScale = Math.min(1, Math.max(0.2, (camDist - 4) / 8));
    const sizeScale = 0.7;
    const baseScale = highlighted ? 1.4 : hovered ? 1.3 : 1;
    mesh.scale.setScalar(baseScale * distanceScale * sizeScale);

    const time = state.clock.getElapsedTime();
    mesh.position.y = Math.sin(time * 0.45 + floatPhase) * 0.08;

    // Lift toward camera without disabling depthTest (that caused z-flicker)
    const targetZ = isFront ? 0.45 : 0;
    group.position.z += (targetZ - group.position.z) * 0.18;
  });

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    onClick?.();
  };

  const handlePointerOver = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    document.body.style.cursor = 'pointer';
    setHovered(true);
    onHoverChange?.(true);
  };

  const handlePointerOut = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    document.body.style.cursor = 'auto';
    setHovered(false);
    onHoverChange?.(false);
  };

  return (
    <group ref={outerRef} position={startPos.current}>
      <Billboard follow lockX={false} lockY={false} lockZ={false}>
        <group ref={groupRef}>
          <mesh
            ref={meshRef}
            renderOrder={isFront ? 20 : 1}
            onClick={handleClick}
            onPointerOver={handlePointerOver}
            onPointerOut={handlePointerOut}
          >
            <planeGeometry args={[1.5, 1.5]} />
            <meshStandardMaterial
              map={texture}
              transparent
              opacity={1}
              depthTest
              depthWrite={false}
              polygonOffset
              polygonOffsetFactor={-2}
              polygonOffsetUnits={-2}
              emissive={highlighted ? '#f59e0b' : hovered ? '#e5ddc7' : '#000000'}
              emissiveIntensity={highlighted ? 1.0 : hovered ? 0.35 : 0}
              side={2}
              toneMapped={false}
            />
          </mesh>
          {!hideLabelInSpiral && (hovered || showLabelAlways || highlighted) && (name || location) && (
            <group position={[0, -1, 0.05]}>
              {name && (
                <Text
                  position={[0, 0.15, 0]}
                  fontSize={0.14}
                  letterSpacing={0.02}
                  color="#e5ddc7"
                  anchorX="center"
                  anchorY="middle"
                  outlineWidth={0.02}
                  outlineColor="#000000"
                  maxWidth={2}
                  renderOrder={30}
                  depthOffset={-2}
                >
                  {name}
                </Text>
              )}
              {location && (
                <Text
                  position={[0, -0.05, 0]}
                  fontSize={0.12}
                  letterSpacing={0.02}
                  color="#a5a5a5"
                  anchorX="center"
                  anchorY="middle"
                  outlineWidth={0.02}
                  outlineColor="#000000"
                  maxWidth={2}
                  renderOrder={30}
                  depthOffset={-2}
                >
                  {location}
                </Text>
              )}
            </group>
          )}
        </group>
      </Billboard>
    </group>
  );
}
