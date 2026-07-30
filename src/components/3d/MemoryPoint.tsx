"use client";

import { useRef, useState, useMemo } from 'react';
import { useFrame, useThree, ThreeEvent } from '@react-three/fiber';
import { Color, Group, Mesh, MeshStandardMaterial } from 'three';
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

const EMISSIVE_IDLE = new Color('#000000');
const EMISSIVE_HOVER = new Color('#e5ddc7');
const EMISSIVE_HIGHLIGHT = new Color('#f59e0b');

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
  const labelRef = useRef<Group>(null);
  const targetPos = useRef(position);
  const startPos = useRef(position);
  // 0 = idle, 1 = hover/highlight — drives scale, glow, lift, labels smoothly
  const focusBlend = useRef(highlighted ? 1 : 0);
  const [hovered, setHovered] = useState(false);
  const [labelsVisible, setLabelsVisible] = useState(false);
  const { camera } = useThree();

  const texture = useTexture(
    windowVariant === 1 ? '/assets/window.jpg' : '/assets/window2.jpg'
  );

  const floatPhase = useMemo(
    () => phaseFromPosition(startPos.current),
    []
  );

  const wantFocus = hovered || highlighted;
  targetPos.current = position;

  // Scale, float, glow, lift, and soft position lerp all run in the render loop.
  useFrame((state, delta) => {
    const mesh = meshRef.current;
    const group = groupRef.current;
    const outer = outerRef.current;
    if (!mesh || !group || !outer) return;

    const dt = Math.min(delta, 0.05);
    // Ease toward focus — slower settle feels less jerky than a hard snap
    const focusTarget = wantFocus ? 1 : 0;
    const focusSpeed = wantFocus ? 7 : 5; // slightly snappier in, softer out
    focusBlend.current += (focusTarget - focusBlend.current) * (1 - Math.exp(-focusSpeed * dt));
    const t = focusBlend.current;

    // Smoothstep for a softer ease-in-out curve
    const ease = t * t * (3 - 2 * t);

    const [tx, ty, tz] = targetPos.current;
    outer.position.x += (tx - outer.position.x) * 0.12;
    outer.position.y += (ty - outer.position.y) * 0.12;
    outer.position.z += (tz - outer.position.z) * 0.12;

    const camDist = camera.position.length();
    const distanceScale = Math.min(1, Math.max(0.2, (camDist - 4) / 8));
    const sizeScale = 0.7;
    // Idle 1.0 → hover ~1.18 → highlight ~1.28 (gentler than old 1.3/1.4 snaps)
    const focusScale = highlighted ? 1 + 0.28 * ease : 1 + 0.18 * ease;
    mesh.scale.setScalar(focusScale * distanceScale * sizeScale);

    const time = state.clock.getElapsedTime();
    // Slightly quieter float while focused so lift doesn’t fight the bob
    const floatAmp = 0.08 * (1 - 0.35 * ease);
    mesh.position.y = Math.sin(time * 0.45 + floatPhase) * floatAmp;

    // Soft lift toward camera (smaller distance + smooth blend)
    const targetZ = 0.32 * ease;
    group.position.z += (targetZ - group.position.z) * (1 - Math.exp(-8 * dt));

    const mat = mesh.material as MeshStandardMaterial;
    if (mat) {
      const emissiveTarget = highlighted
        ? EMISSIVE_HIGHLIGHT
        : EMISSIVE_HOVER;
      mat.emissive.copy(EMISSIVE_IDLE).lerp(emissiveTarget, ease);
      mat.emissiveIntensity = (highlighted ? 0.85 : 0.28) * ease;
    }

    mesh.renderOrder = ease > 0.15 ? 20 : 1;

    // Fade labels in after focus has started (avoids pop-in with the first hover)
    if (labelRef.current) {
      const labelTarget = (!hideLabelInSpiral && (wantFocus || showLabelAlways) && ease > 0.35) ? 1 : 0;
      const cur = labelRef.current.scale.x;
      const next = cur + (labelTarget - cur) * (1 - Math.exp(-10 * dt));
      labelRef.current.scale.setScalar(Math.max(0.001, next));
      labelRef.current.visible = next > 0.05;
    } else if (!hideLabelInSpiral && (wantFocus || showLabelAlways) && ease > 0.25 && !labelsVisible) {
      setLabelsVisible(true);
    } else if (!wantFocus && !showLabelAlways && labelsVisible && ease < 0.08) {
      setLabelsVisible(false);
    }
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

  const showLabels =
    !hideLabelInSpiral &&
    (labelsVisible || showLabelAlways || highlighted) &&
    (name || location);

  return (
    <group ref={outerRef} position={startPos.current}>
      <Billboard follow lockX={false} lockY={false} lockZ={false}>
        <group ref={groupRef}>
          <mesh
            ref={meshRef}
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
              emissive="#000000"
              emissiveIntensity={0}
              side={2}
              toneMapped={false}
            />
          </mesh>
          {showLabels && (
            <group ref={labelRef} position={[0, -1, 0.05]} scale={0.001}>
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
