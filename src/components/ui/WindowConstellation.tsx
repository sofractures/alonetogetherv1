"use client";

import { useState, useEffect, useRef } from "react";

interface WindowConstellationProps {
  onStart: () => void;
}

export function WindowConstellation({ onStart }: WindowConstellationProps) {
  const [isAnimating, setIsAnimating] = useState(true);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const text = "ALONE TOGETHER";
  const baseSpacing = 1.1;
  const hoverSpacing = 0.65;

  useEffect(() => {
    const timer = setTimeout(() => setIsAnimating(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current || isAnimating) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setMousePos({ x, y });
  };

  const handleMouseLeave = () => {
    setMousePos(null);
  };

  // Calculate which 3 letters are nearest to mouse
  const getNearestIndices = (mouseX: number, mouseY: number): number[] => {
    if (!containerRef.current) return [];
    
    const rect = containerRef.current.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    // Calculate positions of each letter in final state
    const letterPositions = text.split("").map((_, index) => {
      const offsetX = (index - text.length / 2) * baseSpacing;
      // Convert ch to pixels (approximate: 1ch ≈ 0.6em for monospace, but for this font it's roughly 0.5em)
      const fontSize = window.innerWidth >= 768 ? 64 : 48; // text-8xl = 64px, text-6xl = 48px
      const chToPx = fontSize * 0.5; // Approximate conversion
      const x = centerX + offsetX * chToPx;
      const y = centerY;
      return { x, y, index };
    });
    
    // Calculate distances and sort
    const distances = letterPositions.map((pos) => ({
      index: pos.index,
      distance: Math.sqrt(Math.pow(pos.x - mouseX, 2) + Math.pow(pos.y - mouseY, 2)),
    }));
    
    distances.sort((a, b) => a.distance - b.distance);
    return distances.slice(0, 3).map((d) => d.index);
  };

  return (
    <div 
      ref={containerRef}
      className="relative w-full h-full flex items-center justify-center overflow-hidden"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {/* Scattered Letters */}
      <div className="absolute inset-0 flex items-center justify-center">
        {text.split("").map((letter, index) => {
          // Generate random start position
          const randomX = (Math.random() - 0.5) * 200;
          const randomY = (Math.random() - 0.5) * 200;

          // Calculate hover effect
          let finalTransform = `translate(${(index - text.length / 2) * baseSpacing}ch, 0)`;
          const finalOpacity = isAnimating ? 0.1 : 1;
          
          if (!isAnimating && mousePos) {
            const nearestIndices = getNearestIndices(mousePos.x, mousePos.y);
            const isNearest = nearestIndices.includes(index);
            
            if (isNearest) {
              // Find position in the cluster (0, 1, or 2)
              const clusterIndex = nearestIndices.indexOf(index);
              const clusterOffset = (clusterIndex - 1) * hoverSpacing; // -0.65, 0, 0.65
              
              // Get the center position of the cluster (middle letter's position)
              const centerIndex = nearestIndices[1] || nearestIndices[0];
              const centerOffset = (centerIndex - text.length / 2) * baseSpacing;
              
              // Move towards mouse with tighter spacing
              finalTransform = `translate(${centerOffset + clusterOffset}ch, 0)`;
            }
          } else if (!isAnimating) {
            // Normal state: use base spacing
            finalTransform = `translate(${(index - text.length / 2) * baseSpacing}ch, 0)`;
          }

          return (
            <span
              key={index}
              className="absolute text-6xl md:text-8xl font-bold text-white"
              style={{
                transform: isAnimating
                  ? `translate(${randomX}vw, ${randomY}vh)`
                  : finalTransform,
                opacity: finalOpacity,
                transition: isAnimating 
                  ? `all 2500ms ease-out ${index * 50}ms`
                  : 'all 600ms ease-out',
              }}
            >
              {letter === " " ? "\u00A0" : letter}
            </span>
          );
        })}
      </div>

      {/* Start Button - appears after animation */}
      <button
        onClick={onStart}
        className={`absolute bottom-32 px-8 py-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition-all duration-1000 shadow-lg ${
          isAnimating ? "opacity-0 translate-y-8" : "opacity-100 translate-y-0"
        }`}
        style={{ transitionDelay: "2500ms" }}
      >
        Start Exploring
      </button>
    </div>
  );
}

