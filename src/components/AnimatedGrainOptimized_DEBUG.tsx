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
 * AnimatedGrain with React Portal - DEBUGGED VERSION
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
    console.log('🎨 AnimatedGrain mounted - should be visible now!');
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      console.warn('⚠️ Canvas ref is null');
      return;
    }

    console.log('✅ Canvas element created, starting animation...');
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) {
      console.warn('⚠️ Could not get canvas context');
      return;
    }

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      console.log(`📐 Canvas resized to ${canvas.width}x${canvas.height}`);
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    let fpsInterval = 1000 / fps;
    let then = Date.now();
    let frameCount = 0;

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
      frameCount++;
      
      // Log every 60 frames to confirm it's animating
      if (frameCount % 60 === 0) {
        console.log(`🎬 Grain animating... frame ${frameCount}`);
      }
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
      console.log('▶️ Animation started');
    }

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      console.log('⏹️ Animation stopped');
    };
  }, [fps, isAnimating]);

  const grainElement = (
    <canvas
      ref={canvasRef}
      className={`fixed top-0 left-0 w-full h-full pointer-events-none ${className}`}
      style={{
        zIndex: 999999,
        opacity: opacity / 100,
        mixBlendMode: blendMode,
        willChange: 'transform',
      }}
    />
  );

  // Only render portal on client side
  if (!mounted) {
    console.log('⏳ Waiting for client-side mount...');
    return null;
  }

  console.log(`✨ Rendering grain with opacity: ${opacity}%, fps: ${fps}, blend: ${blendMode}`);

  // Render directly to document.body using portal
  return createPortal(grainElement, document.body);
}
