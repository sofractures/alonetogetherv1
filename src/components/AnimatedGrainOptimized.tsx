'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

interface AnimatedGrainOptimizedProps {
  opacity?: number;
  fps?: number;
  blendMode?: 'overlay' | 'multiply' | 'screen' | 'soft-light' | 'hard-light' | 'normal';
  className?: string;
}

/**
 * AnimatedGrain with React Portal
 * This version ALWAYS renders at the body level, ensuring it's above all content
 * Perfect for complex z-index scenarios
 */
export default function AnimatedGrainOptimized({ 
  opacity = 8, 
  fps = 24, 
  blendMode = 'overlay',
  className = ''
}: AnimatedGrainOptimizedProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | undefined>(undefined);
  const [isAnimating] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    let fpsInterval = 1000 / fps;
    let then = Date.now();

    const drawNoise = () => {
      const imageData = ctx.createImageData(canvas.width, canvas.height);
      const buffer = imageData.data;
      
      for (let i = 0; i < buffer.length; i += 4) {
        const noise = Math.random() * 255;
        buffer[i] = noise;
        buffer[i + 1] = noise;
        buffer[i + 2] = noise;
        buffer[i + 3] = 255;
      }
      
      ctx.putImageData(imageData, 0, 0);
    };

    const animate = () => {
      if (!isAnimating) return;
      
      animationRef.current = requestAnimationFrame(animate);
      
      const now = Date.now();
      const elapsed = now - then;
      
      if (elapsed > fpsInterval) {
        then = now - (elapsed % fpsInterval);
        drawNoise();
      }
    };

    fpsInterval = 1000 / fps;

    if (isAnimating) {
      then = Date.now();
      animate();
    }

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [fps, isAnimating]);

  const grainElement = (
    <canvas
      ref={canvasRef}
      className={`fixed top-0 left-0 w-full h-full pointer-events-none ${className}`}
      style={{
        zIndex: 999999, // Super high z-index
        opacity: opacity / 100,
        mixBlendMode: blendMode,
      }}
    />
  );

  // Only render portal on client side
  if (!mounted) return null;

  // Render directly to document.body using portal
  return createPortal(grainElement, document.body);
}
