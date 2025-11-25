"use client";

import { useState, useEffect, useMemo } from "react";
import { MemorySkyline } from "./MemorySkyline";
import { memoriesText } from "@/data/memories";

interface WindowConstellationProps {
  onStart: () => void;
  onTransitionComplete?: () => void;
}

export function WindowConstellation({ onStart, onTransitionComplete }: WindowConstellationProps) {
  const [isAnimating, setIsAnimating] = useState(true);
  const [isReversing, setIsReversing] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const text = "ALONE TOGETHER";

  // Memoize random positions so they don't change on re-render
  const randomPositions = useMemo(() => {
    return text.split("").map(() => ({
      x: (Math.random() - 0.5) * 200,
      y: (Math.random() - 0.5) * 200,
    }));
  }, []);

  useEffect(() => {
    // Start title animation immediately (no delay) so it runs simultaneously with skyline
    // Use requestAnimationFrame to ensure initial render happens first
    requestAnimationFrame(() => {
      setIsAnimating(false);
    });
  }, []);

  const handleStartClick = () => {
    // Immediately hide button and trigger reverse animation
    setIsReversing(true);
    setIsAnimating(true); // Letters scatter back out
    
    // After reverse animation completes, hide component and notify parent
    setTimeout(() => {
      setIsVisible(false);
      onTransitionComplete?.();
    }, 2500); // Match the animation duration
    
    // Call onStart immediately to start globe fade-in
    onStart();
  };

  if (!isVisible) return null;

  return (
    <div className="relative w-full h-full flex items-center justify-center overflow-hidden bg-black">
      <div className="absolute inset-0 flex items-center justify-center">
        {text.split("").map((letter, index) => {
          // Random starting position (-100vw to +100vw, -100vh to +100vh)
          const randomX = randomPositions[index].x;
          const randomY = randomPositions[index].y;
          
          // Determine current state: initial scatter -> together -> reverse scatter
          const isScattered = isReversing ? true : isAnimating;
          const centeredPosition = `translate(${(index - (text.length - 1) / 2) * 1}ch, 0)`;
          const scatteredPosition = `translate(${randomX}vw, ${randomY}vh)`;

          return (
            <span
              key={index}
              className="absolute text-6xl md:text-8xl font-bold transition-all duration-[2500ms] ease-out"
              style={{ color: '#e5ddc7' }}
              style={{
                transform: isScattered ? scatteredPosition : centeredPosition,
                opacity: isScattered ? 0.1 : 1,
                transitionDelay: isReversing 
                  ? `${(text.length - index) * 50}ms` // Reverse order for scatter
                  : `${index * 50}ms`,
              }}
            >
              {letter === " " ? "\u00A0" : letter}
            </span>
          );
        })}
      </div>

      {/* Start Button - appears after animation, disappears immediately when clicked */}
      {!isReversing && (
        <button
          onClick={handleStartClick}
          className={`absolute bottom-40 px-8 py-3 bg-white text-black font-mono font-semibold transition-all duration-300 z-10 hover:bg-gray-100 ${
            isAnimating ? "opacity-0 translate-y-8" : "opacity-100 translate-y-0"
          }`}
          style={{ transitionDelay: "3000ms" }}
        >
          Start
        </button>
      )}

      {/* Memory Skyline - appears at bottom */}
      <div className={`absolute bottom-0 left-0 right-0 z-0 h-64 flex items-end overflow-hidden transition-opacity duration-[2500ms] ${
        isReversing ? "opacity-0" : "opacity-100"
      }`}>
        <MemorySkyline
          memories={memoriesText}
          className="w-full"
          isAnimating={true}
        />
      </div>
    </div>
  );
}
