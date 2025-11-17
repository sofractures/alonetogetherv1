"use client";

import { useState, useEffect, useMemo } from "react";

interface WindowConstellationProps {
  onStart: () => void;
}

export function WindowConstellation({ onStart }: WindowConstellationProps) {
  const [isAnimating, setIsAnimating] = useState(true);

  const text = "ALONE TOGETHER";
  const baseSpacing = 1.1;

  // Memoize random positions so they don't change on re-render
  const randomPositions = useMemo(() => {
    return text.split("").map(() => ({
      x: (Math.random() - 0.5) * 200,
      y: (Math.random() - 0.5) * 200,
    }));
  }, []);

  useEffect(() => {
    // Animation duration is 3500ms, add 500ms buffer for completion
    const timer = setTimeout(() => setIsAnimating(false), 4000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
      {/* Scattered Letters */}
      <div className="absolute inset-0 flex items-center justify-center">
        {text.split("").map((letter, index) => {
          // Use memoized random start position
          const randomX = randomPositions[index].x;
          const randomY = randomPositions[index].y;

          // Final position using ch units for proper letter spacing
          const finalX = (index - text.length / 2) * baseSpacing;
          const finalOpacity = isAnimating ? 0.1 : 1;

          return (
            <span
              key={index}
              className="absolute text-6xl md:text-8xl font-bold text-white"
              style={{
                transform: isAnimating
                  ? `translate(${randomX}vw, ${randomY}vh)`
                  : `translate(${finalX}ch, 0)`,
                opacity: finalOpacity,
                transition: isAnimating 
                  ? `transform 3500ms cubic-bezier(0.25, 0.1, 0.25, 1) ${index * 40}ms, opacity 3500ms cubic-bezier(0.25, 0.1, 0.25, 1) ${index * 40}ms`
                  : 'none',
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
        style={{ transitionDelay: "3500ms" }}
      >
        Start Exploring
      </button>
    </div>
  );
}

