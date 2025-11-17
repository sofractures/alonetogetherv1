"use client";

import { useState, useEffect } from "react";

interface WindowConstellationProps {
  onStart: () => void;
}

export function WindowConstellation({ onStart }: WindowConstellationProps) {
  const [isAnimating, setIsAnimating] = useState(true);

  const text = "ALONE TOGETHER";
  const baseSpacing = 1.1;

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
          // Generate random start position
          const randomX = (Math.random() - 0.5) * 200;
          const randomY = (Math.random() - 0.5) * 200;

          const finalTransform = `translate(${(index - text.length / 2) * baseSpacing}ch, 0)`;
          const finalOpacity = isAnimating ? 0.1 : 1;

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
                  ? `all 3500ms cubic-bezier(0.25, 0.1, 0.25, 1) ${index * 40}ms`
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

