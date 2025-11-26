"use client";

import { useEffect, useState } from 'react';

interface OrientationState {
  angle: number;
  type: 'portrait' | 'landscape';
  isPortrait: boolean;
  isLandscape: boolean;
}

/**
 * Hook to detect device orientation changes
 * Useful for adapting UI layout based on device orientation
 */
export function useOrientation(): OrientationState {
  const [orientation, setOrientation] = useState<OrientationState>(() => {
    if (typeof window === 'undefined') {
      return { angle: 0, type: 'portrait', isPortrait: true, isLandscape: false };
    }
    
    const angle = window.orientation || 0;
    const isPortrait = Math.abs(angle) === 0 || Math.abs(angle) === 180;
    
    return {
      angle,
      type: isPortrait ? 'portrait' : 'landscape',
      isPortrait,
      isLandscape: !isPortrait,
    };
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleOrientationChange = () => {
      const angle = window.orientation || 0;
      const isPortrait = Math.abs(angle) === 0 || Math.abs(angle) === 180;
      
      setOrientation({
        angle,
        type: isPortrait ? 'portrait' : 'landscape',
        isPortrait,
        isLandscape: !isPortrait,
      });
    };

    // Listen to orientation change events
    window.addEventListener('orientationchange', handleOrientationChange);
    
    // Also listen to resize for better compatibility
    window.addEventListener('resize', handleOrientationChange);

    return () => {
      window.removeEventListener('orientationchange', handleOrientationChange);
      window.removeEventListener('resize', handleOrientationChange);
    };
  }, []);

  return orientation;
}

