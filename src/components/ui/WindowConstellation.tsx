"use client";

import { useState, useEffect, useMemo, useRef } from "react";

interface WindowConstellationProps {
  onStart: () => void;
}

export function WindowConstellation({ onStart }: WindowConstellationProps) {
  const [isAnimating, setIsAnimating] = useState(true);
  const [startTransition, setStartTransition] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

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
    // Use requestAnimationFrame to ensure initial render is complete
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setStartTransition(true);
      });
    });

    // Animation duration is 3500ms, longest delay is 14 * 40ms = 560ms
    // Total animation time: 3500ms + 560ms = 4060ms
    // Add buffer: 4600ms to ensure all letters complete
    const timer = setTimeout(() => {
      setIsAnimating(false);
    }, 4600);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div ref={containerRef} className="relative w-full h-full flex items-center justify-center overflow-hidden">
      {/* Scattered Letters */}
      <div className="absolute inset-0 flex items-center justify-center">
        {text.split("").map((letter, index) => {
          // Use memoized random start position
          const randomX = randomPositions[index].x;
          const randomY = randomPositions[index].y;

          // Final position using ch units for proper letter spacing
          const finalX = (index - text.length / 2) * baseSpacing;
          const finalOpacity = isAnimating ? 0.1 : 1;

          // Only apply transition when startTransition is true and isAnimating is true
          const shouldTransition = startTransition && isAnimating;

          return (
            <span
              key={index}
              className={`absolute text-6xl md:text-8xl font-bold text-white ${
                shouldTransition
                  ? 'transition-all duration-[3500ms] ease-[cubic-bezier(0.25,0.1,0.25,1)]' 
                  : ''
              }`}
              style={{
                transform: shouldTransition
                  ? `translate(${finalX}ch, 0)`
                  : `translate(${randomX}vw, ${randomY}vh)`,
                opacity: finalOpacity,
                transitionDelay: shouldTransition ? `${index * 40}ms` : undefined,
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

