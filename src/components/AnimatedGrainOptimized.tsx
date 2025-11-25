'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface AnimatedGrainOptimizedProps {
  opacity?: number;
  fps?: number; // Not used with GIF, but kept for API compatibility
  blendMode?: 'overlay' | 'multiply' | 'screen' | 'soft-light' | 'hard-light' | 'normal';
  className?: string;
}

/**
 * AnimatedGrain with React Portal using GIF
 * This version uses a GIF file for the grain effect and ALWAYS renders at the body level
 * Perfect for complex z-index scenarios
 */
export default function AnimatedGrainOptimized({ 
  opacity = 8, 
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  fps = 24, // Not used with GIF, but kept for API compatibility
  blendMode = 'overlay',
  className = ''
}: AnimatedGrainOptimizedProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const grainElement = (
    <div
      className={`fixed top-0 left-0 w-full h-full pointer-events-none ${className}`}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 999999, // Super high z-index
        opacity: opacity / 100,
        mixBlendMode: blendMode,
        pointerEvents: 'none',
        backgroundImage: 'url(/assets/noise.gif)',
        backgroundRepeat: 'repeat',
        backgroundSize: 'auto',
        backgroundPosition: '0 0',
      }}
    />
  );

  // Only render portal on client side
  if (!mounted) {
    return null;
  }

  // Ensure document.body exists before creating portal
  if (typeof document === 'undefined' || !document.body) {
    return null;
  }

  // Render directly to document.body using portal
  return createPortal(grainElement, document.body);
}
