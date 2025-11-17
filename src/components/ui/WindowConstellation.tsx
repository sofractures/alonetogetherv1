"use client";

import { useState, useEffect, useMemo } from "react";

interface WindowConstellationProps {
  onStart: () => void;
}

export function WindowConstellation({ onStart }: WindowConstellationProps) {
  const [isAnimating, setIsAnimating] = useState(true);
  const text = "ALONE TOGETHER";

  // Memoize random positions so they don't change on re-render
  const randomPositions = useMemo(() => {
    return text.split("").map(() => ({
      x: (Math.random() - 0.5) * 200,
      y: (Math.random() - 0.5) * 200,
    }));
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setIsAnimating(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="relative w-full h-full flex items-center justify-center overflow-hidden bg-black">
      <div className="absolute inset-0 flex items-center justify-center">
        {text.split("").map((letter, index) => {
          // Random starting position (-100vw to +100vw, -100vh to +100vh)
          const randomX = randomPositions[index].x;
          const randomY = randomPositions[index].y;

          return (
            <span
              key={index}
              className="absolute text-6xl md:text-8xl font-bold text-white transition-all duration-[2500ms] ease-out"
              style={{
                transform: isAnimating
                  ? `translate(${randomX}vw, ${randomY}vh)`
                  : `translate(${(index - text.length / 2) * 0.9}ch, 0)`,
                opacity: isAnimating ? 0.1 : 1,
                transitionDelay: `${index * 50}ms`,
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
        className={`absolute bottom-20 px-8 py-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition-all duration-1000 shadow-lg ${
          isAnimating ? "opacity-0 translate-y-8" : "opacity-100 translate-y-0"
        }`}
        style={{ transitionDelay: "2500ms" }}
      >
        Start Exploring
      </button>
    </div>
  );
}
